/**
 * GoHighLevel API Client
 */

import fetch from 'node-fetch';
import { logger } from '../../utils/logger.js';
import { GHLOAuthManager } from './oauth-manager.js';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export interface GHLContact {
  id?: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  dateAdded?: string;
  dateUpdated?: string;
  [key: string]: unknown;
}

export interface GHLContactSearchResult {
  contacts: GHLContact[];
  total: number;
  count: number;
}

export class GHLClient {
  constructor(private oauthManager: GHLOAuthManager) {}

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const accessToken = await this.oauthManager.getAccessToken();
    const url = `${GHL_API_BASE}${path}`;

    logger.debug(`GHL API ${method} ${path}`);

    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      logger.error(`GHL API error: ${response.status}`, error);
      throw new Error(`GHL API request failed: ${response.status} ${error}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Create a new contact
   */
  async createContact(contact: GHLContact): Promise<GHLContact> {
    logger.info('Creating contact', { email: contact.email });

    const result = await this.request<{ contact: GHLContact }>(
      'POST',
      '/contacts/',
      contact
    );

    return result.contact;
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, updates: Partial<GHLContact>): Promise<GHLContact> {
    logger.info('Updating contact', { contactId });

    const result = await this.request<{ contact: GHLContact }>(
      'PUT',
      `/contacts/${contactId}`,
      updates
    );

    return result.contact;
  }

  /**
   * Get a contact by ID
   */
  async getContact(contactId: string): Promise<GHLContact> {
    logger.debug('Getting contact', { contactId });

    const result = await this.request<{ contact: GHLContact }>(
      'GET',
      `/contacts/${contactId}`
    );

    return result.contact;
  }

  /**
   * Search contacts
   */
  async searchContacts(locationId: string, query?: string): Promise<GHLContactSearchResult> {
    logger.debug('Searching contacts', { locationId, query });

    const params = new URLSearchParams({ locationId });
    if (query) {
      params.append('query', query);
    }

    const result = await this.request<GHLContactSearchResult>(
      'GET',
      `/contacts/?${params.toString()}`
    );

    return result;
  }

  /**
   * Add tag to contact
   */
  async addTag(contactId: string, tag: string): Promise<void> {
    logger.info('Adding tag to contact', { contactId, tag });

    await this.request(
      'POST',
      `/contacts/${contactId}/tags`,
      { tags: [tag] }
    );
  }

  /**
   * Remove tag from contact
   */
  async removeTag(contactId: string, tag: string): Promise<void> {
    logger.info('Removing tag from contact', { contactId, tag });

    await this.request(
      'DELETE',
      `/contacts/${contactId}/tags`,
      { tags: [tag] }
    );
  }

  /**
   * Get contacts by location
   */
  async getContactsByLocation(locationId: string, limit: number = 100): Promise<GHLContact[]> {
    logger.debug('Getting contacts by location', { locationId, limit });

    const params = new URLSearchParams({
      locationId,
      limit: limit.toString(),
    });

    const result = await this.request<GHLContactSearchResult>(
      'GET',
      `/contacts/?${params.toString()}`
    );

    return result.contacts;
  }
}
