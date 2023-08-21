import { ExecException, spawn } from 'child_process';
import {
  BroadcastArtifacts_Partial,
  ContractMetadata,
  EthAddress,
  FoundryConfig,
  Network,
  ScriptMetadata,
  SolidityFilesCache_Partial,
} from 'index';
import { readFileSync } from 'node:fs';
import * as toml from 'toml';
import { exit, getFlagValueFromArgv, loadSolidityABIs, logDebug, logError, logWarn } from '.';
import { getGitMetadata } from './git';

export const processForgeError = ({ message }: ExecException) => {
  if (message.includes('connect error'))
    return 'Could not connect to the RPC, check your internet connection';
  return message;
};

const convertFullyQualifiedPathToRelativePath = (forgeScriptPath: string) => {
  const path = forgeScriptPath.split(':')[0];
  if (!path) throw new Error('Tried converting non-fully qualified path to relative path');

  return path;
};

// @dev checks for the use of "fully qualified" src/script/MyScript.s.sol:CONTRACT_NAME syntax and formats input
export const normalizeForgeScriptPath = (forgeScriptPath: string) => {
  const isUsingFullyQualifiedPath = forgeScriptPath.includes(':');

  return isUsingFullyQualifiedPath
    ? convertFullyQualifiedPathToRelativePath(forgeScriptPath)
    : forgeScriptPath;
};

export const loadFoundryConfig = () => {
  let foundryToml_raw: string;
  try {
    foundryToml_raw = readFileSync('foundry.toml', { encoding: 'utf-8' });
  } catch (e: any) {
    logDebug(e);
    exit('Could not find foundry.toml, ensure you in the root directory of a Foundry project');
  }

  let foundryConfig: FoundryConfig;

  try {
    foundryConfig = toml.parse(foundryToml_raw);
  } catch (e: any) {
    logDebug(e);
    exit(
      'Could not parse foundry.toml, ensure it is valid TOML',
      'see https://github.com/foundry-rs/foundry/tree/master/config for more information.',
    );
  }

  return foundryConfig;
};

export const getFoundryConfigValue = <T extends keyof FoundryConfig['profile'][string]>(
  foundryConfig: FoundryConfig,
  setting: T,
): FoundryConfig['profile'][string][T] | undefined => {
  const profileENV: string | undefined = process.env.FOUNDRY_PROFILE;
  const profileName = profileENV || 'default';
  const settingValue =
    foundryConfig.profile[profileName]?.[setting] ??
    foundryConfig.profile['default'][setting] ??
    undefined;

  return settingValue;
};

// @dev given the foundry config and the env vars, returns the path to the broadcast/ dir
export const getBroadcastPath = (foundryConfig: FoundryConfig): string =>
  getFoundryConfigValue(foundryConfig, 'broadcast') ?? 'broadcast';

// @dev given the foundry config and the env vars, returns the path to the out/ dir
export const getOutPath = (foundryConfig: FoundryConfig): string =>
  getFoundryConfigValue(foundryConfig, 'out') ?? 'out';

export const isSparseModeEnabled = (foundryConfig: FoundryConfig): boolean =>
  getFoundryConfigValue(foundryConfig, 'sparse_mode') ?? false;

// @dev loads the run-latest.json from the latest broadcast at METRO_DEPLOY_URL
export const getBroadcastArtifacts = async (
  foundryConfig: FoundryConfig,
  chainId: Network,
  forgeScriptPath: string,
): Promise<BroadcastArtifacts_Partial> => {
  const scriptName = forgeScriptPath.split('/').at(-1);
  const broadcastPath = getBroadcastPath(foundryConfig);

  let runLatest_raw: string;
  try {
    runLatest_raw = readFileSync(`${broadcastPath}/${scriptName}/${chainId}/run-latest.json`, {
      encoding: 'utf-8',
    });
  } catch (e: any) {
    logDebug(e);
    exit('Could not load run-latest.json');
  }

  let broadcastArtifacts: BroadcastArtifacts_Partial;
  try {
    broadcastArtifacts = JSON.parse(runLatest_raw);
  } catch (e: any) {
    logDebug(e);
    exit('run-latest.json is corrupt / invalid JSON');
  }

  if (broadcastArtifacts.transactions.length === 0)
    exit(`Cannot preview ${scriptName} as it generated 0 transactions`);

  return broadcastArtifacts;
};

// @dev given the foundry config and the current env vars, returns the path to the cache/ dir
export const getCachePath = ({ profile }: FoundryConfig): string => {
  const profileENV: string | undefined = process.env.FOUNDRY_PROFILE;
  const profileName = profileENV || 'default';
  const isCacheDisabled =
    profile[profileName]?.cache === false || profile['default']?.cache === false;

  if (isCacheDisabled) exit('Caching is disabled, please set `cache = true` in your foundry.toml');

  const cachePath = profile[profileName]?.cache_path ?? profile['default'].cache_path ?? 'cache';
  return cachePath;
};

export const loadSolidityFilesCache = (
  foundryConfig: FoundryConfig,
): SolidityFilesCache_Partial => {
  const cachePath = getCachePath(foundryConfig);
  let filesCache_raw: string;
  try {
    filesCache_raw = readFileSync(`${cachePath}/solidity-files-cache.json`, {
      encoding: 'utf-8',
    });
  } catch (e: any) {
    logDebug(e);
    exit('Could not find solidity-files-cache.json', e.message);
  }

  let filesCache: SolidityFilesCache_Partial;
  try {
    filesCache = JSON.parse(filesCache_raw);
  } catch (e: any) {
    logDebug(e);
    exit('Could not parse solidity-files-cache.json, ensure it is valid JSON');
  }

  return filesCache;
};

// @dev loads the solidity-files-cache.json and finds the relative paths to the dependencies
export const getScriptDependencies = (foundryConfig: FoundryConfig, forgeScriptPath: string) => {
  const filesCache = loadSolidityFilesCache(foundryConfig);
  if (filesCache.files[forgeScriptPath] === undefined) {
    exit(
      `Could not find ${forgeScriptPath} in solidity-files-cache.json, ensure it is a valid forge script`,
    );
  }
  if (filesCache._format !== 'ethers-rs-sol-cache-3')
    logWarn('Unexpected solidity-files-cache format, failure may occur');

  return filesCache.files[forgeScriptPath].imports;
};

// @dev returns the terminal status code of the forge script
// @throws if the forge script fails
export const runForgeScript = async (scriptArgs: string[]) => {
  return await new Promise<number>((resolve, reject) => {
    const clonedEnv = { ...process.env };

    const forge_script = spawn(`forge script ${scriptArgs.join(' ')}`, {
      shell: true,
      stdio: 'inherit',
      env: clonedEnv,
    });

    // log any errors
    forge_script.on('error', err => {
      logError('\n' + processForgeError(err) + '\n');
      reject();
    });

    // on completion, resolve or reject the promise
    forge_script.on('close', (code, signal) => {
      if (code === 0) resolve(code);
      else {
        logError('\n' + 'Forge script failed' + '\n');
        reject(signal);
      }
    });
  });
};

export const getContractMetadata = (
  foundryConfig: FoundryConfig,
  broadcastArtifacts: BroadcastArtifacts_Partial,
  solidityFilePaths: string[],
): ContractMetadata[] => {
  const abis = loadSolidityABIs(foundryConfig, solidityFilePaths);
  const deployedAddressesByName = broadcastArtifacts.transactions.reduce<
    Record<string, EthAddress>
  >(
    (acc, { contractName, contractAddress, transactionType }) =>
      contractName && (transactionType === 'CREATE' || transactionType === 'CREATE2')
        ? { ...acc, [contractName]: contractAddress }
        : acc,
    {},
  );

  const contractMetadata = Object.entries(abis).reduce<ContractMetadata[]>(
    (acc, [fullyQualifiedName, abi]) => {
      const [filePath, name] = fullyQualifiedName.split(':');
      const gitMetadata = getGitMetadata(filePath);
      // optionally include the deployed address if the contract is being created
      const deployedAddress: EthAddress | undefined = deployedAddressesByName[name];
      const metadata: ContractMetadata = {
        name,
        filePath,
        fullyQualifiedName,
        abi,
        deployedAddress,
        ...gitMetadata,
      };

      return [...acc, metadata];
    },
    [],
  );

  return contractMetadata;
};

const resolveTargetContract = (forgeScriptPath: string): string => {
  // forgeScriptPath might be a fully qualified path (src/Deploy.s.sol:DeployerContract)
  const [scriptPath, maybeContractName] = forgeScriptPath.split(':');

  if (maybeContractName) return maybeContractName;

  if (process.argv.includes('--tc') || process.argv.includes('--target-contract'))
    return getFlagValueFromArgv('--tc') || getFlagValueFromArgv('--target-contract');

  // Use the file name as the script name, as that's probably correct
  return scriptPath.split('/').at(-1).split('.')[0];
};

export const getScriptMetadata = async (
  foundryConfig: FoundryConfig,
  chainId: number,
  forgeScriptPath: string,
): Promise<ScriptMetadata> => {
  const [scriptPath] = forgeScriptPath.split(':');
  const targetContract = resolveTargetContract(forgeScriptPath);
  const functionName = getFlagValueFromArgv('-s') || getFlagValueFromArgv('--sig') || 'run()';
  const scriptGitMetadata = getGitMetadata(scriptPath);

  const broadcastArtifacts = await getBroadcastArtifacts(foundryConfig, chainId, scriptPath);

  return {
    scriptName: targetContract,
    functionName,
    filePath: scriptPath,
    broadcastArtifacts,
    ...scriptGitMetadata,
  };
};
