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
exports.handler = exports.sendDataToPreviewService = exports.configureForgeScriptInputs = exports.builder = exports.description = exports.command = void 0;
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const foundry_1 = require("../utils/foundry");
const git_1 = require("../utils/git");
const preview_service_1 = require("../utils/preview-service");
const assert = require("node:assert");
const version_1 = require("../utils/version");
exports.command = 'preview';
exports.description = `Generate preview of transactions from your Forge script`;
exports.builder = {
    broadcast: {
        type: 'boolean',
        required: true,
        description: 'Send the transaction to the metropolis RPC',
    },
    'chain-id': {
        type: 'number',
        required: true,
        description: 'The chain id of the network you wish to preview',
    },
    'UNSAFE-RPC-OVERRIDE': {
        type: 'string',
        required: false,
        description: 'DEV-ONLY!: Specify an RPC override for the `forge script` command',
    },
};
function validateInputs({ _: [, scriptPath], 'chain-id': chainId }) {
    const cliInput = process.argv.slice(3);
    const rpcIndex = cliInput.findIndex(arg => constants_1.FORGE_FORK_ALIASES.some(alias => alias === arg));
    if (rpcIndex !== -1)
        (0, utils_1.logWarn)('You have specified a custom RPC', 'This will be ignored and transactions will be sent to the Metropolis RPC');
    if (!scriptPath || !scriptPath.includes('.sol'))
        (0, utils_1.exit)('You must specify a solidity script to preview');
    if (!constants_1.SUPPORTED_CHAINS.includes(chainId))
        (0, utils_1.exit)(`Chain Id ${chainId} is not supported`);
}
// @dev pulls any args from process.argv and replaces any fork-url aliases with the preview-service's fork url
const configureForgeScriptInputs = ({ rpcUrl }) => {
    // pull anything after `metro preview <path>` as forge arguments
    let forgeArguments = process.argv.slice(3);
    forgeArguments = forgeArguments.map(arg => arg.includes('(') && arg.includes(')') ? `"${arg}"` : arg);
    const UNSAFERpcOverrideIndex = forgeArguments.findIndex(arg => arg === constants_1.RPC_OVERRIDE_FLAG);
    // if the developer has specified an rpc override, we need to remove that flag and not pass it to forge
    const userHasSpecifiedUNSAFEOverrideRPC = UNSAFERpcOverrideIndex !== -1;
    if (userHasSpecifiedUNSAFEOverrideRPC)
        forgeArguments = forgeArguments.filter((_, argIndex) => argIndex !== UNSAFERpcOverrideIndex && argIndex !== UNSAFERpcOverrideIndex + 1);
    const rpcIndex = forgeArguments.findIndex(arg => constants_1.FORGE_FORK_ALIASES.some(alias => alias === arg));
    const userHasSpecifiedRPC = rpcIndex !== -1;
    if (userHasSpecifiedRPC)
        forgeArguments = (0, utils_1.replaceFlagValues)({
            args: forgeArguments,
            flags: constants_1.FORGE_FORK_ALIASES,
            replaceWith: rpcUrl,
        });
    else
        forgeArguments = [...forgeArguments, '--rpc-url', rpcUrl];
    // if a user setup the script to use a private key / wallet store
    const userHasSpecifiedWalletOpts = forgeArguments.some(arg => constants_1.FORGE_WALLET_OPTIONS.includes(arg));
    // put the default account in there so they can visualize
    if (!userHasSpecifiedWalletOpts) {
        (0, utils_1.logWarn)('No private key specified.', 'Simulating default account 0');
        forgeArguments = [...forgeArguments, '--private-key', constants_1.DEFAULT_PRIVATE_KEY];
    }
    // const argsWithChainId = replaceFlagValues({
    //   args: argsWithRPCUrl,
    //   flags: ['--chain-id'],
    //   replaceWith: CHAIN_ID_OVERRIDE.toString(),
    // });
    forgeArguments = [...forgeArguments, '--slow'];
    return forgeArguments;
};
exports.configureForgeScriptInputs = configureForgeScriptInputs;
/// @dev sanity checks while we scaffold the app
function devModeSanityChecks({ scriptMetadata, chainId, contractMetadata, repoMetadata, }) {
    contractMetadata.forEach(({ abi, name, filePath, fullyQualifiedName }) => {
        assert(!!abi);
        assert(!!name);
        assert(!!filePath);
        assert(!!fullyQualifiedName);
    });
    assert(typeof chainId === 'number');
    assert(repoMetadata.remoteUrl && repoMetadata.repoCommitSHA && repoMetadata.repositoryName);
    assert(scriptMetadata.filePath && scriptMetadata.broadcastArtifacts && scriptMetadata.functionName);
}
const sendDataToPreviewService = (payload, forkId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield fetch(`${constants_1.PREVIEW_SERVICE_URL}/preview/${forkId}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (response.status !== 200) {
            const res = yield response.json();
            (0, utils_1.logDebug)(res);
            (0, utils_1.exit)(`Error received from Metropolis! (status ${response.status})`, '===========================', (_a = res.message) !== null && _a !== void 0 ? _a : response.statusText);
        }
        const res = yield response.json();
        return res.id;
    }
    catch (e) {
        (0, utils_1.logDebug)(e);
        (0, utils_1.exit)('Error connecting to preview service', e.message);
    }
});
exports.sendDataToPreviewService = sendDataToPreviewService;
// @dev entry point for the preview command
const handler = (yargs) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    validateInputs(yargs);
    // @dev arg 0 is the command name: e.g: `preview`
    const { _: [, forgeScriptPath], 'chain-id': chainId, 'UNSAFE-RPC-OVERRIDE': rpcOverride, } = yargs;
    const { rpcUrl, id: forkId } = constants_1.doNotCommunicateWithPreviewService
        ? { id: undefined, rpcUrl: undefined }
        : !!rpcOverride
            ? (0, utils_1.getConfigFromTenderlyRpc)(rpcOverride)
            : yield (0, preview_service_1.createMetropolisFork)(chainId);
    (0, utils_1.logInfo)(`Loading foundry.toml...`);
    const foundryConfig = (0, foundry_1.loadFoundryConfig)();
    const normalizedScriptPath = (0, foundry_1.normalizeForgeScriptPath)(forgeScriptPath);
    const solidityFilePaths = [
        normalizedScriptPath,
        ...(0, foundry_1.getScriptDependencies)(foundryConfig, normalizedScriptPath),
    ];
    (0, utils_1.logInfo)(`Running Forge Script at ${forgeScriptPath}...`);
    const foundryArguments = (0, exports.configureForgeScriptInputs)({
        rpcUrl: (_b = yargs['UNSAFE-RPC-OVERRIDE']) !== null && _b !== void 0 ? _b : rpcUrl,
    });
    yield (0, foundry_1.runForgeScript)(foundryArguments);
    (0, utils_1.logInfo)(`Forge deployment script ran successfully!`);
    (0, utils_1.logInfo)(`Getting repo metadata...`);
    const repoMetadata = (0, git_1.getRepoMetadata)(solidityFilePaths);
    const cliVersion = (0, version_1.getCLIVersion)();
    (0, utils_1.logInfo)(`Getting transaction data...`);
    const scriptMetadata = yield (0, foundry_1.getScriptMetadata)(foundryConfig, chainId, forgeScriptPath);
    (0, utils_1.logInfo)(`Getting contract metadata...`);
    const contractMetadata = (0, foundry_1.getContractMetadata)(foundryConfig, scriptMetadata.broadcastArtifacts, solidityFilePaths);
    const payload = {
        cliVersion,
        chainId,
        repoMetadata,
        scriptMetadata,
        contractMetadata,
    };
    devModeSanityChecks(payload);
    if (!constants_1.doNotCommunicateWithPreviewService)
        yield (0, exports.sendDataToPreviewService)(payload, forkId);
    const previewServiceUrl = `${constants_1.PREVIEW_WEB_URL}/preview/${forkId}`;
    (0, utils_1.logInfo)(`Preview simulation successful! 🎉\n\n`);
    (0, utils_1.logInfo)(`
                             ^
                _______     ^^^
               |xxxxxxx|  _^^^^^_
               |xxxxxxx| | [][][]|
            ______xxxxx| |[][][] |
           |++++++|xxxx| | [][][]|      METROPOLIS
           |++++++|xxxx| |[][][] |
           |++++++|_________ [][]|
           |++++++|=|=|=|=|=| [] |
           |++++++|=|=|=|=|=|[][]|
___________|++HH++|  _HHHH__|   _________   _________  _________

${previewServiceUrl}
__________________  ___________    __________________    ____________
  `);
    (0, utils_1.openInBrowser)(previewServiceUrl);
});
exports.handler = handler;
//# sourceMappingURL=preview.js.map