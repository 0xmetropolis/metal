import { Arguments, Options } from 'yargs';
import { logDebug, logError, logInfo } from '../utils';
import {
  checkAuthentication,
  decodeIdToken,
  generateHashChallenges,
  listenForAuthorizationCode,
  openLoginWindow,
  requestForIdTokenViaPCKE,
  saveIdToken,
  validateJWT,
} from '../utils/auth';
import { upsertUser } from '../utils/user';

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

  // debug for development
  if (auth.status === 'authenticated') logDebug(JSON.stringify(auth, null, 2));

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
  try {
    // generate a code challenge and verifier as base64 strings
    const { codeChallenge, codeVerifier, state } = generateHashChallenges();

    // open a new window for the user to authorize a login...
    openLoginWindow(codeChallenge, state);

    // ... and listen for up to AUTHORIZATION_TIMEOUT seconds for an auth0 to reply with an authorization code
    const authorizationCode = await listenForAuthorizationCode({ expectedCSRFToken: state });

    // take the authorization code and exchange it for an id token
    //  https://auth0.com/docs/secure/tokens/id-tokens
    const idToken = await requestForIdTokenViaPCKE(codeVerifier, authorizationCode);

    // validate the attached access token is valid
    await validateJWT(idToken.access_token);

    // save the id token to the local filesystem
    saveIdToken(idToken);

    // decode the id token to get the user's nickname
    const idTokenPayload = decodeIdToken(idToken.id_token);

    await upsertUser(idToken);

    logInfo(`Successfully authenticated as ${idTokenPayload?.nickname} 🎉`);
  } catch (err) {
    logError(err);
    logError('Authentication failed');
  }

  // hard exit to clean up any open sockets
  process.exit(0);
};
