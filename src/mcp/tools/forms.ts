/**
 * GoHighLevel Form MCP Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';
import { logger } from '../../utils/logger.js';

// Schema definitions
const ListFormsSchema = z.object({
  locationId: z.string().describe('The GHL location ID'),
});

const GetFormSchema = z.object({
  formId: z.string().describe('The form ID to retrieve'),
});

export class FormTools {
  constructor(private client: GHLClient) {}

  /**
   * Get all form tool definitions
   */
  getToolDefinitions() {
    return [
      {
        name: 'ghl_list_forms',
        description: 'List forms for a location',
        inputSchema: ListFormsSchema,
      },
      {
        name: 'ghl_get_form',
        description: 'Get a form by ID',
        inputSchema: GetFormSchema,
      },
    ];
  }

  /**
   * Execute a form tool
   */
  async executeTool(name: string, args: unknown): Promise<unknown> {
    logger.debug(`Executing tool: ${name}`, args);

    switch (name) {
      case 'ghl_list_forms':
        return this.listForms(args);
      case 'ghl_get_form':
        return this.getForm(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async listForms(args: unknown) {
    const parsed = ListFormsSchema.parse(args);

    const forms = await this.client.listForms(parsed.locationId);

    return {
      success: true,
      forms,
      count: forms.length,
    };
  }

  private async getForm(args: unknown) {
    const parsed = GetFormSchema.parse(args);

    const form = await this.client.getForm(parsed.formId);

    return {
      success: true,
      form,
    };
  }
}
