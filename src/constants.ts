import { Network } from '@tenderly/sdk';

// @dev we use a dummy chain id to nullify an accounts signature.
//  This prevents the signed transactions from ever getting into the wrong hands
export const CHAIN_ID_OVERRIDE = 3;
export const SUPPORTED_CHAINS = Object.values(Network) as Network[];

// TODO: figure out how to make these dynamic
export const METRO_DEPLOY_URL = 'http://127.0.0.1:8545';
export const PREVIEW_SERVICE_URL = 'http://localhost:3000';
