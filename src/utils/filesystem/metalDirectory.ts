import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'node:path';
import { cwd } from 'process';
import * as typescript from 'ts-node';
import { ADDRESS_CONFIG_FILE_NAME, METAL_DIR_NAME } from '../../constants';
import { AddressConfig } from '../../types';
import { getFilestoreDir } from './filestore';

export const getMetalDirPath = () => path.join(cwd(), METAL_DIR_NAME);

export const getAbiPath = () => path.join(getMetalDirPath(), 'abis');

export const metalDirExists = () => existsSync(getMetalDirPath());

/**
 * @dev creates the metal/ dir and the metal/abis/ subdir if they do not exist
 */
export const bootstrapMetalDirectory = () => {
  if (!metalDirExists()) {
    // create the root folder
    mkdirSync(getMetalDirPath());
    // create the abi folder
    mkdirSync(getAbiPath());
  }
};

export const writeTSAbiToMetalDir = (name: string, abi: string | Buffer) => {
  if (!metalDirExists()) throw new Error('metal/ directory does not exist!');

  writeFileSync(path.join(getAbiPath(), `${name}.ts`), abi);
};

export const writeAddressConfigToMetalDir = (addressConfig: string | Buffer) => {
  if (!metalDirExists()) throw new Error('metal/ directory does not exist!');

  writeFileSync(path.join(getMetalDirPath(), ADDRESS_CONFIG_FILE_NAME), addressConfig);
};

/**
 * TODO: this is super sloppy - https://linear.app/metropolis/issue/MP-500/fix-properly-import-addressconfigts
 * @throws when the addressConfig.ts file is invalid
 */
export const loadAddressConfig = async () => {
  // check if the addressFile exists
  const addressConfigExists = existsSync(path.join(getMetalDirPath(), ADDRESS_CONFIG_FILE_NAME));
  if (!addressConfigExists) return;

  const file = readFileSync(path.join(getMetalDirPath(), ADDRESS_CONFIG_FILE_NAME)).toString();
  const transpiledFile = typescript
    .create({ transpileOnly: true })
    .compile(file, ADDRESS_CONFIG_FILE_NAME);

  const tempFilePath = path.join(getFilestoreDir(), 'temp.js');
  writeFileSync(tempFilePath, transpiledFile);

  // import the address config as a js module
  const addressConfig: AddressConfig = await import(tempFilePath);
  rmSync(tempFilePath);

  // validate the addressConfig
  return addressConfig;
};

/**
 * @dev gets the previously deployed addresses from the metal directory if exists
 */
export const getDeployedAddresses = async (): Promise<AddressConfig['deployments'] | undefined> => {
  const addressConfig = await loadAddressConfig();
  if (!addressConfig) return undefined;

  return addressConfig.deployments;
};
