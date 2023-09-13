import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { Dirent, existsSync, readdirSync } from 'node:fs';
import { cwd } from 'node:process';
import { exit, isTxConfirmed, logDebug, logError, logInfo } from '.';
import { BroadcastArtifacts_Partial, FoundryConfig, Network } from '../types/index';
import {
  getBroadcastPath,
  getFoundryConfigValue,
  loadBroadcastArtifacts,
  runForgeBuild,
} from './foundry';
import { checkoutToCommit, getGitStatus, getLatestCommitSHA_repo } from './git';
import { ChainConfig } from './preview-service';
import inquirerFileTreeSelection = require('inquirer-file-tree-selection-prompt');
import inquirer = require('inquirer');

export const checkRepoForUncommittedChanges = () => {
  logDebug(`Checking Repo for uncommitted changes...`);

  const userHasPotentiallyDangerousUncommittedChanges = getGitStatus()
    .split('\n')
    .some(line => line.endsWith('.sol') || line === 'foundry.toml');

  if (userHasPotentiallyDangerousUncommittedChanges) {
    logInfo('');
    exit(`You have uncommitted Solidity or foundry.toml changes. Please commit or stash them.`);
  }
};

const selectScriptName = async (prevRanScripts: string[]): Promise<string> => {
  if (prevRanScripts.length === 1) {
    logInfo(`Found a single broadcast: ${chalk.blueBright(prevRanScripts[0])}`);
    return prevRanScripts[0];
  }

  return await inquirer
    .prompt([
      {
        type: 'list',
        name: 'file',
        message: 'Select a script to import',
        choices: prevRanScripts,
      },
    ])
    .then(answers => answers['file']);
};

const selectChainId = async (chainIds: string[]): Promise<Network> => {
  // filter out any chainIds the user hasn't run a broadcast on
  const options = Object.entries(Network)
    .filter((labelAndNetwork): labelAndNetwork is [string, Network] => {
      const [, chainId] = labelAndNetwork;
      return chainIds.includes(chainId.toString());
    })
    // create a list of options for the user to select from
    .map(([name, chainId]) => ({ name: `${chainId} (${name.toLowerCase()})`, value: chainId }));

  if (options.length === 0)
    exit(`None the following networks you've broadcast to are supported ${chainIds.join(', ')}`);

  // auto-select a default if there is only one option
  if (options.length === 1) {
    const [{ value, name }] = options;

    logInfo(`Found a single chain: ${chalk.blueBright(name)}`);
    return value;
  }

  return await inquirer
    .prompt([
      {
        type: 'list',
        name: 'chainId',
        message: 'Select a supported network',
        choices: options,
      },
    ])
    .then(({ chainId }) => chainId);
};

const selectBroadcastArtifact = async (
  pathToArtifacts: string,
  broadcastArtifacts: string[],
): Promise<string> => {
  const options = broadcastArtifacts
    // filter out any non-json files
    .filter(fileName => fileName.endsWith('.json'))
    // create a list of options for the user to select from with nice, readable timestamps
    .map<inquirer.ChoiceOptions>(fileName => {
      // if the file is the run-latest.json, then open the file to see when the run timestamp was
      if (fileName === 'run-latest.json') {
        let runLatest = loadBroadcastArtifacts(`${pathToArtifacts}/${fileName}`);

        return {
          name: `${fileName} (${new Date(runLatest.timestamp * 1000).toLocaleString()})`,
          value: fileName,
        };
      }

      // other files are named with the timestamp in the filename
      const [, epochTimestamp] = fileName.split('-');
      return {
        name: `${fileName} (${new Date(parseInt(epochTimestamp) * 1000).toLocaleString()})`,
        value: fileName,
      };
    });

  if (options.length === 0) exit(`No valid broadcast files found in ${pathToArtifacts}`);

  return (
    await inquirer.prompt([
      {
        type: 'list',
        name: 'broadcast',
        message: 'Select a broadcast artifact',
        // reverse the list so the most recent broadcasts are at the top
        choices: options.reverse(),
      },
    ])
  ).broadcast;
};

// gets the broadcast artifact the user wants to upload
export const promptForBroadcastArtifact = async (foundryConfig: FoundryConfig) => {
  logDebug(`Beginning to fetch broadcast artifacts...`);
  const broadcastDirPath = getBroadcastPath(foundryConfig);

  // sanity check that the broadcast dir exists
  const dirExists = existsSync(broadcastDirPath);
  if (!dirExists) exit(`No broadcasts found in ${cwd()}/${broadcastDirPath}`);

  // will return an array of directories named by the script file: (ie: [Deployment.s.sol, Upgrade.s.sol])
  const previouslyRanScriptNames = readdirSync(broadcastDirPath, { withFileTypes: true })
    .filter((dirent: Dirent) => dirent.isDirectory())
    .map(({ name }) => name);

  // bail if the user hasn't run any scripts
  if (previouslyRanScriptNames.length === 0)
    exit(`No broadcasts found in ${broadcastDirPath}\n💡 Run a forge script to get started.`);

  // prompt select the deploy script (any that appear in the broadcast folder)
  const selectedScript: string = await selectScriptName(previouslyRanScriptNames);

  // will return an array of chainIds the user has run broadcasts on (ie: [1, 4, 100])
  const chainIds = readdirSync(`${broadcastDirPath}/${selectedScript}`);

  if (chainIds.length === 0) exit(`No broadcasts found in ${broadcastDirPath}/${selectedScript}`);

  // prompt select the chain id - or bail if unsupported
  const selectedChainId = await selectChainId(chainIds);

  const broadcastFilePath = `${broadcastDirPath}/${selectedScript}/${selectedChainId}`;

  const broadcastArtifacts = readdirSync(broadcastFilePath);
  if (broadcastArtifacts.length === 0) exit(`No broadcasts found in ${broadcastFilePath}`);

  const selectedBroadcastArtifact = await selectBroadcastArtifact(
    broadcastFilePath,
    broadcastArtifacts,
  );

  return {
    selectedScript,
    selectedChainId,
    artifactPath: `${broadcastDirPath}/${selectedScript}/${selectedChainId}/${selectedBroadcastArtifact}`,
  };
};

export const buildProject = async () => {
  const buildOptionsIdx = process.argv.findIndex(arg => arg === '--build-options');
  const userSpecifiedBuildOpts = buildOptionsIdx !== -1;
  // interpret anything after `--build-options` as options to pass to `forge build`
  const buildOptions = userSpecifiedBuildOpts ? process.argv.slice(buildOptionsIdx + 1) : [];

  if (userSpecifiedBuildOpts)
    logInfo(
      `Running \`$ forge build\` (with custom options: ${chalk.bgYellow(
        buildOptions.join(' '),
      )})...`,
    );

  await runForgeBuild(buildOptions).catch(() => {
    logError(`Forge build failed. Aborting import.`);

    exit(
      'If the error is related to inline `$ forge build` options (i.e: `--optimizer-runs`), try passing them with the `--build-options` flag.',
    );
  });
};

export const ensureBroadcastArtifactValidityAndContinue = async (
  artifactPath: string,
  broadcastArtifact: BroadcastArtifacts_Partial,
  chainConfig: ChainConfig,
): Promise<boolean> => {
  logInfo(`Checking broadcast artifacts...`);

  const invalidate = () => {
    logError(`The transactions in this file don't exist on chain: ${chainConfig.label}\n`);
    return false;
  };

  const txHashes = broadcastArtifact.transactions.map(({ hash }) => hash);
  if (txHashes.some(hash => !Boolean(hash))) return invalidate();

  try {
    const isConfirmed = await Promise.all(
      txHashes.map(hash => isTxConfirmed(chainConfig.rpcUrl, hash)),
    ).then(results => results.every(Boolean));

    if (!isConfirmed) return invalidate();
  } catch (e: any) {
    logDebug(e);
    exit('Error fetching transaction data from RPC endpoint');
  }

  logInfo(
    chalk.blue(
      `\nFound ${broadcastArtifact.transactions.length} transactions in ${cwd()}/${artifactPath}`,
    ),
  );
  txHashes.forEach((hash, i) => {
    logInfo(`  (${i + 1})\t${chainConfig.etherscanUrl}/tx/${hash}`);
  });

  logInfo('\n');
  return await inquirer
    .prompt({ type: 'confirm', name: 'confirm', message: 'Continue with this broadcast file?' })
    .then(({ confirm }: { confirm: boolean }) => confirm);
};

export const ensureRepoIsOnCorrectCommit = async (
  broadcastArtifact: BroadcastArtifacts_Partial,
): Promise<string | null> => {
  const commitSHAOfBroadcast = broadcastArtifact.commit;
  const commitSHAOfRepo = getLatestCommitSHA_repo();

  const broadcastAndRepoInParity = commitSHAOfRepo
    .toLowerCase()
    .startsWith(commitSHAOfBroadcast.toLowerCase());

  // if their repo is on the correct commit and we can continue without returning a commit to revert to
  if (broadcastAndRepoInParity) return null;

  // otherwise, prompt the user to checkout to the commit of the broadcast - or exit
  if (!broadcastAndRepoInParity) {
    logInfo('\n');
    await inquirer
      .prompt({
        type: 'confirm',
        name: 'confirm',
        message: `❗️ The selected script was executed at commit: (${chalk.bgYellow(
          commitSHAOfBroadcast,
        )}). The current commit is: (${chalk.bgYellow(
          commitSHAOfRepo.slice(0, 7),
        )}).\nWe will attempt to checkout to the commit of the broadcast.\n\nCheckout to commit ${chalk.blue(
          commitSHAOfBroadcast,
        )}?`,
      })
      .then(({ confirm }) => !confirm && exit('Aborting import'));

    logInfo(`Checking out to commit ${commitSHAOfBroadcast}...`);
    checkoutToCommit(commitSHAOfBroadcast, { silent: true });

    return commitSHAOfRepo;
  }
};

export const findScriptPath = async (foundryConfig: FoundryConfig, scriptFileName: string) => {
  // find where the contracts live from the foundry.toml
  const srcPath = getFoundryConfigValue(foundryConfig, 'src') ?? 'src';

  // recursively search dir for a matching script file
  //   results could be a multiple matches, a single match, or no match (undefined)
  const findFileInDir = (dir: string): string[] | string | undefined => {
    // make sure the directory exists!
    if (!existsSync(dir)) return undefined;

    // get an array of all files in `dir` that match `scriptFileName`
    const matches = execSync(`find ${dir} -type f -name ${scriptFileName}`)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    if (matches.length === 0) return undefined;
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return matches;
  };

  // search for the script file in the `script/` dir first, then the `src/` dir
  const searchResult = findFileInDir('script') ?? findFileInDir(srcPath);

  // if the search result is a string, we found a single match and can return it!
  if (typeof searchResult === 'string') return searchResult;

  // if we can't find a single match, show the user the whole file tree and have them select one
  if (searchResult === undefined) {
    logInfo('\n');
    logInfo(
      chalk.yellow(`❗️ No files matching ${scriptFileName} found in ${srcPath}/ or \`script/\``),
    );

    // @ts-ignore
    inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);
    return await inquirer
      .prompt({
        hideRoot: true,
        type: 'file-tree-selection',
        name: 'script',
        message: 'Select a script file',
        root: cwd(),
        // only allow the user to select .sol files
        validate: (input: string) => input.endsWith('.sol'),
      })
      // return the path relative to the current working directory
      .then(({ script }) => script.replace(`${cwd()}/`, ''));
  }

  // otherwise, it's an array of matches (maybe there are multiple scripts called "Deploy.s.sol"), so we need to prompt the user to select one
  logInfo('\n');
  logInfo(chalk.yellow(`❗️ Multiple files matching ${scriptFileName} found. Please select one:`));

  return await inquirer
    .prompt({
      type: 'list',
      name: 'script',
      message: 'Select a script file',
      choices: searchResult,
    })
    .then(({ script }) => script);
};
