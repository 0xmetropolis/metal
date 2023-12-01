import AdmZip from 'adm-zip';
import { ArtifactBundle } from '../types';
import { exit, logDebug } from '../utils';
import {
  bootstrapMetalDirectory,
  getDeployedAddresses,
  metalDirExists,
  writeAddressConfigToMetalDir,
  writeTSAbiToMetalDir,
} from './filesystem/metalDirectory';

export const decompressArtifactZip = async (zipInstance: AdmZip): Promise<ArtifactBundle> => {
  const ABI_DIRNAME = 'abis/';
  // find all the abi files in the zip by looking in the abis/* directory
  const abiEntries = zipInstance
    .getEntries()
    .filter(
      ({ entryName: filePathName, isDirectory }) =>
        filePathName.startsWith(ABI_DIRNAME) && !isDirectory,
    );

  // unzip the abis
  let abis: ArtifactBundle['abis'];
  try {
    abis = abiEntries.reduce((acc, { entryName: filePathName }) => {
      const fileName = filePathName.replace(ABI_DIRNAME, '').replace('.json', '');
      const fileContents = zipInstance.readAsText(filePathName);
      const abi = JSON.parse(fileContents);

      return {
        ...acc,
        [fileName]: abi,
      };
    }, {});
  } catch (e: any) {
    logDebug(e);

    await exit('Failed to parse ABI files from artifact bundle!');
  }

  // unzip the addresses.json
  let addressesJson: ArtifactBundle['addresses'];
  try {
    const fileContents = zipInstance.readAsText('addresses.json');
    addressesJson = JSON.parse(fileContents);
  } catch (e: any) {
    logDebug(e);

    await exit('Failed to parse addresses.json from artifact bundle!');
  }

  return { abis, addresses: addressesJson };
};

export const tryLoadPreviousAddresses = async () => {
  const dirExists = metalDirExists();
  if (!dirExists) return undefined;

  let previousAddresses;
  try {
    previousAddresses = await getDeployedAddresses();
  } catch (e: any) {
    logDebug('Cannot find previous addresses');
    logDebug(e);
  }

  return previousAddresses;
};

export const writeCodegenToDisk = ({
  abis,
  addressConfig,
}: {
  abis: { abi: string; contractName: string }[];
  addressConfig: string;
}) => {
  // init the metal directories if no exist
  bootstrapMetalDirectory();

  // write each abi into the abi/ folder
  abis.forEach(({ contractName, abi }) => writeTSAbiToMetalDir(contractName, abi));

  // write the addressConfig
  writeAddressConfigToMetalDir(addressConfig);
};
