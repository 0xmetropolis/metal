import { Network } from './types';

export const SUPPORTED_CHAINS = Object.values(Network) as Network[];

export const PREVIEW_SERVICE_URL = process.env.PREVIEW_SERVICE_URL ?? 'http://localhost:1234';
export const PREVIEW_WEB_URL = process.env.PREVIEW_WEB_URL ?? 'http://localhost:3000';
export const doNotCommunicateWithPreviewService = !!process.env.NO_PREVIEW_SERVICE;
