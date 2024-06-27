import { ExecException, spawn } from 'child_process';
import {
  BroadcastArtifacts_Partial,
  ContractMetadata,
  EthAddress,
  FoundryConfig,
  Network,
  ScriptMetadata,
  SolidityFilesCache_Partial,
} from '../types';
import { readFileSync } from 'node:fs';
import * as toml from 'toml';
import {
  exit,
  getFlagValueFromArgv,
  loadMetaDataAttributes,
  logDebug,
  logError,
  logInfo,
  logWarn,
} from '.';
import { getGitMetadata } from './git';
import { Readable } from 'stream';

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

export const loadFoundryConfig = async () => {
  let foundryToml_raw: string;
  try {
    foundryToml_raw = readFileSync('foundry.toml', { encoding: 'utf-8' });
  } catch (e: any) {
    logDebug(e);
    await exit(
      'Could not find foundry.toml, ensure you in the root directory of a Foundry project',
    );
  }

  let foundryConfig: FoundryConfig;

  try {
    foundryConfig = toml.parse(foundryToml_raw);
  } catch (e: any) {
    logDebug(e);
    await exit(
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

export const loadBroadcastArtifacts = async (
  pathToArtifact: string,
): Promise<BroadcastArtifacts_Partial> => {
  let runLatest_raw: string;
  try {
    runLatest_raw = readFileSync(pathToArtifact, {
      encoding: 'utf-8',
    });
  } catch (e: any) {
    logDebug(e);
    await exit(`Could not load ${pathToArtifact}`);
  }

  let broadcastArtifacts: BroadcastArtifacts_Partial;
  try {
    broadcastArtifacts = JSON.parse(runLatest_raw);
  } catch (e: any) {
    logDebug(e);
    await exit(`${pathToArtifact} is corrupt / invalid JSON`);
  }

  return broadcastArtifacts;
};

export const getRunLatestJSON = async (
  foundryConfig: FoundryConfig,
  chainId: Network,
  forgeScriptPath: string,
): Promise<BroadcastArtifacts_Partial> => {
  const scriptName = forgeScriptPath.split('/').at(-1);
  const broadcastPath = getBroadcastPath(foundryConfig);
  const broadcastArtifacts = await loadBroadcastArtifacts(
    `${broadcastPath}/${scriptName}/${chainId}/run-latest.json`,
  );

  if (broadcastArtifacts.transactions.length === 0)
    await exit(`Cannot preview ${scriptName} as it generated 0 transactions`);

  return broadcastArtifacts;
};

// @dev given the foundry config and the current env vars, returns the path to the cache/ dir
export const getCachePath = async ({ profile }: FoundryConfig): Promise<string> => {
  const profileENV: string | undefined = process.env.FOUNDRY_PROFILE;
  const profileName = profileENV || 'default';
  const isCacheDisabled =
    profile[profileName]?.cache === false || profile['default']?.cache === false;

  if (isCacheDisabled)
    await exit('Caching is disabled, please set `cache = true` in your foundry.toml');

  const cachePath = profile[profileName]?.cache_path ?? profile['default'].cache_path ?? 'cache';
  return cachePath;
};

export const loadSolidityFilesCache = async (
  foundryConfig: FoundryConfig,
): Promise<SolidityFilesCache_Partial> => {
  const cachePath = await getCachePath(foundryConfig);
  let filesCache_raw: string;
  try {
    filesCache_raw = readFileSync(`${cachePath}/solidity-files-cache.json`, {
      encoding: 'utf-8',
    });
  } catch (e: any) {
    logDebug(e);
    await exit('Could not find solidity-files-cache.json', e.message);
  }

  let filesCache: SolidityFilesCache_Partial;
  try {
    filesCache = JSON.parse(filesCache_raw);
  } catch (e: any) {
    logDebug(e);
    await exit('Could not parse solidity-files-cache.json, ensure it is valid JSON');
  }

  return filesCache;
};

// @dev loads the solidity-files-cache.json and finds the relative paths to the dependencies
export const getScriptDependencies = async (
  foundryConfig: FoundryConfig,
  forgeScriptPath: string,
) => {
  const filesCache = await loadSolidityFilesCache(foundryConfig);
  if (filesCache.files[forgeScriptPath] === undefined) {
    await exit(
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

const mutateForgeMessages = (msg: string | number | bigint | boolean | object): string => {
  const msgAsString = msg.toString();
  // search the output for messages that should be filtered

  if (msgAsString.includes('Sending transactions')) return '';
  if (msgAsString.includes('Total Paid')) return '';
  if (msgAsString.includes('txes (') && msgAsString.includes('[00:0')) return '';
  else if (msgAsString.includes('ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.'))
    return msgAsString.replace('ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.\n', '');

  return msgAsString;
};

const watchForgeOutput = (
  { stdout, stderr }: { stdout: Readable; stderr: Readable },
  state: { transactionCounter: number; disableLogging: boolean },
) => {
  // tx progress bars are sent through stderr
  stderr.on('data', (chunk: any) => {
    const msg = mutateForgeMessages(chunk);
    if (msg) logError(msg);
  });

  const magicEmojis = ['🧙', '🪄', '🧚', '✨'];

  stdout.on('data', (chunk: any) => {
    if (state.disableLogging) {
      if (!chunk.toString().includes('contracts were verified!')) return;
      // resume logging
      else state.disableLogging = false;
    }

    // if a verification run is starting, disable logging
    if (chunk.toString().includes('Start verification for')) {
      logInfo('Submitting contract verification to metal ⛓️...');
      state.disableLogging = true;
      return;
    }

    // if the chunk contains the success label, then it's related to a transaction
    if (chunk.toString().includes('[Success]Hash')) {
      // increment the transaction counter
      state.transactionCounter++;
      // hide the original message and show a simulation message
      logInfo(
        `${magicEmojis[Math.floor(Math.random() * magicEmojis.length)]} Simulating transaction ` +
          state.transactionCounter +
          '...',
      );
      return;
    }

    // otherwise, use the normal filter flow
    const msg = mutateForgeMessages(chunk);
    if (msg) logInfo(msg);
  });
};

export const runForgeScriptForPreviewCommand = async (scriptArgs: string[]) => {
  const state = {
    disableLogging: false,
    transactionCounter: 0,
  };

  await new Promise<number>((resolve, reject) => {
    const clonedEnv = { ...process.env };

    const forge_script = spawn(`forge script ${scriptArgs.join(' ')}`, {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: clonedEnv,
    });

    // watch and override tx execution messages in the context of simulations
    watchForgeOutput(forge_script, state);

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

  // if (state.transactionCounter === 0)
  //   await exit(
  //     'Your forge script does not contain any transactions to simulate!',
  //     'Please add a transaction to your forge script and try again.',
  //   );
};

export const runForgeBuild = async (buildOpts: string[]) => {
  return await new Promise<number>((resolve, reject) => {
    const clonedEnv = { ...process.env };

    const forge_script = spawn(`forge build ${buildOpts.join(' ')}`, {
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

export const getContractMetadata = async (
  foundryConfig: FoundryConfig,
  broadcastArtifacts: BroadcastArtifacts_Partial,
  solidityFilePaths: string[],
): Promise<ContractMetadata[]> => {
  const abis = await loadMetaDataAttributes(foundryConfig, solidityFilePaths, [
    'abi',
    'bytecode',
    'deployedBytecode',
  ]);

  const deployedAddressesByName = broadcastArtifacts.transactions.reduce<
    Record<string, EthAddress>
  >(
    (acc, { contractName, contractAddress }) =>
      contractName ? { ...acc, [contractName]: contractAddress } : acc,
    {},
  );

  const contractMetadata = Object.entries(abis).reduce<ContractMetadata[]>(
    (acc, [fullyQualifiedName, { abi, bytecode, deployedBytecode }]) => {
      const [filePath, name] = fullyQualifiedName.split(':');
      const gitMetadata = getGitMetadata(filePath);
      // optionally include the deployed address if the contract is being created
      const address: EthAddress | undefined =
        deployedAddressesByName[name] || deployedAddressesByName[fullyQualifiedName];

      const metadata: ContractMetadata = {
        name,
        filePath,
        fullyQualifiedName,
        abi,
        bytecode,
        deployedBytecode,
        address,
        ...gitMetadata,
      };

      return [...acc, metadata];
    },
    [],
  );

  return contractMetadata;
};

export const resolveTargetContract = (forgeScriptPath: string): string => {
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

  const broadcastArtifacts = await getRunLatestJSON(foundryConfig, chainId, scriptPath);

  return {
    scriptName: targetContract,
    functionName,
    filePath: scriptPath,
    broadcastArtifacts,
    ...scriptGitMetadata,
  };
};
