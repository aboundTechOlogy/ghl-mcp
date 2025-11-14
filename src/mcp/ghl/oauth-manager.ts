/**
 * GoHighLevel OAuth 2.0 Manager
 * Handles authorization code grant flow and token refresh
 */

import fetch from 'node-fetch';
import { logger } from '../../utils/logger.js';
import { config } from '../../utils/config.js';

const GHL_OAUTH_AUTHORIZE = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
const GHL_OAUTH_TOKEN = 'https://services.leadconnectorhq.com/oauth/token';

export interface GHLTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  scope: string;
}

export interface GHLTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
  scope: string;
}

export class GHLOAuthManager {
  private tokens: GHLTokens | null = null;
  private refreshPromise: Promise<GHLTokens> | null = null;

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<GHLTokens> {
    logger.info('Exchanging authorization code for access token');

    const params = new URLSearchParams({
      client_id: config.ghlClientId,
      client_secret: config.ghlClientSecret,
      grant_type: 'authorization_code',
      code,
    });

    if (config.ghlRedirectUri) {
      params.append('redirect_uri', config.ghlRedirectUri);
    }

    const response = await fetch(GHL_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to exchange code:', error);
      throw new Error(`OAuth token exchange failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as GHLTokenResponse;
    this.tokens = this.normalizeTokens(data);

    logger.info('Successfully obtained access token', {
      expiresIn: data.expires_in,
      scope: data.scope,
    });

    return this.tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<GHLTokens> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      logger.debug('Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    logger.info('Refreshing access token');

    this.refreshPromise = (async () => {
      try {
        const params = new URLSearchParams({
          client_id: config.ghlClientId,
          client_secret: config.ghlClientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.tokens!.refreshToken,
        });

        const response = await fetch(GHL_OAUTH_TOKEN, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const error = await response.text();
          logger.error('Failed to refresh token:', error);
          throw new Error(`Token refresh failed: ${response.status} ${error}`);
        }

        const data = (await response.json()) as GHLTokenResponse;
        this.tokens = this.normalizeTokens(data);

        logger.info('Successfully refreshed access token', {
          expiresIn: data.expires_in,
        });

        return this.tokens;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Get current access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available. Please authenticate first.');
    }

    // Refresh if token expires in less than 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() >= this.tokens.expiresAt - fiveMinutes) {
      await this.refreshAccessToken();
    }

    return this.tokens!.accessToken;
  }

  /**
   * Set tokens manually (for persistence/restoration)
   */
  setTokens(tokens: GHLTokens): void {
    this.tokens = tokens;
    logger.debug('Tokens set manually');
  }

  /**
   * Get current tokens
   */
  getTokens(): GHLTokens | null {
    return this.tokens;
  }

  /**
   * Check if tokens are available
   */
  hasTokens(): boolean {
    return this.tokens !== null;
  }

  /**
   * Clear tokens
   */
  clearTokens(): void {
    this.tokens = null;
    logger.debug('Tokens cleared');
  }

  /**
   * Normalize token response to internal format
   */
  private normalizeTokens(data: GHLTokenResponse): GHLTokens {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  static getAuthorizationUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: config.ghlClientId,
      response_type: 'code',
      scope: scopes.join(' '),
    });

    if (config.ghlRedirectUri) {
      params.append('redirect_uri', config.ghlRedirectUri);
    }

    return `${GHL_OAUTH_AUTHORIZE}?${params.toString()}`;
  }
}
