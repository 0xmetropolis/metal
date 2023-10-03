import { decodeJwt, importJWK, jwtVerify } from 'jose';
import fetch from 'node-fetch';
import { BinaryLike, createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Server, createServer } from 'node:http';
import { join } from 'node:path';
import { parse } from 'url';
import { logDebug, logError, openInBrowser } from '.';
import { ID_TOKEN_FILE } from '../constants';
import { AccessToken, IdTokenWithProfileScope, Pretty } from '../types';

type Base64String = string;
export type CachedIDToken = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

type ParsedCachedIdToken = Pretty<
  CachedIDToken & {
    parsedAccessToken: AccessToken;
    parsedIdToken: IdTokenWithProfileScope;
  }
>;

export type AuthenticationStatus =
  | {
      isAuthenticated: false;
    }
  | Pretty<
      {
        isAuthenticated: true;
      } & ParsedCachedIdToken
    >;

const PORT = 42224;
const AUTHORIZATION_TIMEOUT = 60_000;
const AUTH0ֹֹֹֹֹ_DOMAIN = 'dev-y3yet3c7w2jdjgo7.us.auth0.com';
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

      // create a self-closing window to close the browser tab
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
      return code;
    }),
    authorizationTimeout,
  ]);

  // if it timed out or errored throw the error
  if (maybeAuthCode instanceof Error) throw maybeAuthCode;

  // otherwise, successfully return the auth code!
  return maybeAuthCode;
};

export const requestForIdToken = async (codeVerifier: string, authorizationCode: string) => {
  const url = `https://${AUTH0ֹֹֹֹֹ_VANITY_URI}/oauth/token`;

  const req = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: AUTH0_CLI_CLIENT_ID,
      code_verifier: codeVerifier,
      code: authorizationCode,
      redirect_uri: `http://localhost:${PORT}`,
    }),
  });

  const response: CachedIDToken = await req.json();

  return response;
};

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
    issuer: `https://${AUTH0ֹֹֹֹֹ_DOMAIN}/`,
  }).catch(err => {
    logDebug(err);
    throw Error('Failed to verify IDToken!');
  });

  // make sure the token hasn't expired
  if (decodedToken.payload.exp < Math.floor(Date.now() / 1000)) throw Error('Token expired');

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

export const saveIdToken = (idToken: CachedIDToken) => {
  // save the id token to the local filesystem (in dist/)
  const idTokenPath = join(__dirname, '..', ID_TOKEN_FILE);
  writeFileSync(idTokenPath, JSON.stringify(idToken, null, 2));
};

/**
 * @dev should never throw, but returns a verbose Authentication object with both the id and access tokens if they're cached and valid
 */
export const checkAuthentication = async (): Promise<AuthenticationStatus> => {
  const idTokenPath = join(__dirname, '..', ID_TOKEN_FILE);
  const idTokenIsCached = existsSync(idTokenPath);
  if (!idTokenIsCached) return { isAuthenticated: false };

  try {
    const tokenCache_raw = readFileSync(idTokenPath);
    const tokenCache: CachedIDToken = JSON.parse(tokenCache_raw.toString());

    const [accessToken, parsedIdToken] = await Promise.all([
      validateJWT(tokenCache.access_token),
      validateJWT<IdTokenWithProfileScope>(tokenCache.id_token, AUTH0_CLI_CLIENT_ID),
    ]);

    return {
      isAuthenticated: true,
      ...tokenCache,
      parsedAccessToken: accessToken,
      parsedIdToken,
    };
  } catch (err) {
    logDebug(err);

    return { isAuthenticated: false };
  }
};
