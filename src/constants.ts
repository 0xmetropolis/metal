import { Network } from './types';

export const SUPPORTED_CHAINS = Object.values(Network) as Network[];
export const DEFAULT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // hardhat 0 address

export const PREVIEW_SERVICE_URL = process.env.PREVIEW_SERVICE_URL ?? 'http://localhost:1234';
export const PREVIEW_WEB_URL = process.env.PREVIEW_WEB_URL ?? 'http://localhost:3000';
export const doNotCommunicateWithPreviewService = !!process.env.NO_PREVIEW_SERVICE;
