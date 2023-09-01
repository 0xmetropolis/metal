import { DeploymentRequestParams, PreviewRequestParams } from 'index';
import fetch from 'node-fetch';
import { UUID } from 'node:crypto';
import { type Arguments, type Options } from 'yargs';
import {
    DEFAULT_PRIVATE_KEY,
    FORGE_FORK_ALIASES,
    FORGE_WALLET_OPTIONS,
    PREVIEW_SERVICE_URL,
    PREVIEW_WEB_URL,
    SUPPORTED_CHAINS,
    doNotCommunicateWithPreviewService
} from '../constants';
import {
    exit,
    getFlagValueFromArgv,
    logDebug,
    logInfo,
    logWarn,
    openInBrowser
} from '../utils';
import {
    getContractMetadata,
    getScriptDependencies,
    getScriptMetadata,
    loadFoundryConfig,
    normalizeForgeScriptPath,
    runForgeScript,
} from '../utils/foundry';
import { getRepoMetadata } from '../utils/git';
import { getChainConfig } from '../utils/preview-service';
import { getCLIVersion } from '../utils/version';

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

export const uploadDeploymentData = async (payload: PreviewRequestParams): Promise<UUID> => {
  try {
    const response = await fetch(`${PREVIEW_SERVICE_URL}/deploy`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.status !== 200) {
      const res = await response.json();
      logDebug(res);

      exit(
        `Error received from Metropolis! (status ${response.status})`,
        '===========================',
        res.message ?? response.statusText,
      );
    }

    const res: { id: UUID } = await response.json();
    return res.id;
  } catch (e: any) {
    logDebug(e);
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
  } = yargs;

  const rpcOverrideFlagIdx = process.argv.findIndex(arg => FORGE_FORK_ALIASES.includes(arg));
  const userHasSpecifiedRPC = rpcOverrideFlagIdx !== -1;

  const rpcUrl = doNotCommunicateWithPreviewService
    ? undefined
    : !!userHasSpecifiedRPC
    ? getFlagValueFromArgv(process.argv[rpcOverrideFlagIdx + 1])
    : (await getChainConfig(chainId)).rpcUrl;

  logInfo(`Loading foundry.toml...`);
  const foundryConfig = loadFoundryConfig();

  logInfo(`Running Forge Script at ${forgeScriptPath}...`);
  const foundryArguments = configureForgeScriptInputs({
    rpcUrl,
  });

  await runForgeScript(foundryArguments);
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
  const scriptMetadata = await getScriptMetadata(foundryConfig, chainId, forgeScriptPath);

  logInfo(`Getting contract metadata...`);
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

  const deploymentId =  doNotCommunicateWithPreviewService ? undefined : await uploadDeploymentData(payload);
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
