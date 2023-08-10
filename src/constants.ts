import { Network } from './types';

export const SUPPORTED_CHAINS = Object.values(Network) as number[];
export const SUPPORTED_NETWORKS = Object.keys(Network).map(networkName =>
  networkName.toLowerCase(),
);

export const DEFAULT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // hardhat 0 address

// @dev if the script is being run via the mdev command, we are in dev mode
export const IS_DEV = process.argv[1].includes('mdev');

export const PREVIEW_SERVICE_URL = process.env.PREVIEW_SERVICE_URL
  ? process.env.PREVIEW_SERVICE_URL
  : IS_DEV
  ? 'http://localhost:1234'
  : 'https://preview-service-225b51c334ef.herokuapp.com';

export const PREVIEW_WEB_URL = process.env.PREVIEW_WEB_URL
  ? process.env.PREVIEW_WEB_URL
  : IS_DEV
  ? 'http://localhost:3000'
  : 'https://metropolis.sh';

export const doNotCommunicateWithPreviewService = !!process.env.NO_PREVIEW_SERVICE;

export const FORGE_FORK_ALIASES = ['--fork-url', '-f', '--rpc-url'];
export const FORGE_WALLET_OPTIONS = [
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
export const RPC_OVERRIDE_FLAG = '--UNSAFE-RPC-OVERRIDE';
