import { logDebug } from '.';
import { METAL_SERVICE_URL } from '../constants';
import { checkAuthentication } from './auth';

const { version } = require('../../package.json');

export const sendCliCommandAnalytics = async (
  cliCommand: 'import' | 'deploy' | 'preview' | 'auth' | 'pull',
) => {
  const auth = await checkAuthentication();
  const authHeaders =
    auth.status === 'authenticated' ? { Authorization: `Bearer ${auth.access_token}` } : {};

  try {
    logDebug(`sending analytics for ${cliCommand}`);
    const request = await fetch(`${METAL_SERVICE_URL}/analytics/cli-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ cliCommand, version }),
    });

    logDebug(request.status);
  } catch (e: any) {
    logDebug('Could not send cli-command analytics');
    logDebug(e);
  }
};

export const logFailure = async (error: any) => {
  const auth = await checkAuthentication();
  const authHeaders =
    auth.status === 'authenticated' ? { Authorization: `Bearer ${auth.access_token}` } : {};

  try {
    logDebug(`sending failure analytics`);
    const request = await fetch(`${METAL_SERVICE_URL}/analytics/failure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ version, error }),
    });

    logDebug(request.status);
  } catch (e: any) {
    logDebug('Could not send failure analytics');
    logDebug(e);
  }
};
