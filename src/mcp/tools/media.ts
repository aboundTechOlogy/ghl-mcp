/**
 * GoHighLevel Media Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';

const ListMediaSchema = z.object({
  locationId: z.string().describe('The location ID to list media files for'),
});

const UploadMediaSchema = z.object({
  locationId: z.string().describe('The location ID'),
  name: z.string().describe('File name'),
  data: z.string().describe('Base64 encoded file data'),
  type: z.string().optional().describe('File MIME type (e.g., image/png, application/pdf)'),
});

const DeleteMediaSchema = z.object({
  mediaId: z.string().describe('The media file ID to delete'),
});

export class MediaTools {
  constructor(private client: GHLClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'ghl_list_media',
        description: 'List media files for a location',
        inputSchema: ListMediaSchema,
      },
      {
        name: 'ghl_upload_media',
        description: 'Upload a media file (max 25MB, base64 encoded)',
        inputSchema: UploadMediaSchema,
      },
      {
        name: 'ghl_delete_media',
        description: 'Delete a media file',
        inputSchema: DeleteMediaSchema,
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'ghl_list_media': {
        const { locationId } = ListMediaSchema.parse(args);
        return await this.client.listMedia(locationId);
      }

      case 'ghl_upload_media': {
        const { locationId, name, data, type } = UploadMediaSchema.parse(args);
        return await this.client.uploadMedia(locationId, { name, data, type });
      }

      case 'ghl_delete_media': {
        const { mediaId } = DeleteMediaSchema.parse(args);
        await this.client.deleteMedia(mediaId);
        return { success: true, mediaId };
      }

      default:
        throw new Error(`Unknown media tool: ${name}`);
    }
  }
}
