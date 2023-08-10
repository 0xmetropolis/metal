"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPC_OVERRIDE_FLAG = exports.FORGE_WALLET_OPTIONS = exports.FORGE_FORK_ALIASES = exports.doNotCommunicateWithPreviewService = exports.PREVIEW_WEB_URL = exports.PREVIEW_SERVICE_URL = exports.IS_DEV = exports.DEFAULT_PRIVATE_KEY = exports.SUPPORTED_NETWORKS = exports.SUPPORTED_CHAINS = void 0;
const types_1 = require("./types");
exports.SUPPORTED_CHAINS = Object.values(types_1.Network);
exports.SUPPORTED_NETWORKS = Object.keys(types_1.Network).map(networkName => networkName.toLowerCase());
exports.DEFAULT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // hardhat 0 address
// @dev if the script is being run via the mdev command, we are in dev mode
exports.IS_DEV = process.argv[1].includes('mdev');
exports.PREVIEW_SERVICE_URL = process.env.PREVIEW_SERVICE_URL
    ? process.env.PREVIEW_SERVICE_URL
    : exports.IS_DEV
        ? 'http://localhost:1234'
        : 'https://preview-service-225b51c334ef.herokuapp.com';
exports.PREVIEW_WEB_URL = process.env.PREVIEW_WEB_URL
    ? process.env.PREVIEW_WEB_URL
    : exports.IS_DEV
        ? 'http://localhost:3000'
        : 'https://metropolis.sh';
exports.doNotCommunicateWithPreviewService = !!process.env.NO_PREVIEW_SERVICE;
exports.FORGE_FORK_ALIASES = ['--fork-url', '-f', '--rpc-url'];
exports.FORGE_WALLET_OPTIONS = [
    '-a',
    '--froms',
    '-i',
    '--interactives',
    '--private-keys',
    '--private-key',
    '--mnemonics',
    '--mnemonic-passphrases',
    '--mnemonic-derivation-paths',
    '--mnemonic-indexes',
    '--keystore',
    '--password',
    '--password-file',
    '-l',
    '--ledger',
    '-t',
    '--trezor',
    '--aws',
];
exports.RPC_OVERRIDE_FLAG = '--UNSAFE-RPC-OVERRIDE';
//# sourceMappingURL=constants.js.map