/**
 * GoHighLevel Contact MCP Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';
import { logger } from '../../utils/logger.js';

// Schema definitions
const CreateContactSchema = z.object({
  locationId: z.string().describe('The GHL location ID'),
  firstName: z.string().optional().describe('Contact first name'),
  lastName: z.string().optional().describe('Contact last name'),
  email: z.string().email().optional().describe('Contact email address'),
  phone: z.string().optional().describe('Contact phone number'),
  tags: z.array(z.string()).optional().describe('Tags to apply to contact'),
  customFields: z.record(z.unknown()).optional().describe('Custom field values'),
});

const UpdateContactSchema = z.object({
  contactId: z.string().describe('The contact ID to update'),
  firstName: z.string().optional().describe('Updated first name'),
  lastName: z.string().optional().describe('Updated last name'),
  email: z.string().email().optional().describe('Updated email address'),
  phone: z.string().optional().describe('Updated phone number'),
  tags: z.array(z.string()).optional().describe('Updated tags'),
  customFields: z.record(z.unknown()).optional().describe('Updated custom fields'),
});

const SearchContactsSchema = z.object({
  locationId: z.string().describe('The GHL location ID to search in'),
  query: z.string().optional().describe('Search query (email, phone, or name)'),
});

const GetContactSchema = z.object({
  contactId: z.string().describe('The contact ID to retrieve'),
});

const AddTagSchema = z.object({
  contactId: z.string().describe('The contact ID'),
  tag: z.string().describe('Tag to add to the contact'),
});

const RemoveTagSchema = z.object({
  contactId: z.string().describe('The contact ID'),
  tag: z.string().describe('Tag to remove from the contact'),
});

export class ContactTools {
  constructor(private client: GHLClient) {}

  /**
   * Get all contact tool definitions
   */
  getToolDefinitions() {
    return [
      {
        name: 'ghl_create_contact',
        description: 'Create a new contact in GoHighLevel',
        inputSchema: CreateContactSchema,
      },
      {
        name: 'ghl_update_contact',
        description: 'Update an existing contact in GoHighLevel',
        inputSchema: UpdateContactSchema,
      },
      {
        name: 'ghl_search_contacts',
        description: 'Search for contacts in a location',
        inputSchema: SearchContactsSchema,
      },
      {
        name: 'ghl_get_contact',
        description: 'Get a contact by ID',
        inputSchema: GetContactSchema,
      },
      {
        name: 'ghl_add_tag',
        description: 'Add a tag to a contact',
        inputSchema: AddTagSchema,
      },
      {
        name: 'ghl_remove_tag',
        description: 'Remove a tag from a contact',
        inputSchema: RemoveTagSchema,
      },
    ];
  }

  /**
   * Execute a contact tool
   */
  async executeTool(name: string, args: unknown): Promise<unknown> {
    logger.debug(`Executing tool: ${name}`, args);

    switch (name) {
      case 'ghl_create_contact':
        return this.createContact(args);
      case 'ghl_update_contact':
        return this.updateContact(args);
      case 'ghl_search_contacts':
        return this.searchContacts(args);
      case 'ghl_get_contact':
        return this.getContact(args);
      case 'ghl_add_tag':
        return this.addTag(args);
      case 'ghl_remove_tag':
        return this.removeTag(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async createContact(args: unknown) {
    const parsed = CreateContactSchema.parse(args);

    const contactData: any = {
      locationId: parsed.locationId,
    };

    if (parsed.firstName !== undefined) contactData.firstName = parsed.firstName;
    if (parsed.lastName !== undefined) contactData.lastName = parsed.lastName;
    if (parsed.email !== undefined) contactData.email = parsed.email;
    if (parsed.phone !== undefined) contactData.phone = parsed.phone;
    if (parsed.tags !== undefined) contactData.tags = parsed.tags;
    if (parsed.customFields !== undefined) contactData.customFields = parsed.customFields;

    const contact = await this.client.createContact(contactData);

    return {
      success: true,
      contact,
    };
  }

  private async updateContact(args: unknown) {
    const parsed = UpdateContactSchema.parse(args);

    const updates: Record<string, unknown> = {};
    if (parsed.firstName) updates.firstName = parsed.firstName;
    if (parsed.lastName) updates.lastName = parsed.lastName;
    if (parsed.email) updates.email = parsed.email;
    if (parsed.phone) updates.phone = parsed.phone;
    if (parsed.tags) updates.tags = parsed.tags;
    if (parsed.customFields) updates.customFields = parsed.customFields;

    const contact = await this.client.updateContact(parsed.contactId, updates);

    return {
      success: true,
      contact,
    };
  }

  private async searchContacts(args: unknown) {
    const parsed = SearchContactsSchema.parse(args);

    const result = await this.client.searchContacts(
      parsed.locationId,
      parsed.query
    );

    return {
      success: true,
      ...result,
    };
  }

  private async getContact(args: unknown) {
    const parsed = GetContactSchema.parse(args);

    const contact = await this.client.getContact(parsed.contactId);

    return {
      success: true,
      contact,
    };
  }

  private async addTag(args: unknown) {
    const parsed = AddTagSchema.parse(args);

    await this.client.addTag(parsed.contactId, parsed.tag);

    return {
      success: true,
      message: `Tag "${parsed.tag}" added to contact ${parsed.contactId}`,
    };
  }

  private async removeTag(args: unknown) {
    const parsed = RemoveTagSchema.parse(args);

    await this.client.removeTag(parsed.contactId, parsed.tag);

    return {
      success: true,
      message: `Tag "${parsed.tag}" removed from contact ${parsed.contactId}`,
    };
  }
}
