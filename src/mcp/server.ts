/**
 * GoHighLevel MCP Server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { GHLOAuthManager } from './ghl/oauth-manager.js';
import { GHLClient } from './ghl/client.js';
import { ContactTools } from './tools/contacts.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class GHLMCPServer {
  private server: Server;
  private oauthManager: GHLOAuthManager;
  private client: GHLClient;
  private contactTools: ContactTools;

  constructor() {
    this.server = new Server(
      {
        name: 'ghl-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.oauthManager = new GHLOAuthManager();
    this.client = new GHLClient(this.oauthManager);
    this.contactTools = new ContactTools(this.client);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.contactTools.getToolDefinitions();

      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: zodToJsonSchema(tool.inputSchema),
        })),
      };
    });

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check if authenticated
        if (!this.oauthManager.hasTokens()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Not authenticated. Please provide GHL OAuth tokens.',
                  authUrl: GHLOAuthManager.getAuthorizationUrl([
                    'contacts.readonly',
                    'contacts.write',
                    'conversations.readonly',
                    'conversations.write',
                    'opportunities.readonly',
                    'opportunities.write',
                    'calendars.readonly',
                    'calendars.write',
                  ]),
                }, null, 2),
              },
            ],
          };
        }

        const result = await this.contactTools.executeTool(name, args || {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Tool execution error:', error);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Set OAuth tokens (for HTTP server to inject)
   */
  setOAuthTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope: string;
  }): void {
    this.oauthManager.setTokens(tokens);
  }

  /**
   * Get OAuth manager (for HTTP server)
   */
  getOAuthManager(): GHLOAuthManager {
    return this.oauthManager;
  }

  /**
   * Run server with stdio transport
   */
  async runStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('GHL MCP Server running on stdio');
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): Server {
    return this.server;
  }
}
