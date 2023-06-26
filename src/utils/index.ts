import chalk from 'chalk';
import { emojify } from 'node-emoji';
import { readFileSync } from 'node:fs';

export const logError = (...s: string[]) => console.log(emojify(chalk.bold.red(s.join('\n'))));
export const logInfo = (s: string) => console.log(emojify(chalk.bold(s)));
export const logWarn = (...s: string[]) =>
  console.warn(emojify(chalk.bold.yellow('⚠️ ' + s.join('\n') + ' ⚠️')));
export const logDetail = (s: string) => console.log(emojify(chalk.dim(s)));

// @dev returns kv pairs of solidity file path and source code
export const loadSolidityFiles = (pathToSolc: string[]): { [pathToSolc: string]: string } => {
  const sourceCode = pathToSolc.reduce<{ [contractFilePath: string]: string }>(
    (sourceCodeAcc, path) => {
      try {
        const code = readFileSync(path, { encoding: 'utf-8' });
        return { ...sourceCodeAcc, [path]: code };
      } catch (e: any) {
        logError(`Could not find Solidity source file: ${path}`);
        process.exit(1);
      }
    },
    {},
  );

  return sourceCode;
};
