import { JWTPayload, decodeJwt, importJWK, jwtVerify } from 'jose';
import fetch from 'node-fetch';
import assert from 'node:assert';
import { BinaryLike, UUID, createHash, randomBytes } from 'node:crypto';
import { Server, createServer } from 'node:http';
import { parse } from 'url';
import { logDebug, logError, logInfo, openInBrowser } from '.';
import { ID_TOKEN_FILE } from '../constants';
import { AccessToken, IdTokenWithProfileScope, Pretty } from '../types';
import { isInFilestore, loadFromFilestore, saveIdToken } from './filesystem/filestore';
import { addDeploymentToAccount } from './preview-service';
import { upsertUser } from './user';
import inquirer = require('inquirer');

type Base64String = string;
export type CachedTokenSet = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

type ParsedCachedIdToken = Pretty<
  CachedTokenSet & {
    parsedAccessToken: AccessToken;
    parsedIdToken: IdTokenWithProfileScope;
  }
>;

export type AuthenticationStatus =
  | {
      /**
       * @dev the user has never authenticated
       */
      status: 'unregistered';
    }
  | {
      /**
       * @dev the user has authenticated before, but their token is expired
       */
      status: 'unauthenticated';
    }
  | Pretty<
      {
        /**
         * @dev the user has authenticated before, and their token is valid
         */
        status: 'authenticated';
      } & ParsedCachedIdToken
    >;

const PORT = 42224;
const AUTHORIZATION_TIMEOUT = 60_000;
const AUTH0ֹֹֹֹֹ_VANITY_URI = 'auth.metal.build';
const AUTH0_CLI_CLIENT_ID = '9TFnIsSYlxiSKIs5bvwhfxu9yQFvhT0R';
const AUTH0_AUDIENCE = 'metro-api';
const AUTH0_SCOPES = ['profile', 'offline_access'] as const;

export const sha256 = (buffer: BinaryLike) => createHash('sha256').update(buffer).digest();

export const base64URLEncode = (input: Buffer) => input.toString('base64url');

/**
 * @dev think of a codeVerifier as "our secret". We'll hash that secret create the "codeChallenge" and send that to auth0.
 * Auth0 remembers this codeChallenge, when it gives us an authorization code.
 * Later when we request an id token, we'll send the _codeVerifier_ (the secret) to auth0.
 * Auth0 will hash the codeVerifier and compare it to the codeChallenge it remembers.
 *
 * By doing this, we proved we knew the secret (no one can fake a hash), and we are who we say we are
 */
export const generateHashChallenges = (): {
  codeChallenge: Base64String;
  codeVerifier: Base64String;
  state: string;
} => {
  const verifier = base64URLEncode(randomBytes(32));
  // create a code challenge by hashing the verifier string
  const challenge = base64URLEncode(sha256(verifier));
  // generate a random one-time-use state string (also known as a csrf token and helps mitigate cross-site request forgery attacks)
  const state = randomBytes(16).toString('hex');

  return {
    codeVerifier: verifier,
    codeChallenge: challenge,
    state,
  };
};

/**
 * @dev API SPEC: https://auth0.com/docs/api/authentication?http#authorization-code-flow
 */
export const openLoginWindow = (codeChallenge: string, state: string) => {
  const auth0Url = [
    `https://${AUTH0ֹֹֹֹֹ_VANITY_URI}/authorize?`,
    `audience=${AUTH0_AUDIENCE}`,
    `&response_type=code`,
    `&code_challenge=${codeChallenge}`,
    `&code_challenge_method=S256`,
    `&client_id=${AUTH0_CLI_CLIENT_ID}`,
    `&scope=${encodeURIComponent(['openid', ...AUTH0_SCOPES].join(' '))}`,
    `&state=${state}`,
    `&redirect_uri=http://localhost:${PORT}`,
  ].join('');

  openInBrowser(auth0Url);
};

export const listenForAuthorizationCode = async ({
  expectedCSRFToken,
}: {
  expectedCSRFToken: string;
}): Promise<string> => {
  let server: Server;

  const authCodeListeningServer = new Promise<string>((resolve, reject) => {
    server = createServer((req, res) => {
      let code: string | undefined,
        state: string | undefined,
        error: string | undefined,
        error_description: string | undefined;

      try {
        const { query } = parse(req.url ?? '', true);
        code = query.code as any;
        state = query.state as any;
        error = query.error as any;
        error_description = query.error_description as any;
      } catch (e: any) {
        logDebug(e);
        reject('Failed to parse auth0 callback');
      }

      const authorizationSuccessful = !!code && state == expectedCSRFToken;

      // create a redirect to the metal.build to close the browser tab
      res.writeHead(302, {
        Location: `https://metal.build/auth/${authorizationSuccessful ? 'success' : 'failure'}`,
      });
      res.end();

      // make sure we receive an authorization code, and that the csrf token matches
      if (authorizationSuccessful) {
        resolve(code);
        return;
      } else {
        // otherwise, reject with the error
        logDebug({ error, error_description });
        reject(error_description);
        return;
      }
    }).listen(PORT, (err?: Error) => {
      if (err) logError(err?.message);
    });
  });

  const authorizationTimeout = new Promise<Error>((_, reject) =>
    setTimeout(
      () =>
        reject(
          Error(`Authorization request timed out after ${AUTHORIZATION_TIMEOUT / 1000} seconds`),
        ),
      AUTHORIZATION_TIMEOUT,
    ),
  );

  // wait for either: 1. the server to close with the authorization code or throw 2.timeout if the user doesn't authorize in time
  const maybeAuthCode = await Promise.race([
    authCodeListeningServer.then(code => {
      // clean up the server
      server.close();
      setImmediate(() => {
        server.emit('close');
      });
      // and return the auth code
      return code;
    }),
    authorizationTimeout,
  ]);

  // if it timed out or errored throw the error
  if (maybeAuthCode instanceof Error) throw maybeAuthCode;

  // otherwise, successfully return the auth code!
  return maybeAuthCode;
};

/**
 * @throws if the token request fails
 */
export const requestForIdToken = async (body: URLSearchParams) => {
  const url = `https://${AUTH0ֹֹֹֹֹ_VANITY_URI}/oauth/token`;

  const req = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const response: CachedTokenSet = await req.json();

  if (req.status.toString()[0] !== '2')
    throw Error(`Failed to request id token: ${req.statusText}\n${response}`);

  return response;
};

/**
 * @dev request for an id token via the "PCKE Authorization Flow"
 */
export const requestForIdTokenViaPCKE = async (codeVerifier: string, authorizationCode: string) =>
  await requestForIdToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: AUTH0_CLI_CLIENT_ID,
      code_verifier: codeVerifier,
      code: authorizationCode,
      redirect_uri: `http://localhost:${PORT}`,
    }),
  );

/**
 * @dev request for an id token via a request token
 */
export const requestForIdTokenViaRefreshToken = async (refreshToken: string) =>
  await requestForIdToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: AUTH0_CLI_CLIENT_ID,
      refresh_token: refreshToken,
      // scope: @dev you can add additional scopes in this request:
      //   https://auth0.com/docs/api/authentication#request-parameters
    }),
  );

const fetchJWKSFromAuth0Domain = async () => {
  // every openid provider publishes a JWKS (JSON Web Key Set) this `well-known` endpoint
  //   this comes off the JSON Web Key spec: https://openid.net/specs/draft-jones-json-web-key-03.html
  const res = await fetch(`https://${AUTH0ֹֹֹֹֹ_VANITY_URI}/.well-known/jwks.json`);

  // hitting this public endpoint returns a JSON object with a set of public keys
  const jwks: {
    keys: {
      kty: 'RSA';
      use: 'sig';
      n: string;
      e: string;
      kid: string;
      x5t: string;
      x5c: string[];
      alg: 'RS256';
    }[];
  } = await res.json();

  // grab + return the first key from the set
  const [key] = jwks.keys;

  return key;
};

export const isTokenExpired = ({ exp }: JWTPayload) => exp < Math.floor(Date.now() / 1000);

export const validateJWT = async <T extends AccessToken>(
  accessToken: string,
  audience = AUTH0_AUDIENCE,
): Promise<T> => {
  // fetch the public key from the auth0 domain
  const rs256PubKey = await fetchJWKSFromAuth0Domain().catch(err => {
    logDebug(err);
    throw Error('Failed to fetch public key from auth0 domain');
  });

  // import that public key into a format the `jose` library can use
  const publicKey = await importJWK(rs256PubKey).catch(err => {
    logDebug(rs256PubKey);
    logDebug(err);
    throw Error('Failed to import public key');
  });

  // verify the id token with the public key
  const decodedToken = await jwtVerify(accessToken, publicKey, {
    audience,
    issuer: `https://${AUTH0ֹֹֹֹֹ_VANITY_URI}/`,
  }).catch(err => {
    logDebug(err);
    throw Error('Failed to verify IDToken!');
  });

  // make sure the token hasn't expired
  if (isTokenExpired(decodedToken.payload)) throw Error('Token expired');

  return decodedToken.payload as T;
};

/**
 * @dev only parses the id token, does not validate it
 * @param idToken the raw b64 encoded id token string
 */
export const decodeIdToken = (idToken: string): IdTokenWithProfileScope => {
  try {
    return decodeJwt(idToken) as IdTokenWithProfileScope;
  } catch (e: any) {
    logDebug(e);

    throw Error('Failed to decode IDToken!');
  }
};

/**
 * @dev loads in the cached token set, and refreshes it if it's expired
 */
async function getOrRefreshCachedTokenSet(): Promise<CachedTokenSet> {
  // load the token, expecting `accessToken`, `refresh_token`, and `idToken` members
  const tokenCache_raw = loadFromFilestore(ID_TOKEN_FILE);
  const cachedToken: CachedTokenSet = JSON.parse(tokenCache_raw);

  const { access_token, id_token, refresh_token } = cachedToken;

  // validate cache shape
  if (!access_token || !id_token || !refresh_token) {
    logDebug(cachedToken);

    throw new Error('Malformed token cache');
  }

  const [accessTokenPayload, idTokenPayload] = [decodeJwt(access_token), decodeJwt(id_token)];

  // check if the token is expired
  if (isTokenExpired(accessTokenPayload) || isTokenExpired(idTokenPayload)) {
    // use the refresh token to re-authenticate
    const refreshedToken = await requestForIdTokenViaRefreshToken(refresh_token);
    // and save it to the filesystem
    saveIdToken(refreshedToken);

    return refreshedToken;
  } else {
    // otherwise, the token is ready to use
    return cachedToken;
  }
}

/**
 * @dev should never throw
 * @dev will refresh the cached token if it's expired
 * @returns a verbose Authentication object with both the id and access tokens if they're cached and valid
 */
export const checkAuthentication = async (): Promise<AuthenticationStatus> => {
  // if the user has never authenticated (or we update the location between versions)
  // they will not have an ID token cached
  const idTokenIsCached = isInFilestore(ID_TOKEN_FILE);
  if (!idTokenIsCached) return { status: 'unregistered' };

  try {
    // load the cache and refresh it if any of the tokens are expired
    const cachedTokens: CachedTokenSet = await getOrRefreshCachedTokenSet();

    const [parsedAccessToken, parsedIdToken] = await Promise.all([
      validateJWT(cachedTokens.access_token),
      validateJWT<IdTokenWithProfileScope>(cachedTokens.id_token, AUTH0_CLI_CLIENT_ID),
    ]);

    return {
      status: 'authenticated',
      ...cachedTokens,
      parsedAccessToken,
      parsedIdToken,
    };
  } catch (err) {
    logDebug(err);

    return { status: 'unauthenticated' };
  }
};

/**
 * @dev authenticates via the PCKE flow, validates the returned token, saves it locally, creates the user in the backend, and returns the id token payload
 */
export const authenticateViaPCKEFlow = async () => {
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

  return idTokenPayload;
};

export const authenticateAndAssociateDeployment = async (
  deploymentId: UUID,
  promptLabel: 'preview' | 'deployment',
) => {
  logInfo('\n');
  logInfo(`You are not authenticated with Metal!\n`, 'yellow');

  const { confirm } = await inquirer.prompt({
    type: 'confirm',
    name: 'confirm',
    message: `Would you like to login and save this ${promptLabel} to your account?`,
  });

  // allow the user to opt out of authentication
  if (!confirm) return;

  // authenticate via the PCKE flow
  const idToken = await authenticateViaPCKEFlow();

  const authStatus = await checkAuthentication();

  assert(
    authStatus.status === 'authenticated',
    'Fatal authentication error: Please reach out to support',
  );

  logInfo(`\nAuthenticated as ${idToken.nickname}!`);

  // associate the deployment with the user
  await addDeploymentToAccount(deploymentId, authStatus.access_token);
};

export const authenticateAndAssociateDeployment_safe = async (
  deploymentId: UUID,
  promptLabel: 'preview' | 'deployment',
) =>
  await authenticateAndAssociateDeployment(deploymentId, promptLabel).catch(e => {
    logDebug(e);

    logError('Authentication Error!\nPlease run `metal auth` and try again.');
  });
