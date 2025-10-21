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
import { OpportunityTools } from './tools/opportunities.js';
import { ConversationTools } from './tools/conversations.js';
import { CalendarTools } from './tools/calendars.js';
import { WorkflowTools } from './tools/workflows.js';
import { FormTools } from './tools/forms.js';
import { CustomObjectTools } from './tools/custom-objects.js';
import { MediaTools } from './tools/media.js';
import { LocationTools } from './tools/locations.js';
import { UserTools } from './tools/users.js';
import { TagTools } from './tools/tags.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class GHLMCPServer {
  private server: Server;
  private oauthManager: GHLOAuthManager;
  private client: GHLClient;
  private contactTools: ContactTools;
  private opportunityTools: OpportunityTools;
  private conversationTools: ConversationTools;
  private calendarTools: CalendarTools;
  private workflowTools: WorkflowTools;
  private formTools: FormTools;
  private customObjectTools: CustomObjectTools;
  private mediaTools: MediaTools;
  private locationTools: LocationTools;
  private userTools: UserTools;
  private tagTools: TagTools;

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
    this.opportunityTools = new OpportunityTools(this.client);
    this.conversationTools = new ConversationTools(this.client);
    this.calendarTools = new CalendarTools(this.client);
    this.workflowTools = new WorkflowTools(this.client);
    this.formTools = new FormTools(this.client);
    this.customObjectTools = new CustomObjectTools(this.client);
    this.mediaTools = new MediaTools(this.client);
    this.locationTools = new LocationTools(this.client);
    this.userTools = new UserTools(this.client);
    this.tagTools = new TagTools(this.client);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        ...this.contactTools.getToolDefinitions(),
        ...this.opportunityTools.getToolDefinitions(),
        ...this.conversationTools.getToolDefinitions(),
        ...this.calendarTools.getToolDefinitions(),
        ...this.workflowTools.getToolDefinitions(),
        ...this.formTools.getToolDefinitions(),
        ...this.customObjectTools.getToolDefinitions(),
        ...this.mediaTools.getToolDefinitions(),
        ...this.locationTools.getToolDefinitions(),
        ...this.userTools.getToolDefinitions(),
        ...this.tagTools.getToolDefinitions(),
      ];

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

        // Route to appropriate tool handler
        let result;
        if (name.startsWith('ghl_create_contact') || name.startsWith('ghl_update_contact') ||
            name.startsWith('ghl_search_contacts') || name.startsWith('ghl_get_contact') ||
            name.startsWith('ghl_add_tag') || name.startsWith('ghl_remove_tag')) {
          result = await this.contactTools.executeTool(name, args || {});
        } else if (name.includes('opportunity')) {
          result = await this.opportunityTools.executeTool(name, args || {});
        } else if (name.includes('conversation') || name.includes('message')) {
          result = await this.conversationTools.executeTool(name, args || {});
        } else if (name.includes('calendar') || name.includes('appointment')) {
          result = await this.calendarTools.executeTool(name, args || {});
        } else if (name.includes('workflow')) {
          result = await this.workflowTools.executeTool(name, args || {});
        } else if (name.includes('form')) {
          result = await this.formTools.executeTool(name, args || {});
        } else if (name.includes('custom_object')) {
          result = await this.customObjectTools.executeTool(name, args || {});
        } else if (name.includes('media')) {
          result = await this.mediaTools.executeTool(name, args || {});
        } else if (name.includes('location')) {
          result = await this.locationTools.executeTool(name, args || {});
        } else if (name.includes('user')) {
          result = await this.userTools.executeTool(name, args || {});
        } else if (name === 'ghl_list_tags' || name === 'ghl_create_tag' || name === 'ghl_delete_tag') {
          result = await this.tagTools.executeTool(name, args || {});
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }

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
