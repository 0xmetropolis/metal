import { rm } from 'node:fs/promises';
import { Arguments, Options } from 'yargs';
import { ID_TOKEN_FILE } from '../constants';
import { logInfo } from '../utils';
import { deleteFromFilestore, getFilestoreDir, isInFilestore } from '../utils/filestore';

export const command = 'reset';
// this command is hidden from the help menu
export const description = false;

export type Params = {};
export type HandlerInput = Arguments & Params;

export const builder: { [key: string]: Options } = {
  auth: {
    type: 'boolean',
    required: false,
    description: 'Reset only the authentication cache',
  },
};

/**
 * @dev entry point for the reset command
 * @param auth the user can choose to reset only authentication
 */
export const handler = async ({ auth }: HandlerInput) => {
  if (auth) {
    logInfo('Resetting authentication cache...');

    if (isInFilestore(ID_TOKEN_FILE)) deleteFromFilestore(ID_TOKEN_FILE);
    return;
  }

  logInfo('Resetting entire cache...');
  await rm(getFilestoreDir(), { recursive: true });
};
