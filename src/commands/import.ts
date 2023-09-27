import { type Arguments, type Options } from 'yargs';
import { PREVIEW_WEB_URL, doNotCommunicateWithPreviewService } from '../constants';
import { DeploymentRequestParams, ScriptMetadata } from '../types';
import {
  getFlagValueFromArgv,
  logInfo,
  openInBrowser,
  printPreviewLinkWithASCIIArt,
} from '../utils';
import {
  getContractMetadata,
  getScriptDependencies,
  loadBroadcastArtifacts,
  loadFoundryConfig,
  resolveTargetContract,
} from '../utils/foundry';
import { checkoutToCommit, getGitMetadata, getRepoMetadata } from '../utils/git';
import {
  buildProject,
  checkRepoForUncommittedChanges,
  ensureBroadcastArtifactValidityAndContinue,
  ensureRepoIsOnCorrectCommit,
  findScriptPath,
  promptForBroadcastArtifact,
} from '../utils/import';
import { fetchChainConfig, uploadDeploymentData } from '../utils/preview-service';
import { getCLIVersion } from '../utils/version';
import { checkAuthentication } from '../utils/auth';

export const command = 'import';
export const description = `Import past deployments into a Metal preview`;

export type Params = {
  'build-options': string[];
};
export type HandlerInput = Arguments & Params;

export const builder: { [key: string]: Options } = {
  'build-options': {
    type: 'array',
    required: false,
    description: 'Parameters to be passed to the `forge build` command',
  },
};

/**
 * @dev entry point for the import command
 */
export const handler = async (yargs: HandlerInput) => {
  checkRepoForUncommittedChanges();

  const authenticationStatus = await checkAuthentication();

  const foundryConfig = loadFoundryConfig();

  const { selectedScript, artifactPath, selectedChainId } = await promptForBroadcastArtifact(
    foundryConfig,
  );

  const broadcastArtifacts = loadBroadcastArtifacts(artifactPath);

  const chainConfig = await fetchChainConfig(selectedChainId);

  const continueWithBroadcastFile = await ensureBroadcastArtifactValidityAndContinue(
    artifactPath,
    broadcastArtifacts,
    chainConfig,
  );

  // if the user doesn't want to continue with the broadcast file or it's invalid, re-run the import command
  // @alert, I am unsure if yargs injects runtime vars that could break a recursive call to `handler`
  //  let's watch for bugs around retries.
  if (!continueWithBroadcastFile) {
    handler(yargs);
    return;
  }

  // ensure the directory is on the correct commit - this may return the current commit to revert to after the import
  let returnToCommitAfterImport: string | null = await ensureRepoIsOnCorrectCommit(
    broadcastArtifacts,
  );

  // run forge build now that we're on the correct commit sha
  await buildProject();

  // search for the script file in the current directory (if necessary, prompt the user to select one)
  const pathToScript = await findScriptPath(foundryConfig, selectedScript);
  // get an array of all the solidity files that need to be uploaded
  const solidityFilePaths = [pathToScript, ...getScriptDependencies(foundryConfig, pathToScript)];
  const repoMetadata = getRepoMetadata(solidityFilePaths);

  const targetContract = resolveTargetContract(selectedScript);
  const functionName = getFlagValueFromArgv('-s') || getFlagValueFromArgv('--sig') || 'run()';
  const scriptGitMetadata = getGitMetadata(selectedScript);

  const scriptMetadata: ScriptMetadata = {
    scriptName: targetContract,
    functionName,
    filePath: selectedScript,
    broadcastArtifacts,
    ...scriptGitMetadata,
  };

  const contractMetadata = getContractMetadata(
    foundryConfig,
    scriptMetadata.broadcastArtifacts,
    solidityFilePaths,
  );

  const payload: DeploymentRequestParams = {
    prompt: 'import',
    cliVersion: getCLIVersion(),
    chainId: selectedChainId,
    repoMetadata,
    scriptMetadata,
    contractMetadata,
  };

  logInfo(`Uploading repo metadata...`);

  const authToken = authenticationStatus.isAuthenticated
    ? authenticationStatus.access_token
    : undefined;

  const deploymentId = doNotCommunicateWithPreviewService
    ? undefined
    : await uploadDeploymentData(payload, authToken);
  const metalWebUrl = `${PREVIEW_WEB_URL}/preview/${deploymentId}`;

  logInfo(`Upload Successful! 🎉\n\n`);
  printPreviewLinkWithASCIIArt(metalWebUrl);

  openInBrowser(metalWebUrl);

  if (returnToCommitAfterImport) checkoutToCommit('-', { silent: true });
};
