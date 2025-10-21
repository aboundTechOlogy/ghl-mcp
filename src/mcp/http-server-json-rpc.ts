/**
 * HTTP JSON-RPC Server for MCP with Dual OAuth
 * Supports both Bearer token (Claude Code) and GitHub OAuth (Claude Desktop)
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { GHLMCPServer } from './server.js';
import type { JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';

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

interface GitHubUser {
  login: string;
  id: number;
  email?: string;
}

export class HTTPServer {
  private app: express.Application;
  private sessions: Map<string, Session> = new Map();
  private mcpServer: GHLMCPServer;

  constructor() {
    this.app = express();
    this.mcpServer = new GHLMCPServer();
    this.setupMiddleware();
    this.setupRoutes();
    this.startSessionCleanup();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
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

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        server: 'ghl-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });

    // GitHub OAuth callback
    this.app.get('/auth/callback', async (req, res) => {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
      }

      try {
        const session = await this.handleGitHubCallback(code);
        res.json({
          success: true,
          sessionId: session.id,
          message: 'Authentication successful',
        });
      } catch (error) {
        logger.error('OAuth callback error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    });

    // GHL OAuth callback
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

    // MCP JSON-RPC endpoint
    this.app.post('/mcp', this.authenticate.bind(this), async (req, res) => {
      try {
        const session = (req as any).session as Session;

        // Inject GHL tokens into MCP server if available
        if (session.ghlTokens) {
          this.mcpServer.setOAuthTokens(session.ghlTokens);
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
   * Authentication middleware - supports both bearer token and session
   */
  private async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Missing Authorization header' });
      return;
    }

    // Bearer token auth (Claude Code)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token === config.authToken) {
        // Create/get anonymous session
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

        (req as any).session = session;
        next();
        return;
      } else {
        res.status(401).json({ error: 'Invalid bearer token' });
        return;
      }
    }

    // Session-based auth (Claude Desktop with GitHub OAuth)
    const sessionId = authHeader.replace('Bearer ', '');
    const session = this.sessions.get(sessionId);

    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    // Update last activity
    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);

    (req as any).session = session;
    next();
  }

  /**
   * Handle GitHub OAuth callback
   */
  private async handleGitHubCallback(code: string): Promise<Session> {
    if (!config.githubClientId || !config.githubClientSecret) {
      throw new Error('GitHub OAuth not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as any;

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    const user = (await userResponse.json()) as GitHubUser;

    // Create session
    const session: Session = {
      id: this.generateSessionId(),
      accessToken,
      lastActivity: Date.now(),
    };

    this.sessions.set(session.id, session);

    logger.info('GitHub OAuth successful', { user: user.login });

    return session;
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

      handler(request.params)
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

        if (config.githubClientId) {
          logger.info(`GitHub OAuth: ${config.baseUrl}/auth/callback`);
        }

        logger.info(`GHL OAuth: ${config.baseUrl}/ghl/callback`);

        resolve();
      });
    });
  }
}
