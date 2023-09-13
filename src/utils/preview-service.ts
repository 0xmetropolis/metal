import { Network } from 'index';
import { PREVIEW_SERVICE_URL } from '../constants';
import { exit, logDebug, logError } from '.';
import { UUID } from 'crypto';
import assert = require('node:assert');
import fetch from 'node-fetch';

export type ForkConfig = {
  __type: 'tenderly' | 'anvil';
  id: UUID;
  chainId: Network;
  rpcUrl: string;
};

export type ChainConfig = {
  chainId: Network;
  label: string;
  rpcUrl: string;
  etherscanUrl: string;
};

export const createMetropolisFork = async (chainId: Network) => {
  const createUrl = `${PREVIEW_SERVICE_URL}/create`;
  try {
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chainId, initializeDefaultAccounts: true }),
    });
    assert(response.status === 200, `${response.status} ${response.statusText}`);

    const data: ForkConfig = await response.json();

    return data;
  } catch (e) {
    logDebug(e);
    logError(`
    Error creating fork with chainId ${chainId}
    ==BEGIN ERROR==
    ${createUrl}
    ${e.message}
    `);
    exit();
  }
};

export const fetchChainConfig = async (chainId: Network) => {
  const configUrl = `${PREVIEW_SERVICE_URL}/chain-config/${chainId}`;
  try {
    const response = await fetch(configUrl);
    assert(response.status === 200, `${response.status} ${response.statusText}`);

    const data: ChainConfig = await response.json();

    return data;
  } catch (e) {
    logDebug(e);
    logError(`
    Error fetching chain config at chain-id: ${chainId}
    ==BEGIN ERROR==
    ${configUrl}
    ${e.message}
    `);
    exit();
  }
};
