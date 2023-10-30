import { readdirSync } from 'fs';
import { logDebug, logInfo } from '.';
import { AddressConfig, ArtifactBundle } from '../types';
import { getAbiPath, metalDirExists } from './filesystem/metalDirectory';

/**
 * @dev will return a pretty-formatted (w/ keys converted to numbers or unstringified) stringified object if possible
 */
const tryPrettyStringify = (obj: any): string | undefined => {
  let pretty: string;

  try {
    // try parsing it as either an object or a string
    const stringified = JSON.stringify(typeof obj === 'string' ? JSON.parse(obj) : obj, null, 2);
    // replace any "key": with key:
    pretty = stringified.replace(/"(\w+)"\s*:/g, '$1:');
  } catch (e: any) {
    logDebug('Failed to stringify object');
    logDebug(e);
  }

  return pretty;
};

/**
 * @dev returns the object as a `export ${varName} = {obj} as const;`
 */
export const constifyObject = (varName: string, obj: string | object): string => {
  // get the pretty-formatted object as a string
  const asString = tryPrettyStringify(obj);

  return `export const ${varName} = ${asString} as const;`;
};

/**
 * @dev returns the addressConfig file as a string
 */
const codegenAddressConfig = (addresses: AddressConfig['deployments']) => {
  let addressConfig: string = '';

  addressConfig += constifyObject('deployments', addresses);

  addressConfig += `\n\n`;

  addressConfig += `export const getAddress = <
  T extends keyof typeof deployments,
  K extends keyof (typeof deployments)[T]['contracts'],
>(
  network: T,
  contractName: K,
): \`0x\${string}\` => {
  // @ts-ignore
  return deployments[network].contracts[contractName];
};
`;

  return addressConfig;
};

/**
 * @dev generates abis `as const` and an addressConfig file
 */
export const getMetalCodegenFromArtifactBundle = (artifactBundle: ArtifactBundle) => {
  const abis = Object.entries(artifactBundle.abis)
    .map(([contractName, abi]) => ({
      contractName,
      abi: constifyObject(`${contractName}Abi`, abi),
    }))
    // filter out any undefined abis
    .filter(({ abi }) => Boolean(abi));

  const addressConfig = codegenAddressConfig(artifactBundle.addresses);

  return {
    abis,
    addressConfig,
  };
};

export const logMetalDirStructure = () => {
  const dirExists = metalDirExists();
  if (!dirExists) return;

  const logColor = 'cyan';

  logInfo('metal/', logColor);
  logInfo('├── addressConfig.ts', logColor);
  logInfo('├── abis/', logColor);
  readdirSync(getAbiPath()).forEach(fileName => logInfo(`│   ├── ${fileName}`, logColor));
};
