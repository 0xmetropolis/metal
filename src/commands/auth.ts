import { Arguments, Options } from 'yargs';
import { exit, logDebug, logError, logInfo } from '../utils';
import { authenticateViaPCKEFlow, checkAuthentication } from '../utils/auth';
import { sendCliCommandAnalytics } from '../utils/analytics';

export const command = 'auth';
export const description = `Authenticate with Metal`;

export type Params = {};
export type HandlerInput = Arguments & Params;

export const builder: { [key: string]: Options } = {
  force: {
    type: 'boolean',
    required: false,
    description: 'Force re-authentication even if already authenticated',
  },
};

/**
 * @dev entry point for the auth command
 * @param force - the user can force re-authentication, even if their token is valid
 */
export const handler = async ({ force }: HandlerInput) => {
  // check if the user is already authenticated (includes an expiry check and a refresh - if necessary)
  const auth = await checkAuthentication();

  logDebug(auth);

  // if the user is already authenticated, bail early
  if (auth.status === 'authenticated' && !force) {
    logInfo('Already authenticated 🎉\n\n💡 Use the `--force` flag to re-authenticate');

    return;
  }

  /**
   * @dev we use the "PCKE Authorization Flow" to authenticate with Auth0
   *   See this diagram for a visual representation of the flow:
   *   https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce#how-it-works
   */
  await authenticateViaPCKEFlow({ forceReauth: force })
    .then(({ nickname }) => logInfo(`Successfully authenticated as ${nickname} 🎉`))
    .catch(async err => {
      logDebug(err);

      await exit(err.message);
    });

  // awaiting analytics because the subsequent `process.exit(0)` call will kill the request
  await sendCliCommandAnalytics('auth');

  // hard exit to clean up any open sockets
  process.exit(0);
};
