import fetch from 'node-fetch';
import { UUID } from 'node:crypto';
import { type Arguments, type Options } from 'yargs';
import {
  DEFAULT_PRIVATE_KEY,
  FORGE_FORK_ALIASES,
  FORGE_WALLET_OPTIONS,
  METAL_SERVICE_URL,
  METAL_WEB_URL,
  RPC_OVERRIDE_FLAG,
  SUPPORTED_CHAINS,
  doNotCommunicateWithMetalService,
} from '../constants';
import { DeploymentRequestParams } from '../types';
import {
  exit,
  getConfigFromTenderlyRpc,
  logDebug,
  logInfo,
  logWarn,
  openInBrowser,
  printPreviewLinkWithASCIIArt,
  replaceFlagValues,
} from '../utils';
import { sendCliCommandAnalytics } from '../utils/analytics';
import { authenticateAndAssociateDeployment_safe, checkAuthentication } from '../utils/auth';
import {
  getContractMetadata,
  getScriptDependencies,
  getScriptMetadata,
  loadFoundryConfig,
  normalizeForgeScriptPath,
  runForgeScriptForPreviewCommand,
} from '../utils/foundry';
import { getRepoMetadata } from '../utils/git';
import { createMetalFork } from '../utils/preview-service';
import { getCLIVersion } from '../utils/version';

export const command = 'preview';
export const description = `Generate preview of transactions from your Forge script`;

export type Params = { 'chain-id': number };
export type HandlerInput = Arguments & Params;

export const builder: { [key: string]: Options } = {
  'chain-id': {
    type: 'number',
    required: true,
    description: 'The chain id of the network you wish to preview',
  },
  'UNSAFE-RPC-OVERRIDE': {
    type: 'string',
    required: false,
  },
};

function validateInputs({ _: [, scriptPath], 'chain-id': chainId }: HandlerInput) {
  const cliInput = process.argv.slice(3);
  const rpcIndex = cliInput.findIndex(arg => FORGE_FORK_ALIASES.some(alias => alias === arg));

  if (rpcIndex !== -1)
    logWarn(
      'You have specified a custom RPC',
      'This will be ignored and transactions will be sent to the Metal RPC',
    );

  if (!scriptPath || !scriptPath.includes('.sol'))
    exit('You must specify a solidity script to preview');

  if (!SUPPORTED_CHAINS.includes(chainId)) exit(`Chain Id ${chainId} is not supported`);
}

// @dev pulls any args from process.argv and replaces any fork-url aliases with the preview-service's fork url
export const configureForgeScriptInputs = ({ rpcUrl }: { rpcUrl: string }): string[] => {
  // pull anything after `metal preview <path>` as forge arguments
  let forgeArguments = process.argv.slice(3);
  // rewrap function signatures in quotes, ex: --sig "run()"
  forgeArguments = forgeArguments.map(arg =>
    arg.includes('(') && arg.includes(')') ? `"${arg}"` : arg,
  );

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
  // if there is no wallet specified, use the default account
  if (!userHasSpecifiedWalletOpts) {
    logWarn('No private key specified. Using default account');
    forgeArguments = [...forgeArguments, '--private-key', DEFAULT_PRIVATE_KEY];
  }

  // include the broadcast flag for previews
  if (!forgeArguments.includes('--broadcast')) forgeArguments.push('--broadcast');
  if (!forgeArguments.includes('--slow')) forgeArguments.push('--slow');

  return forgeArguments;
};

export const sendDataToMetalService = async (
  payload: DeploymentRequestParams,
  forkId: UUID,
): Promise<string> => {
  try {
    const authenticationStatus = await checkAuthentication();
    const authToken =
      authenticationStatus.status === 'authenticated'
        ? authenticationStatus.access_token
        : undefined;

    let headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${METAL_SERVICE_URL}/preview/${forkId}`, {
      headers,
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.status !== 200) {
      const res = await response.json();
      logDebug(res);

      exit(
        `Error received from Metal! (status ${response.status})`,
        '===========================',
        res.message ?? response.statusText,
      );
    }

    const res: { id: string } = await response.json();
    return res.id;
  } catch (e: any) {
    logDebug(e);
    exit('Error connecting to preview service', e.message);
  }
};

// @dev entry point for the preview command
export const handler = async (yargs: HandlerInput) => {
  validateInputs(yargs);

  const authenticationStatus = await checkAuthentication();

  // @dev arg 0 is the command name: e.g: `preview`
  const {
    _: [, forgeScriptPath],
    'chain-id': chainId,
    'UNSAFE-RPC-OVERRIDE': rpcOverride,
  } = yargs;

  const { rpcUrl, id: previewId } = doNotCommunicateWithMetalService
    ? { id: undefined, rpcUrl: undefined }
    : !!rpcOverride
    ? getConfigFromTenderlyRpc(rpcOverride)
    : await createMetalFork(chainId);

  logInfo(`Loading foundry.toml...`);
  const foundryConfig = loadFoundryConfig();

  logInfo(`Running Forge Script at ${forgeScriptPath}...`);
  const foundryArguments = configureForgeScriptInputs({
    rpcUrl: yargs['UNSAFE-RPC-OVERRIDE'] ?? rpcUrl,
  });

  await runForgeScriptForPreviewCommand(foundryArguments);
  logInfo(`Forge deployment script ran successfully!`);

  const normalizedScriptPath = normalizeForgeScriptPath(forgeScriptPath);
  const solidityFilePaths = [
    normalizedScriptPath,
    ...getScriptDependencies(foundryConfig, normalizedScriptPath),
  ];

  logInfo(`Getting repo metadata...`);
  const repoMetadata = getRepoMetadata(solidityFilePaths);
  const cliVersion = getCLIVersion();

  logInfo(`Getting transaction data...`);
  const scriptMetadata = getScriptMetadata(foundryConfig, chainId, forgeScriptPath);

  logInfo(`Getting contract metadata...`);
  const contractMetadata = getContractMetadata(
    foundryConfig,
    scriptMetadata.broadcastArtifacts,
    solidityFilePaths,
  );

  const payload: DeploymentRequestParams = {
    prompt: 'preview',
    cliVersion,
    chainId,
    repoMetadata,
    scriptMetadata,
    contractMetadata,
  };

  if (!doNotCommunicateWithMetalService) await sendDataToMetalService(payload, previewId);
  const metalServiceUrl = `${METAL_WEB_URL}/preview/${previewId}`;

  logInfo(`Preview simulation successful! 🎉\n\n`);
  // if the user is not authenticated, ask them if they wish to add the deployment to their account
  if (authenticationStatus.status !== 'authenticated' && !doNotCommunicateWithMetalService)
    await authenticateAndAssociateDeployment_safe(previewId, 'preview');

  printPreviewLinkWithASCIIArt(metalServiceUrl);

  openInBrowser(metalServiceUrl);

  sendCliCommandAnalytics('preview');
};
