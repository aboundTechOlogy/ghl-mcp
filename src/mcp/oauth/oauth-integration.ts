/**
 * OAuth Integration using MCP SDK's built-in router
 * Sets up OAuth 2.1 with PKCE and Dynamic Client Registration
 */

import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { GitHubOAuthProvider } from './github-oauth-provider.js';
import { logger } from '../../utils/logger.js';
import type { Application, Request, Response, NextFunction } from 'express';

export interface OAuthSetupOptions {
  enableOAuth: boolean;
  useGitHub: boolean;
  baseUrl: string;
  githubClientId?: string | undefined;
  githubClientSecret?: string | undefined;
  dbPath?: string | undefined;
}

export interface AuthenticationOptions {
  provider: GitHubOAuthProvider | null;
  bearerToken: string;
}

/**
 * Setup OAuth routes using MCP SDK's router
 */
export function setupOAuthRoutes(
  app: Application,
  options: OAuthSetupOptions
): GitHubOAuthProvider | null {
  if (!options.enableOAuth) {
    logger.info('OAuth disabled - using Bearer token authentication only');
    return null;
  }

  logger.info('Setting up OAuth 2.0 with Dynamic Client Registration', {
    mode: options.useGitHub ? 'GitHub' : 'Custom'
  });

  if (!options.githubClientId || !options.githubClientSecret) {
    throw new Error('GitHub OAuth requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
  }

  // Initialize GitHub OAuth provider
  // Use baseUrl for GitHub callback, issuerUrl for MCP endpoints
  const provider = new GitHubOAuthProvider({
    githubClientId: options.githubClientId,
    githubClientSecret: options.githubClientSecret,
    baseUrl: options.baseUrl,
    dbPath: options.dbPath
  });

  try {
    const issuerUrl = new URL(options.baseUrl);

    // Add MCP SDK's OAuth router
    // Mount at root level (like n8n-mcp) - OAuth endpoints are separate from MCP endpoint
    // This creates all required OAuth endpoints:
    // - /.well-known/oauth-authorization-server (metadata)
    // - /oauth/register (dynamic client registration)
    // - /oauth/authorize (authorization endpoint)
    // - /oauth/token (token endpoint)
    // - /oauth/revoke (token revocation)
    app.use(mcpAuthRouter({
      provider,
      issuerUrl,
      scopesSupported: ['mcp:tools', 'mcp:read', 'mcp:write'],
      resourceName: 'GHL MCP Server',
    }));

    // Add GitHub OAuth callback endpoint
    app.get('/oauth/callback', async (req: Request, res: Response) => {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        logger.error('GitHub OAuth callback missing code or state', {
          hasCode: !!code,
          hasState: !!state
        });
        res.status(400).send('Missing code or state parameter');
        return;
      }

      try {
        const result = await provider.handleGitHubCallback(code, state);

        // Redirect back to client with authorization code
        const redirectUrl = new URL(result.redirectUri);
        redirectUrl.searchParams.set('code', result.authCode);
        if (result.clientState) {
          redirectUrl.searchParams.set('state', result.clientState);
        }

        logger.info('GitHub OAuth callback successful, redirecting to client', {
          redirectUri: result.redirectUri
        });

        res.redirect(redirectUrl.toString());
      } catch (error) {
        logger.error('GitHub OAuth callback failed', error);
        res.status(500).send('OAuth authentication failed');
      }
    });

    logger.info('OAuth 2.0 endpoints configured', {
      issuer: issuerUrl.toString(),
      mode: 'GitHub',
      endpoints: {
        metadata: '/.well-known/oauth-authorization-server',
        register: '/oauth/register',
        authorize: '/oauth/authorize',
        token: '/oauth/token',
        revoke: '/oauth/revoke',
        callback: '/oauth/callback'
      }
    });

    return provider;
  } catch (error) {
    logger.error('Failed to setup OAuth routes', error);
    throw error;
  }
}

/**
 * Create authentication middleware that supports both OAuth and bearer tokens
 */
export function createOAuthAuthenticationMiddleware(
  options: AuthenticationOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Allow initialize request without authentication (MCP spec requirement)
    const body = req.body as any;
    if (body && body.method === 'initialize') {
      logger.debug('Allowing unauthenticated initialize request');
      next();
      return;
    }

    const authHeader = req.get('authorization');

    if (!authHeader) {
      logger.warn('Authentication failed: Missing Authorization header', { method: body?.method });
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized'
        },
        id: null
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Invalid Authorization header format');
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Unauthorized'
        },
        id: null
      });
      return;
    }

    const token = authHeader.slice(7).trim();

    // Try OAuth token verification first (if OAuth is enabled)
    if (options.provider) {
      try {
        const tokenInfo = await options.provider.verifyAccessToken(token);
        logger.debug('OAuth token verified', { clientId: tokenInfo.clientId });
        (req as any).oauthTokenInfo = tokenInfo;
        next();
        return;
      } catch (oauthError) {
        logger.debug('OAuth token verification failed, trying bearer token');
      }
    }

    // Fall back to bearer token authentication
    if (token === options.bearerToken) {
      logger.debug('Bearer token verified');
      next();
      return;
    }

    logger.warn('Authentication failed: Invalid token');
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized'
      },
      id: null
    });
  };
}
