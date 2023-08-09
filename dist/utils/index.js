"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSolidityABIs = exports.loadSolidityFiles = exports.replaceFlagValues = exports.getConfigFromTenderlyRpc = exports.getChainId = exports.openInBrowser = exports.getFlagValueFromArgv = exports.exit = exports.logDetail = exports.logWarn = exports.logDebug = exports.logInfo = exports.logError = void 0;
const chalk_1 = require("chalk");
const node_emoji_1 = require("node-emoji");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const foundry_1 = require("./foundry");
const logError = (...s) => console.log('\n\n\n' + (0, node_emoji_1.emojify)(chalk_1.default.bold.red(s.join('\n'))));
exports.logError = logError;
const logInfo = (s) => console.log((0, node_emoji_1.emojify)(chalk_1.default.bold(s)));
exports.logInfo = logInfo;
const logDebug = (s) => !!process.env.DEBUG &&
    console.log((0, node_emoji_1.emojify)(chalk_1.default.yellowBright(typeof s === 'object' ? JSON.stringify(s, null, 2) : s)));
exports.logDebug = logDebug;
const logWarn = (...s) => console.warn((0, node_emoji_1.emojify)(chalk_1.default.bold.yellow(s.map(str => '⚠️ ' + str + ' ⚠️').join('\n'))));
exports.logWarn = logWarn;
const logDetail = (s) => console.log((0, node_emoji_1.emojify)(chalk_1.default.dim(s)));
exports.logDetail = logDetail;
const exit = (...message) => {
    exports.logError.call(this, message.join('\n'));
    process.exit(1);
};
exports.exit = exit;
const getFlagValueFromArgv = (flag) => {
    const flagIndex = process.argv.findIndex(arg => arg === flag);
    if (flagIndex === -1)
        return undefined;
    else
        return process.argv[flagIndex + 1];
};
exports.getFlagValueFromArgv = getFlagValueFromArgv;
const openInBrowser = (url) => {
    const startScript = process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open';
    (0, node_child_process_1.exec)(`${startScript} "${url}"`);
};
exports.openInBrowser = openInBrowser;
const getChainId = (rpcUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = yield fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 0 }),
        });
        const response = yield request.json();
        return Number(response.result); // convert hex to number
    }
    catch (e) {
        (0, exports.exit)('Error fetching chainId from RPC endpoint');
    }
});
exports.getChainId = getChainId;
const getConfigFromTenderlyRpc = (rpcOverride) => ({
    rpcUrl: rpcOverride,
    id: rpcOverride.split('/').at(-1),
});
exports.getConfigFromTenderlyRpc = getConfigFromTenderlyRpc;
const replaceFlagValues = ({ args, flags, replaceWith: replaceWith, }) => {
    const flagIndex = args.findIndex(arg => flags.some(alias => alias === arg));
    if (flagIndex === -1)
        return args;
    else
        return args.map((arg, index) => (index === flagIndex + 1 ? replaceWith : arg));
};
exports.replaceFlagValues = replaceFlagValues;
// @dev returns kv pairs of file path and source code
const loadSolidityFiles = (pathToSolc) => {
    const sourceCode = pathToSolc.reduce((sourceCodeAcc, path) => {
        try {
            const code = (0, node_fs_1.readFileSync)(path, { encoding: 'utf-8' });
            return Object.assign(Object.assign({}, sourceCodeAcc), { [path]: code });
        }
        catch (e) {
            (0, exports.exit)(`Could not find Solidity source file: ${path}`);
        }
    }, {});
    return sourceCode;
};
exports.loadSolidityFiles = loadSolidityFiles;
/**
 * @dev based on the absolute path to the solidity files in `src/`, load the metadata abi files in `out/`
 * @notice a `fullyQualifiedContractName` is the path to the solidity file concatenated with ":CONTRACT_NAME" (e.g: `contracts/MyScript.s.sol:MyCoolScript`)
 * @param pathsToSolidityFiles paths to all solidity files
 */
const loadSolidityABIs = (foundryConfig, pathsToSolidityFiles) => {
    if ((0, foundry_1.isSparseModeEnabled)(foundryConfig))
        (0, exports.exit)('sparse_mode is enabled in foundry.toml, preventing artifact generation.', 'Please disable sparse_mode and try again.');
    // find the correct `out` path where the metadata files go by checking the foundry.toml
    const outPath = (0, foundry_1.getOutPath)(foundryConfig);
    // collect all abis from the metadata files
    const abis = pathsToSolidityFiles.reduce((abiAcc, pathToSolidityFile) => {
        // get the file name by grabbing the last item in the path
        const fileName = pathToSolidityFile.split('/').at(-1); // e.g: /Users/.../contracts/MyContract.sol -> MyContract.sol
        const pathToMetadata = `${outPath}/${fileName}`; // e.g: out/MyContract.sol
        const files = (0, node_fs_1.readdirSync)(pathToMetadata, { encoding: 'utf-8' }); // e.g: ['MyContract.json', 'MyContract2.json']
        // for each pathToSolc, load all child files in the `out/MyContract.sol/` directory.
        const abis = files.reduce((abiAcc, file) => {
            try {
                const metadataPath = `${pathToMetadata}/${file}`;
                // JSON.parse each file and return only the .abi member.
                const abi = JSON.parse((0, node_fs_1.readFileSync)(metadataPath, 'utf-8')).abi;
                if (!abi)
                    throw new Error(`ABI not found for ${pathToMetadata}/${file}`);
                const contractName = file.replace('.json', '');
                const fullyQualifiedContractName = `${pathToSolidityFile}:${contractName}`;
                return [...abiAcc, [fullyQualifiedContractName, abi]];
            }
            catch (e) {
                // handle throw if any of the json is invalid / missing .abi
                (0, exports.exit)(`Could not find ABI for ${file}`);
            }
        }, []);
        // return the abiAcc with the new abis
        return Object.assign(Object.assign({}, abiAcc), Object.fromEntries(abis));
    }, {});
    return abis;
};
exports.loadSolidityABIs = loadSolidityABIs;
//# sourceMappingURL=index.js.map