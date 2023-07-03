import chalk from 'chalk';
import { HexString, SourceCodeDict } from 'index';
import { emojify } from 'node-emoji';
import { readFileSync } from 'node:fs';

export const logError = (...s: string[]) => console.log(emojify(chalk.bold.red(s.join('\n'))));
export const logInfo = (s: string) => console.log(emojify(chalk.bold(s)));
export const logWarn = (...s: string[]) =>
  console.warn(emojify(chalk.bold.yellow('⚠️ ' + s.join('\n') + ' ⚠️')));
export const logDetail = (s: string) => console.log(emojify(chalk.dim(s)));

export const exit = (...message: string[]) => {
  logError.call(this, message);
  process.exit(1);
};

export const getChainId = async (rpcUrl: string) => {
  try {
    const request = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 0 }),
    });

    const response: { jsonrpc: '2.0'; id: 0; result: HexString } = await request.json();

    return Number(response.result); // convert hex to number
  } catch (e: any) {
    exit('Error fetching chainId from RPC endpoint');
  }
};

export const replaceFlagValues = ({
  args,
  flags,
  replaceWith: replaceWith,
}: {
  args: string[];
  flags: string[];
  replaceWith: string;
}) => {
  const flagIndex = args.findIndex(arg => flags.some(alias => alias === arg));

  if (flagIndex === -1) return args;
  else return args.map((arg, index) => (index === flagIndex + 1 ? replaceWith : arg));
};

// @dev returns kv pairs of solidity file path and source code
export const loadSolidityFiles = (pathToSolc: string[]): SourceCodeDict => {
  const sourceCode = pathToSolc.reduce<{ [contractFilePath: string]: string }>(
    (sourceCodeAcc, path) => {
      try {
        const code = readFileSync(path, { encoding: 'utf-8' });
        return { ...sourceCodeAcc, [path]: code };
      } catch (e: any) {
        exit(`Could not find Solidity source file: ${path}`);
      }
    },
    {},
  );

  return sourceCode;
};
