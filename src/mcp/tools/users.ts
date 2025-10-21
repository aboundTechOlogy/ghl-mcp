/**
 * GoHighLevel Users Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';

const ListUsersSchema = z.object({
  locationId: z.string().describe('The location ID to list users for'),
});

const GetUserSchema = z.object({
  userId: z.string().describe('The user ID to retrieve'),
});

const UpdateUserSchema = z.object({
  userId: z.string().describe('The user ID to update'),
  firstName: z.string().optional().describe('Updated first name'),
  lastName: z.string().optional().describe('Updated last name'),
  email: z.string().optional().describe('Updated email'),
  phone: z.string().optional().describe('Updated phone'),
  role: z.string().optional().describe('Updated role'),
});

export class UserTools {
  constructor(private client: GHLClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'ghl_list_users',
        description: 'List all users for a location',
        inputSchema: ListUsersSchema,
      },
      {
        name: 'ghl_get_user',
        description: 'Get user details by ID',
        inputSchema: GetUserSchema,
      },
      {
        name: 'ghl_update_user',
        description: 'Update user information',
        inputSchema: UpdateUserSchema,
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'ghl_list_users': {
        const { locationId } = ListUsersSchema.parse(args);
        return await this.client.listUsers(locationId);
      }

      case 'ghl_get_user': {
        const { userId } = GetUserSchema.parse(args);
        return await this.client.getUser(userId);
      }

      case 'ghl_update_user': {
        const { userId, ...updates } = UpdateUserSchema.parse(args);
        return await this.client.updateUser(userId, updates);
      }

      default:
        throw new Error(`Unknown user tool: ${name}`);
    }
  }
}
