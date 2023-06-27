import { ExecException, spawn } from 'child_process';
import { readFileSync } from 'node:fs';
import { logError, logInfo, logWarn } from '.';
import * as toml from 'toml';

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
  const filesCache_raw = readFileSync(`${cachePath}/solidity-files-cache.json`, {
    encoding: 'utf-8',
  });

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
