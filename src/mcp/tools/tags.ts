/**
 * GoHighLevel Tags Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';

const ListTagsSchema = z.object({
  locationId: z.string().describe('The location ID to list tags for'),
});

const CreateTagSchema = z.object({
  locationId: z.string().describe('The location ID'),
  name: z.string().describe('Tag name'),
  color: z.string().optional().describe('Tag color (hex code)'),
});

const DeleteTagSchema = z.object({
  tagId: z.string().describe('The tag ID to delete'),
});

export class TagTools {
  constructor(private client: GHLClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'ghl_list_tags',
        description: 'List all tags for a location',
        inputSchema: ListTagsSchema,
      },
      {
        name: 'ghl_create_tag',
        description: 'Create a new tag',
        inputSchema: CreateTagSchema,
      },
      {
        name: 'ghl_delete_tag',
        description: 'Delete a tag',
        inputSchema: DeleteTagSchema,
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'ghl_list_tags': {
        const { locationId } = ListTagsSchema.parse(args);
        return await this.client.listTags(locationId);
      }

      case 'ghl_create_tag': {
        const { locationId, name, color } = CreateTagSchema.parse(args);
        return await this.client.createTag(locationId, name, color);
      }

      case 'ghl_delete_tag': {
        const { tagId } = DeleteTagSchema.parse(args);
        await this.client.deleteTag(tagId);
        return { success: true, tagId };
      }

      default:
        throw new Error(`Unknown tag tool: ${name}`);
    }
  }
}
