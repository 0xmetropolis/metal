import fetch from 'node-fetch';
import { logDebug, logError } from '.';
import { METAL_SERVICE_URL } from '../constants';
import { CachedTokenSet } from './auth';

/**
 * @dev checks if the user is in the db and creates them if they're not
 */
export const upsertUser = async ({
  id_token: idToken,
  access_token: accessToken,
}: CachedTokenSet) => {
  try {
    const request = await fetch(`${METAL_SERVICE_URL}/user/upsert-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ idToken }),
    });

    const isSuccessful = request.status.toString()[0] === '2';
    if (!isSuccessful) {
      logDebug(await request.json());
      throw new Error('Request is not 2xx');
    }
  } catch (e: any) {
    logDebug(e.message);
    throw Error('Could not authenticate user with Metal server!');
  }
};
