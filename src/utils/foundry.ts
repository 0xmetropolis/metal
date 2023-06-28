import { ExecException, spawn } from 'child_process';
import { readFileSync } from 'node:fs';
import { getChainId, logError, logInfo, logWarn } from '.';
import * as toml from 'toml';
import { METRO_DEPLOY_URL } from '../constants';

export type FoundryConfig = {
  profile: {
    [profileName: string]: {
      src: string;
      out: string;
      libs?: string[];
      cache?: boolean; // is true if by default
      cache_path: string;
      test?: string;
      broadcast?: string;
    };
  };
};

export type SolidityFilesCache_Partial = {
  _format: 'ethers-rs-sol-cache-3' | 'hh-sol-cache-2' | string;
  paths: {
    artifacts: string;
    build_infos: string;
    sources: string;
    scripts: string;
    libraries: string[];
  };
  files: {
    [SOLIDITY_FILE_PATH: string]: {
      lastModificationDate: number;
      contentHash: string;
      sourceName: string; // relative path to the file
      solcConfig: {
        settings: {
          optimizer: {
            enabled: boolean;
            runs: number;
          };
          metadata: {
            bytecodeHash: string;
            appendCBOR: boolean;
          };
          evmVersion: string;
        };
      };
      imports: string[];
      versionRequirement: string;
      artifacts: {
        [ContractName: string]: {
          [fullyQualifiedSolcVersionName: string]: string; // artifact path
        };
      };
    };
  };
};

type LogReceipt = {
  address: string;
  topics: string[];
  data: string | '0x';
  blockHash: string;
  blockNumber: string; // hex;
  transactionHash: string;
  transactionIndex: string; // hex;
  logIndex: string; // hex;
  transactionLogIndex: string; // hex;
  removed: boolean;
};

type BroadcastReceipts = {
  transactionHash: string;
  transactionIndex: string; // hex
  blockHash: string;
  blockNumber: string; // hex
  from: string;
  to: string | null;
  cumulativeGasUsed: string; // hex
  gasUsed: string; // hex
  contractAddress: string | null;
  logs: LogReceipt[];
  status: '0x1' | '0x0';
  logsBloom: string;
  type: '0x2' | '0x1';
  effectiveGasPrice: string; // hex
};

type BroadcastTransaction = {
  hash: string;
  transactionType: 'CREATE' | 'CALL';
  contractName: string;
  contractAddress: string;
  function: string | null;
  arguments: (string | '[]')[];
  transaction: {
    type: '0x02' | '0x1';
    from: string;
    gas: string; // hex;
    value: string; // hex;
    data: string; // hex;
    nonce: string; // hex;
    accessList: [];
  };
  additionalContracts: [];
  isFixedGasLimit: false;
};

export type BroadcastArtifacts_Partial = {
  transactions: BroadcastTransaction[];
  receipts: BroadcastReceipts[];
  libraries: string[];
  pending: []; // TODO?
  returns: {}; // TODO?
  timestamp: number;
  chain: number;
  multi: boolean;
  commit: string;
};

export const processForgeError = ({ message }: ExecException) => {
  if (message.includes('error trying to connect'))
    return 'Could not connect to the RPC, check your internet connection';
  return message;
};

export const loadFoundryConfig = () => {
  let foundryToml_raw: string;
  try {
    foundryToml_raw = readFileSync('foundry.toml', { encoding: 'utf-8' });
  } catch (e: any) {
    logError('Could not find foundry.toml, ensure you in the root directory of a Foundry project');
    process.exit(1);
  }

  let foundryConfig: FoundryConfig;

  try {
    foundryConfig = toml.parse(foundryToml_raw);
  } catch (e: any) {
    logError(
      'Could not parse foundry.toml, ensure it is valid TOML',
      'see https://github.com/foundry-rs/foundry/tree/master/config for more information.',
    );
    process.exit(1);
  }

  return foundryConfig;
};

// @dev given the foundry config and the env vars, returns the path to the broadcast/ dir
export const getBroadcastPath = (foundryConfig: FoundryConfig): string => {
  const profileENV: string | undefined = process.env.FOUNDRY_PROFILE;
  const profileName = profileENV || 'default';
  const broadcastFolder =
    foundryConfig.profile[profileName]?.broadcast ??
    foundryConfig.profile['default'].broadcast ??
    'broadcast';
  return broadcastFolder;
};

// @dev loads the run-latest.json from the latest broadcast at METRO_DEPLOY_URL
export const getBroadcastArtifacts = async (
  foundryConfig: FoundryConfig,
  forgeScriptPath: string,
): Promise<BroadcastArtifacts_Partial> => {
  const scriptName = forgeScriptPath.split('/').at(-1);
  const broadcastPath = getBroadcastPath(foundryConfig);
  const chainId = await getChainId(METRO_DEPLOY_URL);

  let runLatest_raw: string;
  try {
    runLatest_raw = readFileSync(`${broadcastPath}/${scriptName}/${chainId}/run-latest.json`, {
      encoding: 'utf-8',
    });
  } catch (e: any) {
    logError('Could not load run-latest.json');
    process.exit(1);
  }

  let broadcastArtifacts: BroadcastArtifacts_Partial;
  try {
    broadcastArtifacts = JSON.parse(runLatest_raw);
  } catch (e: any) {
    logError('run-latest.json is corrupt / invalid JSON');
    process.exit(1);
  }

  if (broadcastArtifacts.transactions.length === 0) {
    logError(`Cannot preview ${scriptName} as it generated 0 transactions`);
    process.exit(1);
  }

  return broadcastArtifacts;
};

// @dev given the foundry config and the current env vars, returns the path to the cache/ dir
export const getCachePath = ({ profile }: FoundryConfig): string => {
  const profileENV: string | undefined = process.env.FOUNDRY_PROFILE;
  const profileName = profileENV || 'default';
  const isCacheDisabled =
    profile[profileName]?.cache === false || profile['default']?.cache === false;

  if (isCacheDisabled) {
    logError('Caching is disabled, please set `cache = true` in your foundry.toml');
    process.exit(1);
  }

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
    logError('Could not find solidity-files-cache.json');
    logError(e.message);
    process.exit(1);
  }

  let filesCache: SolidityFilesCache_Partial;
  try {
    filesCache = JSON.parse(filesCache_raw);
  } catch (e: any) {
    logError('Could not parse solidity-files-cache.json, ensure it is valid JSON');
    process.exit(1);
  }

  return filesCache;
};

// @dev loads the solidity-files-cache.json and finds the relative paths to the dependencies
export const getScriptDependencies = (foundryConfig: FoundryConfig, forgeScriptPath: string) => {
  const filesCache = loadSolidityFilesCache(foundryConfig);

  if (filesCache.files[forgeScriptPath] === undefined) {
    logError(
      `Could not find ${forgeScriptPath} in solidity-files-cache.json, ensure it is a valid forge script`,
    );
    process.exit(1);
  }
  if (filesCache._format !== 'ethers-rs-sol-cache-3')
    logWarn('Unexpected solidity-files-cache format, failure may occur');

  return filesCache.files[forgeScriptPath].imports;
};

// @dev returns the terminal status code of the forge script
// @throws if the forge script fails
export const runForgeScript = async (scriptArgs: string[]) => {
  return await new Promise<number>((resolve, reject) => {
    const forge_script = spawn(`forge script ${scriptArgs.join(' ')}`, { shell: true });

    // log any errors
    forge_script.on('error', err => {
      logError('\n' + processForgeError(err) + '\n');
      reject();
    });
    forge_script.stderr.on('data', logError);
    // log any forge output
    forge_script.stdout.on('data', logInfo);

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
