import { emojify } from 'node-emoji';
import chalk from 'chalk';

export const logError = (s: string) => console.log(emojify(chalk.bold.red(s)));
export const logInfo = (s: string) => console.log(emojify(chalk.bold(s)));
export const logDetail = (s: string) => console.log(emojify(chalk.dim(s)));
