import { type Arguments, type Options } from 'yargs';
import {
  FORGE_FORK_ALIASES,
  PREVIEW_WEB_URL,
  SUPPORTED_CHAINS,
  doNotCommunicateWithPreviewService,
} from '../constants';
import { DeploymentRequestParams, Network } from '../types/index';
import {
  exit,
  getFlagValueFromArgv,
  logDebug,
  logInfo,
  openInBrowser,
  printPreviewLinkWithASCIIArt,
} from '../utils';
import { sendCliCommandAnalytics } from '../utils/analytics';
import { authenticateAndAssociateDeployment_safe, checkAuthentication } from '../utils/auth';
import {
  getContractMetadata,
  getScriptDependencies,
  getScriptMetadata,
  loadFoundryConfig,
  normalizeForgeScriptPath,
  runForgeScript,
} from '../utils/foundry';
import { getRepoMetadata } from '../utils/git';
import { checkRepoForUncommittedChanges } from '../utils/import';
import { ChainConfig, fetchChainConfig, uploadDeploymentData } from '../utils/preview-service';
import { getCLIVersion } from '../utils/version';
import inquirer = require('inquirer');

export const command = 'deploy';
export const description = `Run your deployments against a live network and generate a Metal preview`;

export type Params = { 'chain-id': number };
export type HandlerInput = Arguments & Params;

export const builder: { [key: string]: Options } = {
  'chain-id': {
    type: 'number',
    required: true,
    description: 'The chain id of the network',
  },
  broadcast: {
    type: 'boolean',
    required: true,
    description: 'Must broadcast transactions to the network',
  },
};

function validateInputs({ _: [, scriptPath], 'chain-id': chainId }: HandlerInput) {
  if (!scriptPath || !scriptPath.includes('.sol'))
    exit('You must specify a solidity script to preview');

  const rpcSpecified = FORGE_FORK_ALIASES.some(alias => process.argv.includes(alias));

  // if the rpc is specified, we don't need to validate the chain id
  if (!SUPPORTED_CHAINS.includes(chainId) && !rpcSpecified)
    exit(`Chain Id ${chainId} is not supported`);
}

// @dev pulls any args from process.argv and replaces any fork-url aliases with the preview-service's fork url
export const configureForgeScriptInputs = ({ rpcUrl }: { rpcUrl: string }): string[] => {
  // pull anything after `metal preview <path>` as forge arguments
  let forgeArguments = process.argv.slice(3);

  // rewrap function signatures in quotes, ex: --sig "run()"
  forgeArguments = forgeArguments.map(arg =>
    arg.includes('(') && arg.includes(')') ? `"${arg}"` : arg,
  );

  forgeArguments.push('--rpc-url', rpcUrl);

  if (!forgeArguments.includes('--slow')) forgeArguments.push('--slow');

  return forgeArguments;
};

const getChainConfig = async (chainId: Network): Promise<Partial<ChainConfig>> => {
  const rpcOverrideFlagIdx = process.argv.findIndex(arg => FORGE_FORK_ALIASES.includes(arg));
  const userHasSpecifiedRPC = rpcOverrideFlagIdx !== -1;

  const emptyConfig: Partial<ChainConfig> = {
    rpcUrl: undefined,
    label: undefined,
    chainId,
    etherscanUrl: undefined,
  };

  return doNotCommunicateWithPreviewService
    ? emptyConfig
    : !!userHasSpecifiedRPC
    ? { ...emptyConfig, rpcUrl: getFlagValueFromArgv(process.argv[rpcOverrideFlagIdx + 1]) }
    : await fetchChainConfig(chainId);
};

// @dev entry point for the preview command
export const handler = async (yargs: HandlerInput) => {
  validateInputs(yargs);
  checkRepoForUncommittedChanges();

  const authenticationStatus = await checkAuthentication();

  // @dev arg 0 is the command name: e.g: `deploy`
  const {
    _: [, forgeScriptPath],
    'chain-id': chainId,
  } = yargs;

  const { rpcUrl, label } = await getChainConfig(chainId);

  logDebug(`Loading foundry.toml...`);
  const foundryConfig = loadFoundryConfig();

  const foundryArguments = configureForgeScriptInputs({
    rpcUrl,
  });

  await inquirer
    .prompt({
      type: 'confirm',
      name: 'confirm',
      message: `You are about to sign and send transactions to ${
        label ? label : 'chain with id: ' + chainId
      }❗️\n\nAre you sure you want to continue?`,
    })
    .then(({ confirm }) => !confirm && exit('Aborting deployment'));

  logInfo(`Running Forge Script at ${forgeScriptPath}...`);
  await runForgeScript(foundryArguments);
  logInfo(`Forge deployment script ran successfully!`);

  const normalizedScriptPath = normalizeForgeScriptPath(forgeScriptPath);
  const solidityFilePaths = [
    normalizedScriptPath,
    ...getScriptDependencies(foundryConfig, normalizedScriptPath),
  ];

  logDebug(`Getting repo metadata...`);
  const repoMetadata = getRepoMetadata(solidityFilePaths);
  const cliVersion = getCLIVersion();

  logInfo(`Getting transaction data...`);
  const scriptMetadata = getScriptMetadata(foundryConfig, chainId, forgeScriptPath);

  logDebug(`Getting contract metadata...`);
  const contractMetadata = getContractMetadata(
    foundryConfig,
    scriptMetadata.broadcastArtifacts,
    solidityFilePaths,
  );

  const payload: DeploymentRequestParams = {
    prompt: 'deploy',
    cliVersion,
    chainId,
    repoMetadata,
    scriptMetadata,
    contractMetadata,
  };

  const authToken =
    authenticationStatus.status === 'authenticated' ? authenticationStatus.access_token : undefined;

  const deploymentId = doNotCommunicateWithPreviewService
    ? undefined
    : await uploadDeploymentData(payload, authToken);

  logInfo(`Deployment successful! 🎉\n\n`);
  const metalWebUrl = `${PREVIEW_WEB_URL}/preview/${deploymentId}`;
  // if the user is not authenticated, ask them if they wish to add the deployment to their account
  if (authenticationStatus.status !== 'authenticated' && !doNotCommunicateWithPreviewService)
    await authenticateAndAssociateDeployment_safe(deploymentId, 'deployment');

  printPreviewLinkWithASCIIArt(metalWebUrl);

  openInBrowser(metalWebUrl);

  sendCliCommandAnalytics('deploy');
};
