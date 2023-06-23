import yargs = require('yargs');
import { logInfo } from '../utils';
// import { prompt as ask } from 'inquirer';
import { argv, type Options, } from 'yargs';
// import  from 'yargs/helpers';

// async function askName(): Promise<string> {
//   logInfo(':wave:  Hello stranger!');
//   const { path } = await ask([
//     {
//       type: 'input',
//       name: 'path',
//       message: "What's your name?",
//     },
//   ]);
//   return name;
// }

export const command = 'preview';
export const description = `Generate preview of transactions from your Forge script`;

export type Params = { path: string; broadcast: boolean };

export const builder: { [key: string]: Options } = {
  // $0: {
  //   default: 'preview',
  //   required: true,
  //   description: 'Path to Forge script',
  // },
  broadcast: {
    type: 'boolean',
    required: true,
    description: 'Send the transaction to the metropolis RPC',
  },
};

export async function handler({ broadcast, _: [, path] }: yargs.Arguments) {
  console.log('broadcast', broadcast);
  console.log({ path });
  logInfo(`Running Forge Script at ${path}`);

  console.log({ argv });
}

// Example:
// metro preview forge script script/test/DeployTestFxs.s.sol:DeployTestFxs --fork-url https://rpc.tenderly.co/fork/API_KEY --broadcast
