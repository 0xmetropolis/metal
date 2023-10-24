import { Network } from './types';

export const SUPPORTED_CHAINS = Object.values(Network) as Network[];
export const DEFAULT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // hardhat 0 address

// @dev if the script is being run via the mdev command, we are in dev mode
export const IS_DEV = process.argv[1].includes('mdev');

export const PREVIEW_SERVICE_URL = process.env.PREVIEW_SERVICE_URL
  ? process.env.PREVIEW_SERVICE_URL
  : IS_DEV
  ? 'http://localhost:1234'
  : 'https://api.metal.build';

export const PREVIEW_WEB_URL = process.env.PREVIEW_WEB_URL
  ? process.env.PREVIEW_WEB_URL
  : IS_DEV
  ? 'http://localhost:3000'
  : 'https://metal.build';

// @dev the directory name of the cli's global cache. @NOTE! is installed wherever the global node_modules lives.
//  eg: ~/.config/yarn/global/node_modules/@0xmetropolis/metal/dist
export const FILESTORE_DIR = '__metal_data';
// @dev the directory name of the metal directory of a certain _project_.
// eg: ~/code/my-cool-frontend/metal/[ARTIFACTS]
export const METAL_DIR_NAME = 'metal';
export const ADDRESS_CONFIG_FILE_NAME = 'addressConfig.ts';

export const ID_TOKEN_FILE = 'id_token.json';
export const FILESTORE_NAMES = [ID_TOKEN_FILE] as const;
export type CachedFile = (typeof FILESTORE_NAMES)[number];

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
