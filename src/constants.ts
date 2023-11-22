import { Network } from './types';

export const SUPPORTED_CHAINS = Object.values(Network) as Network[];
export const DEFAULT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // hardhat 0 address

export const CONNECTIONS = {
  prod: {
    metalWeb: 'https://metal.build',
    metalService: 'https://api.metal.build',
    auth0: {
      issuer: 'https://auth.metal.build',
      clientId: '9TFnIsSYlxiSKIs5bvwhfxu9yQFvhT0R',
      audience: 'https://api.metal.build',
    },
  },
  staging: {
    metalWeb: 'https://staging.metal.build',
    metalService: 'https://staging.api.metal.build',
    auth0: {
      issuer: 'https://metal-build-dev.us.auth0.com',
      clientId: 'KvzTMmpjygjJTTlwfNNv1d4k0Xo93MUW',
      audience: 'https://staging.api.metal.build',
    },
  },
  dev: {
    metalWeb: 'http://localhost:3000',
    metalService: 'http://localhost:1234',
    /**
     * @dev the issuer, clientId, and audience are all the same for dev and staging
     */
    auth0: {
      issuer: 'https://metal-build-dev.us.auth0.com',
      clientId: 'KvzTMmpjygjJTTlwfNNv1d4k0Xo93MUW',
      audience: 'https://staging.api.metal.build',
    },
  },
};

// @dev the config for the cli is determined by the following order of preference:
//  1. scoped flags (--metal-service, --metal-web, --auth0-issuer, --auth0-client-id, --auth0-audience)
//  2. env vars (METAL_SERVICE, METAL_WEB, AUTH0_[ISSUER, CLIENT_ID, AUDIENCE])
//  3. MODE flags (--staging, --dev, --prod)
const bootstrapConstants = () => {
  const flagIsPresent = (flag: string): boolean => process.argv.some(arg => arg === flag);
  const getFlagValueFromArgv = (flag: string): string | undefined => {
    const flagIndex = process.argv.findIndex(arg => arg === flag);
    if (flagIndex === -1) return undefined;
    else return process.argv[flagIndex + 1];
  };

  const env = process.env;

  const MODE: 'dev' | 'staging' | 'prod' = flagIsPresent('--staging')
    ? 'staging'
    : flagIsPresent('--dev') || (process.argv[1].endsWith('mdev') && !flagIsPresent('--prod'))
    ? 'dev'
    : 'prod';

  const METAL_SERVICE_URL =
    getFlagValueFromArgv('--metal-service') ??
    env['METAL_SERVICE'] ??
    CONNECTIONS[MODE].metalService;
  const METAL_WEB_URL =
    getFlagValueFromArgv('--metal-web') ?? env['METAL_WEB'] ?? CONNECTIONS[MODE].metalWeb;
  const AUTH0ֹֹֹֹֹ_ISSUER =
    getFlagValueFromArgv('--auth0-issuer') ?? env['AUTH0_ISSUER'] ?? CONNECTIONS[MODE].auth0.issuer;
  const AUTH0_CLI_CLIENT_ID =
    getFlagValueFromArgv('--auth0-client-id') ??
    env['AUTH0_CLIENT_ID'] ??
    CONNECTIONS[MODE].auth0.clientId;
  const AUTH0_AUDIENCE =
    getFlagValueFromArgv('--auth0-audience') ??
    env['AUTH0_AUDIENCE'] ??
    CONNECTIONS[MODE].auth0.audience;
  const YARG_DEBUG = flagIsPresent('--debug');

  const config = {
    MODE,
    METAL_SERVICE_URL,
    METAL_WEB_URL,
    AUTH0ֹֹֹֹֹ_ISSUER,
    AUTH0_CLI_CLIENT_ID,
    AUTH0_AUDIENCE,
    YARG_DEBUG,
  };

  const logDebug = (s: string | any) => YARG_DEBUG && console.log('\x1b[36m%s\x1b[0m', s);

  logDebug('Initializing config...');
  logDebug('\tNOTE: config perference order is:');
  logDebug(
    '\t1. explcit scoped flags (--metal-service, --metal-web, --auth0-issuer, --auth0-client-id) ->',
  );
  logDebug('\t2. env vars (METAL_SERVICE, METAL_WEB, AUTH0_ISSUER, AUTH0_CLIENT_ID) ->');
  logDebug('\t3. MODE flags (--staging, --dev, --prod)');
  logDebug(config);
  logDebug('\n\n');

  return config;
};

export const {
  MODE,
  METAL_SERVICE_URL,
  METAL_WEB_URL,
  AUTH0ֹֹֹֹֹ_ISSUER,
  AUTH0_CLI_CLIENT_ID,
  AUTH0_AUDIENCE,
  YARG_DEBUG,
} = bootstrapConstants();

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

export const doNotCommunicateWithMetalService = !!process.env.NO_METAL_SERVICE;

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
