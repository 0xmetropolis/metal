import chalk from 'chalk';
import { Abi, FoundryConfig, HexString } from 'index';
import { emojify } from 'node-emoji';
import { UUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { getOutPath, isSparseModeEnabled } from './foundry';

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

export const getConfigFromTenderlyRpc = (rpcOverride: string): { rpcUrl: string; id: UUID } => ({
  rpcUrl: rpcOverride,
  id: rpcOverride.split('/').at(-1) as UUID,
});

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

// @dev returns kv pairs of file path and source code
export const loadSolidityFiles = (pathToSolc: string[]): { [filePath: string]: string } => {
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

/**
 * @dev based on the absolute path to the solidity files in `src/`, load the metadata abi files in `out/`
 * @notice a `fullyQualifiedContractName` is the path to the solidity file concatenated with ":CONTRACT_NAME" (e.g: `contracts/MyScript.s.sol:MyCoolScript`)
 * @param pathsToSolidityFiles paths to all solidity files
 */
export const loadSolidityABIs = (foundryConfig: FoundryConfig, pathsToSolidityFiles: string[]) => {
  if (isSparseModeEnabled(foundryConfig))
    exit(
      'sparse_mode is enabled in foundry.toml, preventing artifact generation.',
      'Please disable sparse_mode and try again.',
    );

  // find the correct `out` path where the metadata files go by checking the foundry.toml
  const outPath = getOutPath(foundryConfig);

  // collect all abis from the metadata files
  const abis = pathsToSolidityFiles.reduce<{ [fullyQualifiedContractName: string]: string }>(
    (abiAcc, pathToSolidityFile) => {
      // get the file name by grabbing the last item in the path
      const fileName = pathToSolidityFile.split('/').at(-1); // e.g: /Users/.../contracts/MyContract.sol -> MyContract.sol
      const pathToMetadata = `${outPath}/${fileName}`; // e.g: out/MyContract.sol
      const files = readdirSync(pathToMetadata, { encoding: 'utf-8' }); // e.g: ['MyContract.json', 'MyContract2.json']

      // for each pathToSolc, load all child files in the `out/MyContract.sol/` directory.
      const abis = files.reduce<[string, Abi][]>((abiAcc, file) => {
        try {
          const metadataPath = `${pathToMetadata}/${file}`;
          // JSON.parse each file and return only the .abi member.
          const abi = JSON.parse(readFileSync(metadataPath, 'utf-8')).abi;
          if (!abi) throw new Error(`ABI not found for ${pathToMetadata}/${file}`);

          const contractName = file.replace('.json', '');
          const fullyQualifiedContractName = `${pathToSolidityFile}:${contractName}`;
          return [...abiAcc, [fullyQualifiedContractName, abi]];
        } catch (e: any) {
          // handle throw if any of the json is invalid / missing .abi
          exit(`Could not find ABI for ${file}`);
        }
      }, []);

      // return the abiAcc with the new abis
      return { ...abiAcc, ...Object.fromEntries(abis) };
    },
    {},
  );

  return abis;
};
