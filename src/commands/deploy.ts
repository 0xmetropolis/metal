import { type Arguments, type Options } from 'yargs';
import { METAL_WEB_URL, doNotAuth, doNotCommunicateWithMetalService } from '../constants';
import { DeploymentRequestParams } from '../types/index';
import { exit, logDebug, logInfo, openInBrowser, printPreviewLinkWithASCIIArt } from '../utils';
import { sendCliCommandAnalytics } from '../utils/analytics';
import { tryAuthenticateAndAssociateDeployment, checkAuthentication } from '../utils/auth';
import { configureForgeScriptInputs, getChainConfig, validateInputs } from '../utils/deploy';
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
import { uploadDeploymentData } from '../utils/preview-service';
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

// @dev entry point for the preview command
export const handler = async (yargs: HandlerInput) => {
  await validateInputs(yargs);
  await checkRepoForUncommittedChanges();

  const authenticationStatus = await checkAuthentication();

  // @dev arg 0 is the command name: e.g: `deploy`
  const {
    _: [, forgeScriptPath],
    'chain-id': chainId,
  } = yargs;

  const { rpcUrl, label } = await getChainConfig(chainId);

  logDebug(`Loading foundry.toml...`);
  const foundryConfig = await loadFoundryConfig();

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
    .then(async ({ confirm }) => {
      if (!confirm) await exit('Aborting deployment');
    });

  logInfo(`Running Forge Script at ${forgeScriptPath}...`);
  await runForgeScript(foundryArguments);
  logInfo(`Forge deployment script ran successfully!`);

  const normalizedScriptPath = normalizeForgeScriptPath(forgeScriptPath);
  const solidityFilePaths = [
    normalizedScriptPath,
    ...(await getScriptDependencies(foundryConfig, normalizedScriptPath)),
  ];

  logDebug(`Getting repo metadata...`);
  const repoMetadata = await getRepoMetadata(solidityFilePaths);
  const cliVersion = getCLIVersion();

  logInfo(`Getting transaction data...`);
  const scriptMetadata = await getScriptMetadata(foundryConfig, chainId, forgeScriptPath);

  logDebug(`Getting contract metadata...`);
  const contractMetadata = await getContractMetadata(
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

  const deploymentId = doNotCommunicateWithMetalService
    ? undefined
    : await uploadDeploymentData(payload, authToken);

  logInfo(`Deployment successful! 🎉\n\n`);
  const metalWebUrl = `${METAL_WEB_URL}/preview/${deploymentId}`;
  // if the user is not authenticated, ask them if they wish to add the deployment to their account
  if (
    authenticationStatus.status !== 'authenticated' &&
    !doNotCommunicateWithMetalService &&
    !doNotAuth
  )
    await tryAuthenticateAndAssociateDeployment(deploymentId, 'deployment');

  printPreviewLinkWithASCIIArt(metalWebUrl);

  openInBrowser(metalWebUrl);

  sendCliCommandAnalytics('deploy');
};
