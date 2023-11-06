import { logDebug } from '.';
import { version } from '../../package.json';
import { PREVIEW_SERVICE_URL } from '../constants';
import { checkAuthentication } from './auth';

export const sendCliCommandAnalytics = async (
  cliCommand: 'import' | 'deploy' | 'preview' | 'auth' | 'pull',
) => {
  const auth = await checkAuthentication();
  const authHeaders =
    auth.status === 'authenticated' ? { Authorization: `Bearer ${auth.access_token}` } : {};

  try {
    logDebug(`sending analytics for ${cliCommand}`);
    const request = await fetch(`${PREVIEW_SERVICE_URL}/analytics/cli-command`, {
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
