import yargs = require('yargs');
import { logError, logInfo, logWarn } from '../utils';
import { type Options } from 'yargs';
import { ExecException, spawn } from 'child_process';
import { METRO_DEPLOY_URL } from '../constants';

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

function processForgeError({ message }: ExecException) {
  if (message.includes('error trying to connect'))
    return 'Could not connect to the RPC, check your internet connection';
  return message;
}

// @dev replaces any forge fork aliases with the METRO_DEPLOY_URL
function configureForgeInputs() {
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
}

// @dev returns the terminal status code of the forge script
// @throws if the forge script fails
async function runForgeScript(scriptArgs: string[]) {
  return await new Promise<number>((resolve, reject) => {
    const forge_script = spawn(`forge script ${scriptArgs.join(' ')}`, { shell: true });

    // log any errors
    forge_script.on('error', err => {
      logError('\n' + processForgeError(err) + '\n');
      reject();
    });
    // log any forge output
    forge_script.stdout.on('data', logInfo);
    // on completion, resolve the promise
    forge_script.on('close', resolve); // TODO: code => (code === 0 ? resolve(code) : reject())
  });
}

// @dev entry point for the preview command
export async function handler({ _: [, path] }: yargs.Arguments) {
  logInfo(`Running Forge Script at ${path}...`);

  const foundryArguments = configureForgeInputs();
  await runForgeScript(foundryArguments);
}
