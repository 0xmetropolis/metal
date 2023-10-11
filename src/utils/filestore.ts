import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'node:path';
import { CachedFile, FILESTORE_DIR, ID_TOKEN_FILE } from '../constants';
import { CachedTokenSet } from './auth';

/**
 * @dev a set of functions to interact with the __metal_data cache system
 */

const getRootDir = () => join(__dirname, '..');

export const getFilestoreDir = () => join(getRootDir(), FILESTORE_DIR);

const createFilestoreIfNoExist = () => {
  const rootDir = getRootDir();
  const filestoreExists = existsSync(join(rootDir, FILESTORE_DIR));
  if (!filestoreExists) mkdirSync(join(rootDir, FILESTORE_DIR));
};

export const isInFilestore = (filename: CachedFile) =>
  existsSync(join(__dirname, '..', FILESTORE_DIR, filename));

export const loadFromFilestore = (filename: CachedFile) => {
  createFilestoreIfNoExist();

  return readFileSync(join(getFilestoreDir(), filename), { encoding: 'utf-8' });
};

export const saveToFilestore = (filename: CachedFile, data: any) => {
  createFilestoreIfNoExist();

  writeFileSync(join(getFilestoreDir(), filename), data);
};

export const deleteFromFilestore = (filename: CachedFile) => {
  createFilestoreIfNoExist();

  rmSync(join(getFilestoreDir(), filename));
};

export const idTokenExists = () => isInFilestore(ID_TOKEN_FILE);

// save the id token to the local filesystem (in dist/)
export const saveIdToken = (idToken: CachedTokenSet) =>
  saveToFilestore(ID_TOKEN_FILE, JSON.stringify(idToken, null, 2));
