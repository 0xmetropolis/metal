import { type Arguments, type Options } from 'yargs';
import { METRO_DEPLOY_URL } from '../constants';
import { loadSolidityFiles, logInfo, logWarn } from '../utils';
import { getScriptDependencies, loadFoundryConfig, runForgeScript } from '../utils/foundry';

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

  console.log(Object.keys(sourceCode));
};
