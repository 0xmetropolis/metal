import { DeploymentRequestParams, Network } from 'index';
import { type Arguments, type Options } from 'yargs';
import {
  FORGE_FORK_ALIASES,
  PREVIEW_WEB_URL,
  SUPPORTED_CHAINS,
  doNotCommunicateWithPreviewService,
} from '../constants';
import { exit, getFlagValueFromArgv, logDebug, logInfo, openInBrowser } from '../utils';
import {
  getContractMetadata,
  getScriptDependencies,
  getScriptMetadata,
  loadFoundryConfig,
  normalizeForgeScriptPath,
  runForgeScript,
} from '../utils/foundry';
import { getRepoMetadata } from '../utils/git';
import { ChainConfig, fetchChainConfig, uploadDeploymentData } from '../utils/preview-service';
import { getCLIVersion } from '../utils/version';
import inquirer = require('inquirer');

export const command = 'deploy';
export const description = `Run your deployments against a live network and generate a Metropolis preview`;

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
  // pull anything after `metro preview <path>` as forge arguments
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

  // @dev arg 0 is the command name: e.g: `preview`
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
    cliVersion,
    chainId,
    repoMetadata,
    scriptMetadata,
    contractMetadata,
  };

  const deploymentId = doNotCommunicateWithPreviewService
    ? undefined
    : await uploadDeploymentData(payload);
  const metropoliswebUrl = `${PREVIEW_WEB_URL}/preview/${deploymentId}`;

  logInfo(`Deployment successful! 🎉\n\n`);
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

${metropoliswebUrl}
__________________  ___________    __________________    ____________
  `);

  openInBrowser(metropoliswebUrl);
};
