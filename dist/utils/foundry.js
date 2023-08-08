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
exports.getScriptMetadata = exports.getContractMetadata = exports.runForgeScript = exports.getScriptDependencies = exports.loadSolidityFilesCache = exports.getCachePath = exports.getBroadcastArtifacts = exports.isSparseModeEnabled = exports.getOutPath = exports.getBroadcastPath = exports.getFoundryConfigValue = exports.loadFoundryConfig = exports.normalizeForgeScriptPath = exports.processForgeError = void 0;
const child_process_1 = require("child_process");
const node_fs_1 = require("node:fs");
const toml = require("toml");
const _1 = require(".");
const git_1 = require("./git");
const processForgeError = ({ message }) => {
    if (message.includes('connect error'))
        return 'Could not connect to the RPC, check your internet connection';
    return message;
};
exports.processForgeError = processForgeError;
const convertFullyQualifiedPathToRelativePath = (forgeScriptPath) => {
    const path = forgeScriptPath.split(':')[0];
    if (!path)
        throw new Error('Tried converting non-fully qualified path to relative path');
    return path;
};
// @dev checks for the use of "fully qualified" src/script/MyScript.s.sol:CONTRACT_NAME syntax and formats input
const normalizeForgeScriptPath = (forgeScriptPath) => {
    const isUsingFullyQualifiedPath = forgeScriptPath.includes(':');
    return isUsingFullyQualifiedPath
        ? convertFullyQualifiedPathToRelativePath(forgeScriptPath)
        : forgeScriptPath;
};
exports.normalizeForgeScriptPath = normalizeForgeScriptPath;
const loadFoundryConfig = () => {
    let foundryToml_raw;
    try {
        foundryToml_raw = (0, node_fs_1.readFileSync)('foundry.toml', { encoding: 'utf-8' });
    }
    catch (e) {
        (0, _1.exit)('Could not find foundry.toml, ensure you in the root directory of a Foundry project');
    }
    let foundryConfig;
    try {
        foundryConfig = toml.parse(foundryToml_raw);
    }
    catch (e) {
        (0, _1.exit)('Could not parse foundry.toml, ensure it is valid TOML', 'see https://github.com/foundry-rs/foundry/tree/master/config for more information.');
    }
    return foundryConfig;
};
exports.loadFoundryConfig = loadFoundryConfig;
const getFoundryConfigValue = (foundryConfig, setting) => {
    var _a, _b, _c;
    const profileENV = process.env.FOUNDRY_PROFILE;
    const profileName = profileENV || 'default';
    const settingValue = (_c = (_b = (_a = foundryConfig.profile[profileName]) === null || _a === void 0 ? void 0 : _a[setting]) !== null && _b !== void 0 ? _b : foundryConfig.profile['default'][setting]) !== null && _c !== void 0 ? _c : undefined;
    return settingValue;
};
exports.getFoundryConfigValue = getFoundryConfigValue;
// @dev given the foundry config and the env vars, returns the path to the broadcast/ dir
const getBroadcastPath = (foundryConfig) => { var _a; return (_a = (0, exports.getFoundryConfigValue)(foundryConfig, 'broadcast')) !== null && _a !== void 0 ? _a : 'broadcast'; };
exports.getBroadcastPath = getBroadcastPath;
// @dev given the foundry config and the env vars, returns the path to the out/ dir
const getOutPath = (foundryConfig) => { var _a; return (_a = (0, exports.getFoundryConfigValue)(foundryConfig, 'out')) !== null && _a !== void 0 ? _a : 'out'; };
exports.getOutPath = getOutPath;
const isSparseModeEnabled = (foundryConfig) => { var _a; return (_a = (0, exports.getFoundryConfigValue)(foundryConfig, 'sparse_mode')) !== null && _a !== void 0 ? _a : false; };
exports.isSparseModeEnabled = isSparseModeEnabled;
// @dev loads the run-latest.json from the latest broadcast at METRO_DEPLOY_URL
const getBroadcastArtifacts = (foundryConfig, chainId, forgeScriptPath) => __awaiter(void 0, void 0, void 0, function* () {
    const scriptName = forgeScriptPath.split('/').at(-1);
    const broadcastPath = (0, exports.getBroadcastPath)(foundryConfig);
    let runLatest_raw;
    try {
        runLatest_raw = (0, node_fs_1.readFileSync)(`${broadcastPath}/${scriptName}/${chainId}/run-latest.json`, {
            encoding: 'utf-8',
        });
    }
    catch (e) {
        (0, _1.exit)('Could not load run-latest.json');
    }
    let broadcastArtifacts;
    try {
        broadcastArtifacts = JSON.parse(runLatest_raw);
    }
    catch (e) {
        (0, _1.exit)('run-latest.json is corrupt / invalid JSON');
    }
    if (broadcastArtifacts.transactions.length === 0)
        (0, _1.exit)(`Cannot preview ${scriptName} as it generated 0 transactions`);
    return broadcastArtifacts;
});
exports.getBroadcastArtifacts = getBroadcastArtifacts;
// @dev given the foundry config and the current env vars, returns the path to the cache/ dir
const getCachePath = ({ profile }) => {
    var _a, _b, _c, _d, _e;
    const profileENV = process.env.FOUNDRY_PROFILE;
    const profileName = profileENV || 'default';
    const isCacheDisabled = ((_a = profile[profileName]) === null || _a === void 0 ? void 0 : _a.cache) === false || ((_b = profile['default']) === null || _b === void 0 ? void 0 : _b.cache) === false;
    if (isCacheDisabled)
        (0, _1.exit)('Caching is disabled, please set `cache = true` in your foundry.toml');
    const cachePath = (_e = (_d = (_c = profile[profileName]) === null || _c === void 0 ? void 0 : _c.cache_path) !== null && _d !== void 0 ? _d : profile['default'].cache_path) !== null && _e !== void 0 ? _e : 'cache';
    return cachePath;
};
exports.getCachePath = getCachePath;
const loadSolidityFilesCache = (foundryConfig) => {
    const cachePath = (0, exports.getCachePath)(foundryConfig);
    let filesCache_raw;
    try {
        filesCache_raw = (0, node_fs_1.readFileSync)(`${cachePath}/solidity-files-cache.json`, {
            encoding: 'utf-8',
        });
    }
    catch (e) {
        (0, _1.exit)('Could not find solidity-files-cache.json', e.message);
    }
    let filesCache;
    try {
        filesCache = JSON.parse(filesCache_raw);
    }
    catch (e) {
        (0, _1.exit)('Could not parse solidity-files-cache.json, ensure it is valid JSON');
    }
    return filesCache;
};
exports.loadSolidityFilesCache = loadSolidityFilesCache;
// @dev loads the solidity-files-cache.json and finds the relative paths to the dependencies
const getScriptDependencies = (foundryConfig, forgeScriptPath) => {
    const filesCache = (0, exports.loadSolidityFilesCache)(foundryConfig);
    if (filesCache.files[forgeScriptPath] === undefined) {
        (0, _1.exit)(`Could not find ${forgeScriptPath} in solidity-files-cache.json, ensure it is a valid forge script`);
    }
    if (filesCache._format !== 'ethers-rs-sol-cache-3')
        (0, _1.logWarn)('Unexpected solidity-files-cache format, failure may occur');
    return filesCache.files[forgeScriptPath].imports;
};
exports.getScriptDependencies = getScriptDependencies;
// @dev returns the terminal status code of the forge script
// @throws if the forge script fails
const runForgeScript = (scriptArgs) => __awaiter(void 0, void 0, void 0, function* () {
    return yield new Promise((resolve, reject) => {
        const clonedEnv = Object.assign({}, process.env);
        const forge_script = (0, child_process_1.spawn)(`forge script ${scriptArgs.join(' ')}`, {
            shell: true,
            stdio: 'inherit',
            env: clonedEnv,
        });
        // log any errors
        forge_script.on('error', err => {
            (0, _1.logError)('\n' + (0, exports.processForgeError)(err) + '\n');
            reject();
        });
        // on completion, resolve or reject the promise
        forge_script.on('close', (code, signal) => {
            if (code === 0)
                resolve(code);
            else {
                (0, _1.logError)('\n' + 'Forge script failed' + '\n');
                reject(signal);
            }
        });
    });
});
exports.runForgeScript = runForgeScript;
const getContractMetadata = (foundryConfig, solidityFilePaths) => {
    const abis = (0, _1.loadSolidityABIs)(foundryConfig, solidityFilePaths);
    const contractMetadata = Object.entries(abis).reduce((acc, [fullyQualifiedName, abi]) => {
        const [filePath, name] = fullyQualifiedName.split(':');
        const metadata = { name, filePath, fullyQualifiedName, abi };
        return [...acc, metadata];
    }, []);
    return contractMetadata;
};
exports.getContractMetadata = getContractMetadata;
const resolveTargetContract = (forgeScriptPath) => {
    const [scriptPath, maybeContractName] = forgeScriptPath.split(':');
    if (maybeContractName)
        return maybeContractName;
    if (process.argv.includes('--tc') || process.argv.includes('--target-contract'))
        return (0, _1.getFlagValueFromArgv)('--tc') || (0, _1.getFlagValueFromArgv)('--target-contract');
    // Use the file name as the script name, as that's probably correct
    return scriptPath.split('/').at(-1).split('.')[0];
};
const getScriptMetadata = (foundryConfig, chainId, forgeScriptPath) => __awaiter(void 0, void 0, void 0, function* () {
    const [scriptPath] = forgeScriptPath.split(':');
    const targetContract = resolveTargetContract(forgeScriptPath);
    const functionName = (0, _1.getFlagValueFromArgv)('-s') || (0, _1.getFlagValueFromArgv)('--sig') || 'run()';
    const scriptGitMetadata = (0, git_1.getGitMetadata)(scriptPath);
    const broadcastArtifacts = yield (0, exports.getBroadcastArtifacts)(foundryConfig, chainId, scriptPath);
    return Object.assign({ scriptName: targetContract, functionName, filePath: forgeScriptPath, broadcastArtifacts }, scriptGitMetadata);
});
exports.getScriptMetadata = getScriptMetadata;
//# sourceMappingURL=foundry.js.map