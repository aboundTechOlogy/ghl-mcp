/**
 * GoHighLevel Conversation MCP Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';
import { logger } from '../../utils/logger.js';

// Schema definitions
const GetConversationSchema = z.object({
  conversationId: z.string().describe('The conversation ID to retrieve'),
});

const ListConversationsSchema = z.object({
  locationId: z.string().describe('The GHL location ID'),
  contactId: z.string().describe('Contact ID to list conversations for'),
});

const SendMessageSchema = z.object({
  conversationId: z.string().describe('The conversation ID'),
  type: z.enum(['SMS', 'Email', 'WhatsApp', 'GMB', 'IG', 'FB']).describe('Message type'),
  message: z.string().describe('Message content'),
});

const GetMessagesSchema = z.object({
  conversationId: z.string().describe('The conversation ID'),
});

export class ConversationTools {
  constructor(private client: GHLClient) {}

  /**
   * Get all conversation tool definitions
   */
  getToolDefinitions() {
    return [
      {
        name: 'ghl_get_conversation',
        description: 'Get a conversation by ID',
        inputSchema: GetConversationSchema,
      },
      {
        name: 'ghl_list_conversations',
        description: 'List conversations for a location',
        inputSchema: ListConversationsSchema,
      },
      {
        name: 'ghl_send_message',
        description: 'Send a message in a conversation',
        inputSchema: SendMessageSchema,
      },
      {
        name: 'ghl_get_messages',
        description: 'Get messages in a conversation',
        inputSchema: GetMessagesSchema,
      },
    ];
  }

  /**
   * Execute a conversation tool
   */
  async executeTool(name: string, args: unknown): Promise<unknown> {
    logger.debug(`Executing tool: ${name}`, args);

    switch (name) {
      case 'ghl_get_conversation':
        return this.getConversation(args);
      case 'ghl_list_conversations':
        return this.listConversations(args);
      case 'ghl_send_message':
        return this.sendMessage(args);
      case 'ghl_get_messages':
        return this.getMessages(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getConversation(args: unknown) {
    const parsed = GetConversationSchema.parse(args);

    const conversation = await this.client.getConversation(parsed.conversationId);

    return {
      success: true,
      conversation,
    };
  }

  private async listConversations(args: unknown) {
    const parsed = ListConversationsSchema.parse(args);

    const conversations = await this.client.listConversations(parsed.locationId, parsed.contactId);

    return {
      success: true,
      conversations,
      count: conversations.length,
    };
  }

  private async sendMessage(args: unknown) {
    const parsed = SendMessageSchema.parse(args);

    const message = await this.client.sendMessage(parsed.conversationId, {
      type: parsed.type,
      message: parsed.message,
    });

    return {
      success: true,
      message,
    };
  }

  private async getMessages(args: unknown) {
    const parsed = GetMessagesSchema.parse(args);

    const messages = await this.client.getMessages(parsed.conversationId);

    return {
      success: true,
      messages,
      count: messages.length,
    };
  }
}
