import { readFileSync, readdirSync } from 'fs';
import { BroadcastArtifacts_Partial, FoundryConfig, Network } from '../types';
import { type Arguments, type Options } from 'yargs';
import { exit, logDebug, logInfo } from '../utils';
import { getBroadcastPath, loadFoundryConfig } from '../utils/foundry';
import inquirer = require('inquirer');

export const command = 'import';
export const description = `Import past deployments into a Metropolis preview`;

export type Params = {};
export type HandlerInput = Arguments & Params;

export const builder: { [key: string]: Options } = {};

const getScriptName = async (prevRanScripts: string[]): Promise<string> => {
  if (prevRanScripts.length === 1) {
    logInfo(`Found a single broadcast: ${prevRanScripts[0]}`);
    return prevRanScripts[0];
  }

  return await inquirer
    .prompt([
      {
        type: 'list',
        name: 'file',
        message: 'Select a broadcast to import',
        choices: prevRanScripts,
      },
    ])
    .then(answers => answers['file']);
};

const getChainId = async (chainIds: string[]): Promise<Network> => {
  const options = Object.entries(Network)
    .filter((labelAndNetwork): labelAndNetwork is [string, Network] => {
      const [, chainId] = labelAndNetwork;
      // filter out any chainIds the user hasn't run a broadcast on
      return chainIds.includes(chainId.toString());
    })
    .map(([name, chainId]) => ({ name: `${chainId} (${name.toLowerCase()})`, value: chainId }));

  if (options.length === 0)
    exit(`None of the following chain ids are supported ${chainIds.join(', ')}`);

  if (options.length === 1) {
    logInfo(`Found a single chain id: ${options[0].name}`);
    return options[0].value;
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
    .then(answers => answers['chainId']);
};

const getBroadcastArtifact = async (broadcastArtifacts: string[]): Promise<string> => {
  const options = broadcastArtifacts
    .filter(fileName => fileName.includes('.json'))
    .map(fileName => {
      const [, epochTimestamp] = fileName.split('-');
      const label =
        fileName !== 'run-latest.json'
          ? `${fileName} (${new Date(parseInt(epochTimestamp) * 1000)})`
          : fileName;

      return {
        name: label,
        value: fileName,
      };
    });

  if (options.length === 0) exit(`No broadcasts found`);

  return await inquirer
    .prompt([
      {
        type: 'list',
        name: 'broadcast',
        message: 'Select a broadcast artifact',
        choices: options,
      },
    ])
    .then(answers => answers['broadcast']);
};

// prompt select the chain id (any that appear in the broadcast folder)
const promptForBroadcastArtifact = async (foundryConfig: FoundryConfig) => {
  const broadcastDirPath = getBroadcastPath(foundryConfig);

  try {
    readdirSync(broadcastDirPath);
  } catch (_e: any) {
    exit(`No broadcasts found in ${broadcastDirPath}`);
  }

  // will return an array of directories named by the script file: (ie: [Deployment.s.sol, Upgrade.s.sol])
  const previouslyRanScriptNames = readdirSync(broadcastDirPath);

  // bail if the user hasn't run any scripts
  if (previouslyRanScriptNames.length === 0)
    exit(`No broadcasts found in ${broadcastDirPath}\n Run a forge script to get started.`);

  // prompt select the deploy script (any that appear in the broadcast folder)
  const selectedScript: string = await getScriptName(previouslyRanScriptNames);

  const chainIds = readdirSync(`${broadcastDirPath}/${selectedScript}`);

  if (chainIds.length === 0) exit(`No broadcasts found in ${broadcastDirPath}/${selectedScript}`);

  // prompt select the chain id - or bail if unsupported
  const selectedChainId = await getChainId(chainIds);

  const broadcastArtifacts = readdirSync(
    `${broadcastDirPath}/${selectedScript}/${selectedChainId}`,
  );

  if (broadcastArtifacts.length === 0)
    exit(`No broadcasts found in ${broadcastDirPath}/${selectedScript}/${selectedChainId}`);

  const selectedBroadcastArtifact = await getBroadcastArtifact(broadcastArtifacts);

  return `${broadcastDirPath}/${selectedScript}/${selectedChainId}/${selectedBroadcastArtifact}`;
};

/**
 * @dev entry point for the import command
 */
export const handler = async (yargs: HandlerInput) => {
  logDebug(`Loading foundry.toml...`);
  const foundryConfig = loadFoundryConfig();

  const pathToArtifact = await promptForBroadcastArtifact(foundryConfig);

  const runFile_raw = readFileSync(pathToArtifact, 'utf-8');

  let runFile: BroadcastArtifacts_Partial;
  try {
    runFile = JSON.parse(runFile_raw);
  } catch (e: any) {
    logDebug(e);
    exit('selected artifact is corrupt / invalid JSON');
  }

  logInfo(`\nFound ${runFile.transactions.length} transactions in ${pathToArtifact}`);

  // @kevinweaver https://linear.app/metropolis/issue/MP-351/%5Bcli%5D-dollar-metro-import-command
  // @kevinweaver https://www.npmjs.com/package/inquirer

  //   const normalizedScriptPath = normalizeForgeScriptPath(forgeScriptPath);
  //   const solidityFilePaths = [
  //     normalizedScriptPath,
  //     ...getScriptDependencies(foundryConfig, normalizedScriptPath),
  //   ];

  //   logInfo(`Getting repo metadata...`);
  //   const repoMetadata = getRepoMetadata(solidityFilePaths);
  //   const cliVersion = getCLIVersion();

  //   logInfo(`Getting transaction data...`);
  //   const scriptMetadata = await getScriptMetadata(foundryConfig, chainId, forgeScriptPath);

  //   logInfo(`Getting contract metadata...`);
  //   const contractMetadata = getContractMetadata(
  //     foundryConfig,
  //     scriptMetadata.broadcastArtifacts,
  //     solidityFilePaths,
  //   );

  //   const payload: DeploymentRequestParams = {
  //     cliVersion,
  //     chainId,
  //     repoMetadata,
  //     scriptMetadata,
  //     contractMetadata,
  //   };

  //   const deploymentId = doNotCommunicateWithPreviewService
  //     ? undefined
  //     : await uploadDeploymentData(payload);
  //   const metropoliswebUrl = `${PREVIEW_WEB_URL}/preview/${deploymentId}`;

  //   logInfo(`Upload Successful! 🎉\n\n`);
  //   logInfo(`
  //                              ^
  //                 _______     ^^^
  //                |xxxxxxx|  _^^^^^_
  //                |xxxxxxx| | [][][]|
  //             ______xxxxx| |[][][] |
  //            |++++++|xxxx| | [][][]|      METROPOLIS
  //            |++++++|xxxx| |[][][] |
  //            |++++++|_________ [][]|
  //            |++++++|=|=|=|=|=| [] |
  //            |++++++|=|=|=|=|=|[][]|
  // ___________|++HH++|  _HHHH__|   _________   _________  _________

  // ${metropoliswebUrl}
  // __________________  ___________    __________________    ____________
  //   `);

  //   openInBrowser(metropoliswebUrl);
};
