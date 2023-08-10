import { PreviewRequestParams } from 'index';
import { UUID } from 'node:crypto';
import { type Arguments, type Options } from 'yargs';
import {
  DEFAULT_PRIVATE_KEY,
  FORGE_FORK_ALIASES,
  FORGE_WALLET_OPTIONS,
  PREVIEW_SERVICE_URL,
  PREVIEW_WEB_URL,
  RPC_OVERRIDE_FLAG,
  SUPPORTED_CHAINS,
  SUPPORTED_NETWORKS,
  doNotCommunicateWithPreviewService,
} from '../constants';
import {
  exit,
  getChainIdFromNetworkName,
  getConfigFromTenderlyRpc,
  loadSolidityABIs,
  logInfo,
  logWarn,
  openInBrowser,
  replaceFlagValues,
} from '../utils';
import {
  getBroadcastArtifacts,
  getScriptDependencies,
  loadFoundryConfig,
  normalizeForgeScriptPath,
  runForgeScript,
} from '../utils/foundry';
import { getRepoMetadata } from '../utils/git';
import { createMetropolisFork } from '../utils/preview-service';
import assert = require('node:assert');

export const command = 'preview';
export const description = `Generate preview of transactions from your Forge script`;

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
    required: false,
    description: 'The chain id of the network you wish to preview',
  },
  network: {
    type: 'string',
    required: false,
    description: 'The name of the network you wish to preview',
  },
  'UNSAFE-RPC-OVERRIDE': {
    type: 'string',
    required: false,
    description: 'DEV-ONLY!: Specify an RPC override for the `forge script` command',
  },
};

function validateInputs({
  _: [, scriptPath],
  'chain-id': chainId,
  network: network,
}: HandlerInput) {
  const cliInput = process.argv.slice(3);
  const rpcIndex = cliInput.findIndex(arg => FORGE_FORK_ALIASES.some(alias => alias === arg));

  if (rpcIndex !== -1)
    logWarn(
      'You have specified a custom RPC',
      'This will be ignored and transactions will be sent to the Metropolis RPC',
    );

  if (!scriptPath || !scriptPath.includes('.sol'))
    exit('You must specify a solidity script to preview');

  if (!chainId && !network) exit(`You must include either --chain-id or --network`);

  if (chainId && !SUPPORTED_CHAINS.includes(chainId)) exit(`Chain Id ${chainId} is not supported`);

  if (network && !SUPPORTED_NETWORKS.includes(network)) exit(`Network ${network} is not supported`);
}

// @dev pulls any args from process.argv and replaces any fork-url aliases with the preview-service's fork url
export const configureForgeScriptInputs = ({ rpcUrl }: { rpcUrl: string }): string[] => {
  // pull anything after `metro preview <path>` as forge arguments
  let forgeArguments = process.argv.slice(3);

  const UNSAFERpcOverrideIndex = forgeArguments.findIndex(arg => arg === RPC_OVERRIDE_FLAG);
  // if the developer has specified an rpc override, we need to remove that flag and not pass it to forge
  const userHasSpecifiedUNSAFEOverrideRPC = UNSAFERpcOverrideIndex !== -1;

  if (userHasSpecifiedUNSAFEOverrideRPC)
    forgeArguments = forgeArguments.filter(
      (_, argIndex) =>
        argIndex !== UNSAFERpcOverrideIndex && argIndex !== UNSAFERpcOverrideIndex + 1,
    );

  const rpcIndex = forgeArguments.findIndex(arg => FORGE_FORK_ALIASES.some(alias => alias === arg));
  const userHasSpecifiedRPC = rpcIndex !== -1;

  if (userHasSpecifiedRPC)
    forgeArguments = replaceFlagValues({
      args: forgeArguments,
      flags: FORGE_FORK_ALIASES,
      replaceWith: rpcUrl,
    });
  else forgeArguments = [...forgeArguments, '--rpc-url', rpcUrl];

  // if a user setup the script to use a private key / wallet store
  const userHasSpecifiedWalletOpts = forgeArguments.some(arg => FORGE_WALLET_OPTIONS.includes(arg));
  // put the default account in there so they can visualize
  if (!userHasSpecifiedWalletOpts) {
    logWarn('No private key specified.', 'Simulating default account 0');
    forgeArguments = [...forgeArguments, '--private-key', DEFAULT_PRIVATE_KEY];
  }
  // const argsWithChainId = replaceFlagValues({
  //   args: argsWithRPCUrl,
  //   flags: ['--chain-id'],
  //   replaceWith: CHAIN_ID_OVERRIDE.toString(),
  // });

  forgeArguments = [...forgeArguments, '--slow'];
  return forgeArguments;
};

/// @dev sanity checks while we scaffold the app
function devModeSanityChecks({ abis, broadcastArtifacts, repoMetadata }: PreviewRequestParams) {
  assert(Object.values(abis).length > 0 && Object.values(abis).every(Boolean));
  assert(broadcastArtifacts.transactions.length > 0);
  assert(
    repoMetadata.__type === 'detailed' &&
      repoMetadata.remoteUrl &&
      repoMetadata.repoCommitSHA &&
      repoMetadata.repositoryName,
  );
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
    'chain-id': chainIdFlag,
    network,
    'UNSAFE-RPC-OVERRIDE': rpcOverride,
  } = yargs;
  const chainId = chainIdFlag ?? getChainIdFromNetworkName(network);

  const { rpcUrl, id: forkId } = doNotCommunicateWithPreviewService
    ? { id: undefined, rpcUrl: undefined }
    : !!rpcOverride
    ? getConfigFromTenderlyRpc(rpcOverride)
    : await createMetropolisFork(chainId);

  logInfo(`Loading foundry.toml...`);
  const foundryConfig = loadFoundryConfig();

  logInfo(`Running Forge Script at ${forgeScriptPath}...`);
  const foundryArguments = configureForgeScriptInputs({
    rpcUrl: yargs['UNSAFE-RPC-OVERRIDE'] ?? rpcUrl,
  });
  await runForgeScript(foundryArguments);
  logInfo(`Forge deployment script ran successfully!`);

  logInfo(`Retreiving Solidity source code...`);
  const scriptPath = normalizeForgeScriptPath(forgeScriptPath);
  const dependencyList = getScriptDependencies(foundryConfig, scriptPath);
  const solidityFiles = [scriptPath, ...dependencyList];
  const abis = loadSolidityABIs(foundryConfig, solidityFiles);

  logInfo(`Getting repo metadata...`);
  const repoMetadata = getRepoMetadata(solidityFiles);

  logInfo(`Getting transactions...`);
  const broadcastArtifacts = await getBroadcastArtifacts(foundryConfig, chainId, scriptPath);

  const payload = {
    broadcastArtifacts,
    abis,
    repoMetadata,
    chainId,
  };
  devModeSanityChecks(payload);

  if (!doNotCommunicateWithPreviewService) await sendDataToPreviewService(payload, forkId);
  const previewServiceUrl = `${PREVIEW_WEB_URL}/preview/${forkId}`;

  logInfo(`Preview simulation successful! 🎉\n\n`);
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

  openInBrowser(previewServiceUrl);
};
