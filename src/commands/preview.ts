import { PreviewRequestParams } from 'index';
import { type Arguments, type Options } from 'yargs';
import { PREVIEW_SERVICE_URL, PREVIEW_WEB_URL, SUPPORTED_CHAINS } from '../constants';
import { exit, loadSolidityABIs, logInfo, logWarn, replaceFlagValues } from '../utils';
import {
  getBroadcastArtifacts,
  getScriptDependencies,
  loadFoundryConfig,
  normalizeForgeScriptPath,
  runForgeScript,
} from '../utils/foundry';
import { createMetropolisFork } from '../utils/preview-service';
import assert = require('node:assert');
import { UUID } from 'node:crypto';

export const command = 'preview';
export const description = `Generate preview of transactions from your Forge script`;
const FORGE_FORK_ALIASES = ['--fork-url', '-f', '--rpc-url'];
const RPC_OVERRIDE_FLAG = '--UNSAFE-RPC-OVERRIDE';

export type Params = { broadcast: boolean; 'chain-id': number; 'UNSAFE-RPC-OVERRIDE'?: string };
export type HandlerInput = Arguments & Params;

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
  'UNSAFE-RPC-OVERRIDE': {
    type: 'string',
    required: false,
    description: 'DEV-ONLY!: Specify an RPC override for the `forge script` command',
  },
};

function validateInputs({ _: [, scriptPath], 'chain-id': chainId }: HandlerInput) {
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

// @dev pulls any args from process.argv and replaces any fork-url aliases with the preview-service's fork url
export const configureForgeScriptInputs = (
  rpcUrl: string,
  { 'UNSAFE-RPC-OVERRIDE': unsafeRPCoverride }: HandlerInput,
): string[] => {
  // pull anything after `metro preview <path>` as forge arguments
  const initialArgs = process.argv.slice(3);
  const rpcToUse = unsafeRPCoverride ?? rpcUrl;

  // if they have specified an rpc override, we need to remove that flag and not pass it to forge
  const userHasSpecifiedOverrideRPC = !!unsafeRPCoverride;
  const rpcOverrideIndex = initialArgs.findIndex(arg => arg === RPC_OVERRIDE_FLAG);

  const argsWithoutOverride = userHasSpecifiedOverrideRPC
    ? initialArgs.filter(
        (_, argIndex) => argIndex !== rpcOverrideIndex && argIndex !== rpcOverrideIndex + 1,
      )
    : initialArgs;

  const rpcIndex = initialArgs.findIndex(arg => FORGE_FORK_ALIASES.some(alias => alias === arg));
  const userHasSpecifiedRPC = rpcIndex !== -1;

  const argsWithRPCUrl = userHasSpecifiedRPC
    ? replaceFlagValues({
        args: argsWithoutOverride,
        flags: FORGE_FORK_ALIASES,
        replaceWith: rpcToUse,
      })
    : [...argsWithoutOverride, '--rpc-url', rpcToUse];

  // const argsWithChainId = replaceFlagValues({
  //   args: argsWithRPCUrl,
  //   flags: ['--chain-id'],
  //   replaceWith: CHAIN_ID_OVERRIDE.toString(),
  // });

  return argsWithRPCUrl; // argsWithChainId;
};

/// @dev sanity checks while we scaffold the app
function devModeSanityChecks({ abis, broadcastArtifacts }: PreviewRequestParams) {
  assert(Object.values(abis).length > 0 && Object.values(abis).every(Boolean));
  assert(broadcastArtifacts.transactions.length > 0);
  logInfo(`DEV: checks pass ✅`);
}

export const sendDataToPreviewService = async (
  payload: PreviewRequestParams,
  forkId: UUID,
): Promise<string> => {
  try {
    const response = await fetch(`${PREVIEW_SERVICE_URL}/preview/${forkId}`, {
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

    const res: { id: string } = await response.json();
    return res.id;
  } catch (e: any) {
    exit('Error connecting to preview service', e.message);
  }
};

// @dev entry point for the preview command
export const handler = async (yargs: HandlerInput) => {
  validateInputs(yargs);

  // @dev arg 0 is the command name: e.g: `preview`
  const {
    _: [, forgeScriptPath],
    'chain-id': chainId,
    'UNSAFE-RPC-OVERRIDE': rpcOverride,
  } = yargs;

  const { rpcUrl, id: forkId } = rpcOverride
    ? { rpcUrl: rpcOverride, id: rpcOverride.split('/').at(-1) as UUID } // TODO: cleanup
    : await createMetropolisFork(chainId);

  logInfo(`Loading foundry.toml...`);
  const foundryConfig = loadFoundryConfig();

  logInfo(`Running Forge Script at ${forgeScriptPath}...`);
  const foundryArguments = configureForgeScriptInputs(rpcUrl, yargs);
  await runForgeScript(foundryArguments);
  logInfo(`Forge deployment script ran successfully!`);

  logInfo(`Retreiving Solidity source code...`);
  const scriptPath = normalizeForgeScriptPath(forgeScriptPath);
  const dependencyList = getScriptDependencies(foundryConfig, scriptPath);
  const solidityFiles = [scriptPath, ...dependencyList];
  const abis = loadSolidityABIs(foundryConfig, solidityFiles);

  logInfo(`Getting transactions...`);
  const broadcastArtifacts = await getBroadcastArtifacts(foundryConfig, chainId, scriptPath);

  const payload = {
    broadcastArtifacts,
    abis,
    chainId,
  };
  devModeSanityChecks(payload);

  await sendDataToPreviewService(payload, forkId);
  const previewServiceUrl = `${PREVIEW_WEB_URL}/preview/${forkId}`;

  logInfo(`Preview simulation successful! 🎉\n\n`);
  logInfo(`Review at: ${previewServiceUrl}`);
  logInfo(`
                             ^
                _______     ^^^
               |xxxxxxx|  _^^^^^_
               |xxxxxxx| | [][][]|
            ______xxxxx| |[][][] |
           |++++++|xxxx| | [][][]|      METROPOLIS
           |++++++|xxxx| |[][][] |
           |++++++|_________ [][]|
           |++++++|=|=|=|=|=| [] |
           |++++++|=|=|=|=|=|[][]|
___________|++HH++|  _HHHH__|   _________   _________  _________

${previewServiceUrl}
__________________  ___________    __________________    ____________
  `);
};
