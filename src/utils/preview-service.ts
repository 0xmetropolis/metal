import { UUID } from 'crypto';
import fetch from 'node-fetch';
import assert from 'node:assert';
import { exit, logDebug, logError } from '.';
import { PREVIEW_SERVICE_URL } from '../constants';
import { ArtifactBundle, DeploymentRequestParams, Network } from '../types';

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

export const createMetalFork = async (chainId: Network) => {
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

export const uploadDeploymentData = async (
  payload: DeploymentRequestParams,
  authToken?: string,
): Promise<UUID> => {
  try {
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${PREVIEW_SERVICE_URL}/deploy`, {
      headers,
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.status !== 200) {
      const res = await response.json();
      logDebug(res);

      exit(
        `Error received from Metal servers! (status ${response.status})`,
        '===========================',
        res.message ?? response.statusText,
      );
    }

    const res: { id: UUID } = await response.json();
    return res.id;
  } catch (e: any) {
    logDebug(e);
    exit('Error connecting to Metal servers', e.message);
  }
};

/**
 * @dev allows to associate a deployment to a user's account
 */
export const addDeploymentToAccount = async (
  deploymentId: UUID,
  authToken: string,
): Promise<void> => {
  try {
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const response = await fetch(`${PREVIEW_SERVICE_URL}/add-deployment/${deploymentId}`, {
      headers,
      method: 'PUT',
    });

    if (response.status !== 200) {
      const res = await response.json();
      logDebug(res);

      exit(
        `Error received from Metal servers! (status ${response.status})`,
        '===========================',
        res.message ?? response.statusText,
      );
    }
  } catch (e: any) {
    logDebug(e);
    exit('Error connecting to Metal servers', e.message);
  }
};

/**
 * @dev fetches a zipped artifact bundle for a deploymentId
 * @returns the zip file as a Buffer
 */
export const getDeploymentArtifacts = async (
  deploymentId: string,
  previousAddresses?: ArtifactBundle['addresses'] | undefined,
): Promise<Buffer> => {
  try {
    const response = await fetch(`${PREVIEW_SERVICE_URL}/artifacts/deployment/${deploymentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: previousAddresses ? JSON.stringify({ previousAddresses }) : undefined,
    });

    // handle errors
    if (response.status !== 200) {
      const res = await response.json();
      logDebug(res);

      exit(
        `Could not fetch artifacts! (status ${res.status})`,
        '===========================',
        res.message ?? res.statusText,
      );
    }

    const zip = await response.buffer();

    return zip;
  } catch (e: any) {
    logDebug(e);
    exit('Error connecting to Metal servers', e.message);
  }
};
