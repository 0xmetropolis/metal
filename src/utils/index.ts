import chalk from 'chalk';
import { Abi, FoundryConfig, HexString } from 'index';
import { emojify } from 'node-emoji';
import { exec, execSync } from 'node:child_process';
import { UUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { getOutPath, isSparseModeEnabled } from './foundry';
import fetch from 'node-fetch';

export const logError = (...s: string[]) =>
  console.log('\n\n\n' + emojify(chalk.bold.red(s.join('\n'))));
export const logInfo = (s: string) => console.log(emojify(chalk.bold(s)));
export const logDebug = (s: string | any) =>
  !!process.env.DEBUG &&
  console.log(chalk.yellowBright(typeof s === 'object' ? JSON.stringify(s?.message ?? s) : s));
export const logWarn = (...s: string[]) =>
  console.warn(emojify(chalk.bold.yellow(s.map(str => '⚠️ ' + str + ' ⚠️').join('\n'))));
export const logDetail = (s: string) => console.log(emojify(chalk.dim(s)));

export const exit = (...message: string[]) => {
  logError.call(this, message.join('\n'));
  process.exit(1);
};

export const getFlagValueFromArgv = (flag: string): string | undefined => {
  const flagIndex = process.argv.findIndex(arg => arg === flag);
  if (flagIndex === -1) return undefined;
  else return process.argv[flagIndex + 1];
};

export const openInBrowser = (url: string) => {
  const startScript =
    process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open';
  exec(`${startScript} "${url}"`);
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
    logDebug(e);
    exit('Error fetching chainId from RPC endpoint');
  }
};

export const getTransactionByHash = async (rpcUrl: string, txHash: string) => {
  try {
    if (typeof txHash !== 'string' || txHash.length !== 66)
      throw new Error(`Invalid transaction hash: ${txHash}`);

    const request = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 0,
      }),
    });

    const response: {
      jsonrpc: '2.0';
      id: number;
      result: {
        blockHash: HexString | null;
        blockNumber: HexString | null;
        from: HexString;
        gas: HexString;
        gasPrice: HexString;
        hash: HexString;
        input: HexString;
        nonce: HexString;
        to: HexString;
        transactionIndex: HexString;
        value: HexString;
        v: HexString;
        r: HexString;
        s: HexString;
      } | null;
    } = await request.json();

    return response.result;
  } catch (e: any) {
    logDebug(e);
    exit(`Error fetching transaction: ${txHash} from RPC endpoint`);
  }
};

export const isTxConfirmed = async (rpcUrl: string, txHash: string) => {
  const response = await getTransactionByHash(rpcUrl, txHash);
  if (response === null || response.blockNumber === null) return false;

  return true;
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
        logDebug(e);
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

  let allABIPaths: string[] = [];
  try {
    // recursively builds an array any *.sol directories
    //   (will match `out/MyContract.sol/` and `out/long/dependency/path/MyContract.sol/)`
    allABIPaths = execSync(`find ${outPath} -type d -name "**.sol"`).toString().split('\n');
  } catch (e) {
    logDebug(e);
    exit(`Error finding build metadata in the ${outPath} directory`);
  }

  // collect all abis from the metadata files
  const abis = pathsToSolidityFiles.reduce<{ [fullyQualifiedContractName: string]: string }>(
    (abiAcc, pathToSolidityFile) => {
      // get the file name by grabbing the last item in the path
      const fileName = pathToSolidityFile.split('/').at(-1); // e.g: /Users/.../contracts/MyContract.sol -> MyContract.sol

      // the path to all the contract ABIs for a given solidity file
      const fullMetadataFilDirPath = allABIPaths.find((path: string) => {
        // the directory name is the same as the solidity file name
        const fileMetadataDir = path.split('/').at(-1).toLowerCase();

        return fileMetadataDir === fileName.toLowerCase();
      });

      if (!fullMetadataFilDirPath) {
        logError(`Could not find metadata for ${fileName}`);
        // do not try and load metadata if the metadata dir
        return abiAcc;
      }

      let files: string[] = [];
      try {
        // all the child files in a sol metadata dir are contract ABIs: e.g: ['MyContract.json', 'MyContract2.json']
        files = readdirSync(fullMetadataFilDirPath, { encoding: 'utf-8' });
      } catch (e: any) {
        logDebug(e);
        logError(`Could not find metadata for ${fullMetadataFilDirPath}`);
      }

      // for each pathToSolc, load all child files in the `out/MyContract.sol/` directory.
      const abis = files.reduce<[string, Abi][]>((abiAcc, file) => {
        try {
          const metadataPath = `${fullMetadataFilDirPath}/${file}`;
          // JSON.parse each file and return only the .abi member.
          const abi = JSON.parse(readFileSync(metadataPath, 'utf-8')).abi;
          if (!abi) throw new Error(`ABI not found for ${fullMetadataFilDirPath}/${file}`);

          const contractName = file.replace('.json', '');
          const fullyQualifiedContractName = `${pathToSolidityFile}:${contractName}`;
          return [...abiAcc, [fullyQualifiedContractName, abi]];
        } catch (e: any) {
          logDebug(e);
          // handle error if any of the json is invalid / missing .abi
          logError(`Could not find ABI for ${file}`);
        }
      }, []);

      // return the abiAcc with the new abis
      return { ...abiAcc, ...Object.fromEntries(abis) };
    },
    {},
  );

  return abis;
};
