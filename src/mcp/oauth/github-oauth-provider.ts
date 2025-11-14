/**
 * GitHub OAuth Provider for MCP
 * Implements MCP SDK's OAuth provider interface with GitHub authentication
 */

import { randomUUID } from 'node:crypto';
import { OAuthStorage, type OAuthClient } from './oauth-storage.js';
import { logger } from '../../utils/logger.js';
import fetch from 'node-fetch';
import type { Response } from 'express';

export interface GitHubOAuthConfig {
  githubClientId: string;
  githubClientSecret: string;
  baseUrl: string;
  issuerUrl?: string | undefined;
  dbPath?: string | undefined;
}

export interface GitHubCallbackResult {
  redirectUri: string;
  authCode: string;
  clientState?: string | undefined;
}

// Remove TokenInfo - we'll use AuthInfo from MCP SDK directly
// export interface TokenInfo {
//   token: string;
//   clientId: string;
//   scopes: string[];
//   expiresAt: number;
//   resource?: URL | undefined;
// }

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface AuthorizeParams {
  redirectUri: string;
  scopes?: string[];
  resource?: URL;
  state?: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
}

export class GitHubOAuthProvider {
  private githubClientId: string;
  private githubClientSecret: string;
  private baseUrl: string;
  private storage: OAuthStorage;
  private _clientsStore: {
    getClient: (clientId: string) => Promise<OAuthClient | undefined>;
    registerClient: (client: OAuthClient) => Promise<OAuthClient>;
  };

  constructor(config: GitHubOAuthConfig) {
    this.githubClientId = config.githubClientId;
    this.githubClientSecret = config.githubClientSecret;
    this.baseUrl = config.baseUrl;
    this.storage = new OAuthStorage(config.dbPath);

    this._clientsStore = {
      getClient: async (clientId: string) => this.storage.getClient(clientId),
      registerClient: async (client: OAuthClient) => this.storage.registerClient(client)
    };

    // Cleanup expired tokens every hour
    setInterval(() => {
      const deletedTokens = this.storage.cleanupExpiredTokens();
      const deletedCodes = this.storage.cleanupExpiredCodes();
      if (deletedTokens > 0 || deletedCodes > 0) {
        logger.info('OAuth cleanup', { deletedTokens, deletedCodes });
      }
    }, 3600000); // 1 hour

    logger.info('GitHub OAuth provider initialized');
  }

  get clientsStore() {
    return this._clientsStore;
  }

  /**
   * OAuth authorization endpoint - redirects to GitHub
   */
  async authorize(client: OAuthClient, params: AuthorizeParams, res: Response): Promise<void> {
    // Generate internal state to track this authorization request
    const internalState = randomUUID();

    // Save authorization request data with internal state
    this.storage.saveCode(internalState, {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      scopes: params.scopes?.join(' '),
      resource: params.resource?.toString(),
      state: params.state, // Client's state parameter
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    // Redirect user to GitHub OAuth
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', this.githubClientId);
    githubAuthUrl.searchParams.set('redirect_uri', `${this.baseUrl}/oauth/callback`);
    githubAuthUrl.searchParams.set('state', internalState);
    githubAuthUrl.searchParams.set('scope', 'read:user user:email');

    logger.info('Redirecting to GitHub OAuth', { state: internalState });
    res.redirect(githubAuthUrl.toString());
  }

  /**
   * GitHub OAuth callback handler
   */
  async handleGitHubCallback(code: string, state: string): Promise<GitHubCallbackResult> {
    // Retrieve the original authorization request
    const authRequest = this.storage.getCode(state);
    if (!authRequest) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for GitHub access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.githubClientId,
        client_secret: this.githubClientSecret,
        code,
        redirect_uri: `${this.baseUrl}/oauth/callback`
      })
    });

    const tokenData: any = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    const githubUser: any = await userResponse.json();
    logger.info('GitHub user authenticated', {
      login: githubUser.login,
      userId: githubUser.id
    });

    // Generate MCP authorization code
    const mcpAuthCode = randomUUID();
    this.storage.saveCode(mcpAuthCode, {
      clientId: authRequest.clientId,
      redirectUri: authRequest.redirectUri,
      scopes: authRequest.scopes,
      resource: authRequest.resource,
      state: authRequest.state,
      codeChallenge: authRequest.codeChallenge,
      codeChallengeMethod: authRequest.codeChallengeMethod,
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    // Pre-generate access token for faster exchange
    const token = randomUUID();
    this.storage.saveToken(token, {
      clientId: authRequest.clientId,
      scopes: authRequest.scopes || '',
      expiresAt: Date.now() + 3600000, // 1 hour
      resource: authRequest.resource
    });

    // Delete the internal state code (one-time use)
    this.storage.deleteCode(state);

    return {
      redirectUri: authRequest.redirectUri,
      authCode: mcpAuthCode,
      clientState: authRequest.state
    };
  }

  /**
   * Get PKCE challenge for authorization code
   */
  async challengeForAuthorizationCode(client: OAuthClient, authorizationCode: string): Promise<string> {
    const codeData = this.storage.getCode(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }
    return codeData.codeChallenge;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthorizationCode(
    client: OAuthClient,
    authorizationCode: string,
    _codeVerifier: string,
    _redirectUri: string,
    _resource?: URL
  ): Promise<TokenResponse> {
    const codeData = this.storage.getCode(authorizationCode);
    if (!codeData) {
      throw new Error('Invalid authorization code');
    }

    if (codeData.clientId !== client.client_id) {
      throw new Error('Authorization code was not issued to this client');
    }

    // Delete the authorization code (one-time use)
    this.storage.deleteCode(authorizationCode);

    // Generate new access token
    const token = randomUUID();
    const scopes = codeData.scopes ? codeData.scopes.split(' ') : [];

    this.storage.saveToken(token, {
      clientId: client.client_id,
      scopes: codeData.scopes || '',
      expiresAt: Date.now() + 3600000, // 1 hour
      resource: codeData.resource
    });

    logger.info('OAuth token issued via GitHub', {
      clientId: client.client_id,
      expiresIn: 3600
    });

    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      scope: scopes.join(' '),
    };
  }

  /**
   * Refresh token exchange (not implemented)
   */
  async exchangeRefreshToken(
    _client: OAuthClient,
    _refreshToken: string,
    _scopes?: string[],
    _resource?: URL
  ): Promise<TokenResponse> {
    throw new Error('Refresh tokens not implemented');
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string) {
    const tokenData = this.storage.getToken(token);
    if (!tokenData) {
      throw new Error('Invalid or expired token');
    }

    // Return object matching MCP SDK's AuthInfo type
    const authInfo: any = {
      token,
      clientId: tokenData.clientId,
      scopes: tokenData.scopes ? tokenData.scopes.split(' ') : [],
      expiresAt: Math.floor(tokenData.expiresAt / 1000),
    };

    // Only add resource if it exists (MCP SDK doesn't allow undefined for this field)
    if (tokenData.resource) {
      authInfo.resource = new URL(tokenData.resource);
    }

    return authInfo;
  }

  /**
   * Close storage connection
   */
  close(): void {
    this.storage.close();
  }
}
