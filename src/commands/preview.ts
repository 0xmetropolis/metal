import yargs = require('yargs');
import { logError, logInfo } from '../utils';
import { type Options } from 'yargs';
import { exec, ExecException } from 'child_process';

export const command = 'preview';
export const description = `Generate preview of transactions from your Forge script`;

export type Params = { path: string; broadcast: boolean };

export const builder: { [key: string]: Options } = {
  broadcast: {
    type: 'boolean',
    required: true,
    description: 'Send the transaction to the metropolis RPC',
  },
};

export async function handler({ broadcast, _: [, path] }: yargs.Arguments) {
  logInfo(`Running Forge Script at ${path}...`);
  const foundryArguments = process.argv.slice(3).join(' ');

  // TODO: if exists replace --rpc-url, else add it
  await new Promise((resolve, reject) => {
    exec(`forge script ${foundryArguments}`, (error, stdout, stderr) => {
      if (error) {
        const message = processForgeError(error);
        logError('\n' + message + '\n');
        reject();
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      resolve(stdout);
    });
  });
}

function processForgeError({ message }: ExecException) {
  if (message.includes('error trying to connect'))
    return 'Could not connect to the RPC, check your internet connection';
  return message;
  // TODO look into yargs reject?
}
