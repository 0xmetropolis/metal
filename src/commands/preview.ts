import { PreviewRequestParams } from 'index';
import { type Arguments, type Options } from 'yargs';
import { CHAIN_ID_OVERRIDE, METRO_DEPLOY_URL, SUPPORTED_CHAINS } from '../constants';
import { exit, loadSolidityFiles, logInfo, logWarn, replaceFlagValues } from '../utils';
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

function validateInputs({ _: [, scriptPath], 'chain-id': chainId }: Arguments) {
  const cliInput = process.argv.slice(3);
  const rpcIndex = cliInput.findIndex(arg => FORGE_FORK_ALIASES.some(alias => alias === arg));

  if (rpcIndex !== -1)
    logWarn(
      'You have specified a custom RPC',
      'This will be ignored and transactions will be sent to the Metropolis RPC',
    );

  if (!scriptPath || !scriptPath.includes('.sol'))
    exit('You must specify a solidity script to preview');

  if (!SUPPORTED_CHAINS.includes(chainId)) exit(`Chain Id ${chainId} is not supported`);
}

// @dev pulls any args from process.argv and replaces any fork-url aliases with the METRO_DEPLOY_URL
export const configureForgeScriptInputs = (): string[] => {
  // pull anything after `metro preview <path>` as forge arguments
  const initialArgs = process.argv.slice(3);
  const rpcIndex = initialArgs.findIndex(arg => FORGE_FORK_ALIASES.some(alias => alias === arg));
  const userHasSpecifiedRPC = rpcIndex !== -1;

  const argsWithRPCUrl = userHasSpecifiedRPC
    ? replaceFlagValues({
        args: initialArgs,
        flags: FORGE_FORK_ALIASES,
        replaceWith: METRO_DEPLOY_URL,
      })
    : [...initialArgs, '--rpc-url', METRO_DEPLOY_URL];

  // const argsWithChainId = replaceFlagValues({
  //   args: argsWithRPCUrl,
  //   flags: ['--chain-id'],
  //   replaceWith: CHAIN_ID_OVERRIDE.toString(),
  // });

  return argsWithRPCUrl; // argsWithChainId;
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

    if (response.status !== 200)
      exit(
        'Error received from preview service:',
        'Status Code: ' + response.status,
        'Status Text: ' + response.statusText,
      );

    const { previewURL }: { previewURL: string } = await response.json();

    return previewURL;
  } catch (e: any) {
    exit('Error connecting to preview service', e.message);
  }
};

export type Params = { path: string; broadcast: boolean; 'chain-id': number };
export const builder: { [key: string]: Options } = {
  broadcast: {
    type: 'boolean',
    required: true,
    description: 'Send the transaction to the metropolis RPC',
  },
  'chain-id': {
    type: 'number',
    required: true,
    description: 'The chain id of the network you wish to preview',
  },
};

// @dev entry point for the preview command
export const handler = async (yargs: Arguments) => {
  validateInputs(yargs);

  // @dev arg 0 is the command name: e.g: `preview`
  const {
    _: [, forgeScriptPath],
    'chain-id': chainId,
  } = yargs;

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
    chainId,
  };
  devModeSanityChecks(payload);

  const previewURL = 'https://metropolis.sh/my-preview'; // await sendDataToPreviewService(payload); (not ready)

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
