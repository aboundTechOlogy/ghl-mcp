/**
 * HTTP JSON-RPC Server for MCP with Dual OAuth
 * Supports both Bearer token (Claude Code) and GitHub OAuth (Claude Desktop)
 * Uses MCP SDK's built-in OAuth router for standards-compliant OAuth 2.1
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { GHLMCPServer } from './server.js';
import type { JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import { setupOAuthRoutes, createOAuthAuthenticationMiddleware } from './oauth/oauth-integration.js';
import type { GitHubOAuthProvider } from './oauth/github-oauth-provider.js';

interface Session {
  id: string;
  accessToken: string;
  lastActivity: number;
  ghlTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope: string;
  };
}

export class HTTPServer {
  private app: express.Application;
  private sessions: Map<string, Session> = new Map();
  private mcpServer: GHLMCPServer;
  private oauthProvider: GitHubOAuthProvider | null = null;

  constructor() {
    this.app = express();
    this.mcpServer = new GHLMCPServer();
    this.setupMiddleware();
    this.setupOAuth();
    this.setupRoutes();
    this.startSessionCleanup();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());

    // CORS - expose OAuth headers
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Expose-Headers', 'X-OAuth-Authorization-Server');

      if (req.method === 'OPTIONS') {
        // Add OAuth discovery header for OPTIONS requests
        res.header('X-OAuth-Authorization-Server', `${config.baseUrl}/.well-known/oauth-authorization-server`);
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup OAuth using MCP SDK's built-in router
   */
  private setupOAuth(): void {
    const enableOAuth = !!(config.githubClientId && config.githubClientSecret);

    if (enableOAuth) {
      logger.info('Setting up OAuth with MCP SDK router');
      this.oauthProvider = setupOAuthRoutes(this.app, {
        enableOAuth: true,
        useGitHub: true,
        baseUrl: config.baseUrl,
        githubClientId: config.githubClientId,
        githubClientSecret: config.githubClientSecret,
      });
    } else {
      logger.warn('OAuth disabled - GitHub credentials not configured');
      logger.warn('Only bearer token authentication will be available');
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        server: 'ghl-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        oauth: this.oauthProvider ? 'enabled' : 'disabled',
      });
    });

    // GHL OAuth callback (for GoHighLevel API authentication)
    this.app.get('/ghl/callback', async (req, res) => {
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
      }

      try {
        // Exchange code for tokens
        const tokens = await this.mcpServer.getOAuthManager().exchangeCode(code);

        // Store in session (state should contain session ID)
        const sessionId = typeof state === 'string' ? state : undefined;
        if (sessionId && this.sessions.has(sessionId)) {
          const session = this.sessions.get(sessionId)!;
          session.ghlTokens = tokens;
          this.sessions.set(sessionId, session);
        }

        res.json({
          success: true,
          message: 'GHL authentication successful',
          expiresAt: new Date(tokens.expiresAt).toISOString(),
        });
      } catch (error) {
        logger.error('GHL OAuth callback error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    });

    // MCP JSON-RPC endpoint with dual authentication
    const authMiddleware = createOAuthAuthenticationMiddleware({
      provider: this.oauthProvider,
      bearerToken: config.authToken
    });

    this.app.post('/mcp', authMiddleware, async (req, res) => {
      try {
        // Check if request has OAuth token info (Claude Desktop)
        const oauthTokenInfo = (req as any).oauthTokenInfo;

        // For bearer token users (Claude Code), maintain session for GHL tokens
        if (!oauthTokenInfo) {
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // Create/get session for bearer token
            let session = Array.from(this.sessions.values()).find(s => s.accessToken === token);
            if (!session) {
              session = {
                id: this.generateSessionId(),
                accessToken: token,
                lastActivity: Date.now(),
              };
              this.sessions.set(session.id, session);
            } else {
              session.lastActivity = Date.now();
            }

            // Inject GHL tokens if available
            if (session.ghlTokens) {
              this.mcpServer.setOAuthTokens(session.ghlTokens);
            }
          }
        }

        // Handle JSON-RPC request
        const request = req.body as JSONRPCRequest;
        const response = await this.handleMCPRequest(request);

        res.json(response);
      } catch (error) {
        logger.error('MCP request error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: (req.body as any)?.id || null,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
        });
      }
    });
  }

  /**
   * Handle MCP JSON-RPC request
   */
  private async handleMCPRequest(request: JSONRPCRequest): Promise<any> {
    // Forward to MCP server
    const server = this.mcpServer.getServer();

    return new Promise((resolve) => {
      const handler = (server as any)._requestHandlers?.get(request.method);

      if (!handler) {
        resolve({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        });
        return;
      }

      // Pass the full request object
      // The MCP SDK handlers expect the complete JSON-RPC request for validation
      handler(request)
        .then((result: any) => {
          resolve({
            jsonrpc: '2.0',
            id: request.id,
            result,
          });
        })
        .catch((error: Error) => {
          resolve({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: error.message,
            },
          });
        });
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup expired sessions
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];

      for (const [id, session] of this.sessions.entries()) {
        if (now - session.lastActivity > config.sessionTimeout) {
          expired.push(id);
        }
      }

      for (const id of expired) {
        this.sessions.delete(id);
        logger.debug('Session expired', { sessionId: id });
      }

      if (expired.length > 0) {
        logger.info(`Cleaned up ${expired.length} expired session(s)`);
      }
    }, 60000); // Check every minute
  }

  /**
   * Start HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(config.port, () => {
        logger.info(`GHL MCP HTTP Server listening on port ${config.port}`);
        logger.info(`Base URL: ${config.baseUrl}`);
        logger.info(`Health check: ${config.baseUrl}/health`);
        logger.info(`MCP endpoint: ${config.baseUrl}/mcp`);

        if (this.oauthProvider) {
          logger.info('OAuth 2.1 endpoints:');
          logger.info(`  Metadata: ${config.baseUrl}/mcp/.well-known/oauth-authorization-server`);
          logger.info(`  Register: ${config.baseUrl}/mcp/oauth/register`);
          logger.info(`  Authorize: ${config.baseUrl}/mcp/oauth/authorize`);
          logger.info(`  Token: ${config.baseUrl}/mcp/oauth/token`);
          logger.info(`  Callback: ${config.baseUrl}/oauth/callback`);
        }

        logger.info(`GHL OAuth: ${config.baseUrl}/ghl/callback`);

        resolve();
      });
    });
  }
}
