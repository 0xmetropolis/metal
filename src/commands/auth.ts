import { Arguments, Options } from 'yargs';
import { logError, logInfo } from '../utils';
import {
  checkAuthentication,
  decodeIdToken,
  generateHashChallenges,
  listenForAuthorizationCode,
  openLoginWindow,
  requestForIdToken,
  saveIdToken,
  validateAccessToken,
} from '../utils/auth';
import { log } from 'node:console';

export const command = 'auth';
export const description = `Authenticate with Metropolis`;

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
 * @param force the user can force re-authentication, even if their token is valid
 */
export const handler = async ({ force }: HandlerInput) => {
  const isAuthenticated = await checkAuthentication();

  if (isAuthenticated && !force) {
    logInfo('Already authenticated 🎉\n\n💡 Use the `--force` flag to re-authenticate');
    return;
  }

  /**
   * @dev we use the "PCKE Authorization Flow" to authenticate with Auth0
   *   See this diagram for a visual representation of the flow:
   *   https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce#how-it-works
   */
  try {
    // generate a code challenge and verifier as base64 strings
    const { codeChallenge, codeVerifier, state } = generateHashChallenges();

    // open a new window for the user to authorize a login...
    openLoginWindow(codeChallenge, state);

    // ... and listen for up to 30 seconds for an auth0 to reply with an authorization code
    const authorizationCode = await listenForAuthorizationCode({ expectedCSRFToken: state });

    // take the authorization code and exchange it for an id token
    //  https://auth0.com/docs/secure/tokens/id-tokens
    const idToken = await requestForIdToken(codeVerifier, authorizationCode);

    // validate the attached access token is valid
    await validateAccessToken(idToken.access_token);

    // save the id token to the local filesystem
    saveIdToken(idToken);

    // decode the id token to get the user's nickname
    const idTokenPayload = decodeIdToken(idToken.id_token);

    logInfo(`Successfully authenticated as ${idTokenPayload?.nickname} 🎉`);
  } catch (err) {
    logError(err);
    logError('Authentication failed');
  }

  // hard exit to clean up any open sockets
  process.exit(0);
};
