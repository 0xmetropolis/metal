import { Network } from './types';

export const SUPPORTED_CHAINS = Object.values(Network) as Network[];

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
