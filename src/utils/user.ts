import fetch from 'node-fetch';
import { logDebug, logError } from '.';
import { PREVIEW_SERVICE_URL } from '../constants';
import { IDToken } from './auth';

export const checkRegistration = async ({
  id_token: idToken,
  access_token: accessToken,
}: IDToken) => {
  try {
    const request = await fetch(`${PREVIEW_SERVICE_URL}/user/check-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ idToken }),
    });

    const isSuccessful = request.status.toString()[0] === '2';
    if (!isSuccessful) {
      logDebug(request);
      throw new Error('Request is not 2xx');
    }
  } catch (e: any) {
    logDebug(e.message);
    logError('User registration failed. Please reach out for support');

    process.exit(0);
  }
};
