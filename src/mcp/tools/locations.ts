/**
 * GoHighLevel Locations Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';

const GetLocationSchema = z.object({
  locationId: z.string().describe('The location ID to retrieve'),
});

const UpdateLocationSchema = z.object({
  locationId: z.string().describe('The location ID to update'),
  name: z.string().optional().describe('Updated location name'),
  address: z.string().optional().describe('Updated address'),
  city: z.string().optional().describe('Updated city'),
  state: z.string().optional().describe('Updated state'),
  country: z.string().optional().describe('Updated country'),
  postalCode: z.string().optional().describe('Updated postal code'),
  website: z.string().optional().describe('Updated website'),
  email: z.string().optional().describe('Updated email'),
  phone: z.string().optional().describe('Updated phone'),
});

const ListLocationCustomFieldsSchema = z.object({
  locationId: z.string().describe('The location ID'),
});

const GetLocationCustomValuesSchema = z.object({
  locationId: z.string().describe('The location ID'),
});

const UpdateLocationCustomValuesSchema = z.object({
  locationId: z.string().describe('The location ID'),
  customValues: z.record(z.unknown()).describe('Custom field values to update'),
});

export class LocationTools {
  constructor(private client: GHLClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'ghl_get_location',
        description: 'Get location details including settings and configuration',
        inputSchema: GetLocationSchema,
      },
      {
        name: 'ghl_update_location',
        description: 'Update location information',
        inputSchema: UpdateLocationSchema,
      },
      {
        name: 'ghl_list_location_custom_fields',
        description: 'List all custom fields defined for a location',
        inputSchema: ListLocationCustomFieldsSchema,
      },
      {
        name: 'ghl_get_location_custom_values',
        description: 'Get custom field values for a location',
        inputSchema: GetLocationCustomValuesSchema,
      },
      {
        name: 'ghl_update_location_custom_values',
        description: 'Update custom field values for a location',
        inputSchema: UpdateLocationCustomValuesSchema,
      },
    ];
  }

  async executeTool(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'ghl_get_location': {
        const { locationId } = GetLocationSchema.parse(args);
        return await this.client.getLocation(locationId);
      }

      case 'ghl_update_location': {
        const { locationId, ...updates } = UpdateLocationSchema.parse(args);
        return await this.client.updateLocation(locationId, updates);
      }

      case 'ghl_list_location_custom_fields': {
        const { locationId } = ListLocationCustomFieldsSchema.parse(args);
        return await this.client.listLocationCustomFields(locationId);
      }

      case 'ghl_get_location_custom_values': {
        const { locationId } = GetLocationCustomValuesSchema.parse(args);
        return await this.client.getLocationCustomValues(locationId);
      }

      case 'ghl_update_location_custom_values': {
        const { locationId, customValues } = UpdateLocationCustomValuesSchema.parse(args);
        return await this.client.updateLocationCustomValues(locationId, customValues);
      }

      default:
        throw new Error(`Unknown location tool: ${name}`);
    }
  }
}
