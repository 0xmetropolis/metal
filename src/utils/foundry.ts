import { ExecException, spawn } from 'child_process';
import { BroadcastArtifacts_Partial, FoundryConfig, SolidityFilesCache_Partial } from 'index';
import { readFileSync } from 'node:fs';
import * as toml from 'toml';
import { getChainId, logError, logWarn } from '.';
import { METRO_DEPLOY_URL } from '../constants';

export const processForgeError = ({ message }: ExecException) => {
  if (message.includes('connect error'))
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
