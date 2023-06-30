import { PreviewRequestParams } from 'index';
import { type Arguments, type Options } from 'yargs';
import { METRO_DEPLOY_URL } from '../constants';
import { loadSolidityFiles, logError, logInfo, logWarn } from '../utils';
import {
  getBroadcastArtifacts,
  getScriptDependencies,
  loadFoundryConfig,
  runForgeScript,
} from '../utils/foundry';
import assert = require('node:assert');

export const command = 'preview';
export const description = `Generate preview of transactions from your Forge script`;
const FORGE_FORK_ALIASES = ['--fork-url', '-f', '--rpc-url'];

export type Params = { path: string; broadcast: boolean };
export const builder: { [key: string]: Options } = {
  broadcast: {
    type: 'boolean',
    required: true,
    description: 'Send the transaction to the metropolis RPC',
  },
};

// @dev pulls any args from process.argv and replaces any fork-url aliases with the METRO_DEPLOY_URL
export const configureForgeScriptInputs = (): string[] => {
  // pull anything after `metro preview <path>` as forge arguments
  const initialArgs = process.argv.slice(3);
  const rpcIndex = initialArgs.findIndex(arg => FORGE_FORK_ALIASES.some(alias => alias === arg));
  const userHasSpecifiedRPC = rpcIndex !== -1;

  if (userHasSpecifiedRPC)
    logWarn(
      'You have specified a custom RPC',
      'This will be ignored and transactions will be sent to the Metropolis RPC',
    );

  const formattedArgs = userHasSpecifiedRPC
    ? initialArgs.map((arg, index) => (index === rpcIndex + 1 ? METRO_DEPLOY_URL : arg))
    : [...initialArgs, '--rpc-url', METRO_DEPLOY_URL];

  return formattedArgs;
};

function devModeSanityChecks({ sourceCode, broadcastArtifacts }: PreviewRequestParams) {
  assert(Object.values(sourceCode).length > 0 && Object.values(sourceCode).every(Boolean));
  assert(broadcastArtifacts.transactions.length > 0);
  logInfo(`DEV: checks pass ✅`);
}

export const sendDataToPreviewService = async (payload: PreviewRequestParams): Promise<string> => {
  try {
    const response = await fetch(`${METRO_DEPLOY_URL}/preview`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.status !== 200) {
      logError('Error received from preview service:');
      logError('Status Code: ' + response.status);
      logError('Status Text: ' + response.statusText);
      process.exit(1);
    }

    const { previewURL }: { previewURL: string } = await response.json();

    return previewURL;
  } catch (e: any) {
    logError('Error connecting to preview service');
    logError(e.message);
    process.exit(1);
  }
};

// @dev entry point for the preview command
export const handler = async ({ _: [, forgeScriptPath] }: Arguments) => {
  logInfo(`Loading foundry.toml...`);
  const foundryConfig = loadFoundryConfig();

  logInfo(`Running Forge Script at ${forgeScriptPath}...`);

  const foundryArguments = configureForgeScriptInputs();
  await runForgeScript(foundryArguments);

  logInfo(`Forge deployment script ran successfully!`);

  logInfo(`Retreiving Solidity source code...`);
  const dependencyList = getScriptDependencies(foundryConfig, forgeScriptPath);
  const solidityFiles = [forgeScriptPath, ...dependencyList];
  const sourceCode = loadSolidityFiles(solidityFiles);

  logInfo(`Getting transactions...`);
  const broadcastArtifacts = await getBroadcastArtifacts(foundryConfig, forgeScriptPath);

  const payload = {
    broadcastArtifacts,
    sourceCode,
  };
  devModeSanityChecks(payload);

  const previewURL = await sendDataToPreviewService(payload);

  logInfo(`Preview simulation successful! 🎉\n\n`);
  logInfo(`View preview: ${previewURL}`);
  logInfo(`
                             ^
                _______     ^^^
               |xxxxxxx|  _^^^^^_
               |xxxxxxx| | [][]  |
            ______xxxxx| |[][][] |
           |++++++|xxxx| | [][][]|      METROPOLIS
           |++++++|xxxx| |[][][] |
           |++++++|_________ [][]|
           |++++++|=|=|=|=|=| [] |
           |++++++|=|=|=|=|=|[][]|
___________|++HH++|  _HHHH__|   _________   _________  _________

${previewURL}
__________________  ___________    __________________    ____________
  `);
};
