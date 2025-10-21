/**
 * GoHighLevel Custom Objects Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';

const ListCustomObjectsSchema = z.object({
  locationId: z.string().describe('The location ID to list custom objects for'),
  objectType: z.string().optional().describe('Optional object type filter'),
});

const GetCustomObjectSchema = z.object({
  objectId: z.string().describe('The custom object ID to retrieve'),
});

const CreateCustomObjectSchema = z.object({
  locationId: z.string().describe('The location ID'),
  objectType: z.string().describe('Type of custom object'),
  name: z.string().describe('Name of the custom object'),
  data: z.record(z.unknown()).optional().describe('Custom object data'),
});

const UpdateCustomObjectSchema = z.object({
  objectId: z.string().describe('The custom object ID to update'),
  name: z.string().optional().describe('Updated name'),
  data: z.record(z.unknown()).optional().describe('Updated custom object data'),
});

const DeleteCustomObjectSchema = z.object({
  objectId: z.string().describe('The custom object ID to delete'),
});

export class CustomObjectTools {
  constructor(private client: GHLClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'ghl_list_custom_objects',
        description: 'List custom objects for a location with optional type filter',
        inputSchema: ListCustomObjectsSchema,
      },
      {
        name: 'ghl_get_custom_object',
        description: 'Get a custom object by ID',
        inputSchema: GetCustomObjectSchema,
      },
      {
        name: 'ghl_create_custom_object',
        description: 'Create a new custom object',
        inputSchema: CreateCustomObjectSchema,
      },
      {
        name: 'ghl_update_custom_object',
        description: 'Update an existing custom object',
        inputSchema: UpdateCustomObjectSchema,
      },
      {
        name: 'ghl_delete_custom_object',
        description: 'Delete a custom object',
        inputSchema: DeleteCustomObjectSchema,
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'ghl_list_custom_objects': {
        const { locationId, objectType } = ListCustomObjectsSchema.parse(args);
        return await this.client.listCustomObjects(locationId, objectType);
      }

      case 'ghl_get_custom_object': {
        const { objectId } = GetCustomObjectSchema.parse(args);
        return await this.client.getCustomObject(objectId);
      }

      case 'ghl_create_custom_object': {
        const data = CreateCustomObjectSchema.parse(args);
        return await this.client.createCustomObject(data);
      }

      case 'ghl_update_custom_object': {
        const { objectId, ...updates } = UpdateCustomObjectSchema.parse(args);
        return await this.client.updateCustomObject(objectId, updates);
      }

      case 'ghl_delete_custom_object': {
        const { objectId } = DeleteCustomObjectSchema.parse(args);
        await this.client.deleteCustomObject(objectId);
        return { success: true, objectId };
      }

      default:
        throw new Error(`Unknown custom object tool: ${name}`);
    }
  }
}
