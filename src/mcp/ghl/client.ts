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

export interface GHLOpportunity {
  id?: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  contactId?: string;
  locationId?: string;
  monetaryValue?: number;
  assignedTo?: string;
  notes?: string;
  source?: string;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GHLConversation {
  id?: string;
  locationId?: string;
  contactId?: string;
  type?: string;
  lastMessageDate?: string;
  unreadCount?: number;
  [key: string]: unknown;
}

export interface GHLMessage {
  id?: string;
  conversationId?: string;
  type?: string;
  body?: string;
  direction?: string;
  status?: string;
  dateAdded?: string;
  [key: string]: unknown;
}

export interface GHLCalendar {
  id?: string;
  locationId?: string;
  name?: string;
  description?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface GHLAppointment {
  id?: string;
  calendarId?: string;
  contactId?: string;
  locationId?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  notes?: string;
  status?: string;
  [key: string]: unknown;
}

export interface GHLWorkflow {
  id?: string;
  name?: string;
  locationId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface GHLForm {
  id?: string;
  name?: string;
  locationId?: string;
  [key: string]: unknown;
}

export interface GHLCustomObject {
  id?: string;
  locationId?: string;
  objectType?: string;
  name?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GHLMedia {
  id?: string;
  locationId?: string;
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
  [key: string]: unknown;
}

export interface GHLLocation {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  email?: string;
  phone?: string;
  settings?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GHLUser {
  id?: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface GHLTag {
  id?: string;
  locationId?: string;
  name?: string;
  color?: string;
  [key: string]: unknown;
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

  // ==================== OPPORTUNITIES ====================

  /**
   * Get opportunity by ID
   */
  async getOpportunity(opportunityId: string): Promise<GHLOpportunity> {
    logger.debug('Getting opportunity', { opportunityId });

    const result = await this.request<{ opportunity: GHLOpportunity }>(
      'GET',
      `/opportunities/${opportunityId}`
    );

    return result.opportunity;
  }

  /**
   * List opportunities
   */
  async listOpportunities(locationId: string, pipelineId?: string): Promise<GHLOpportunity[]> {
    logger.debug('Listing opportunities', { locationId, pipelineId });

    const params = new URLSearchParams({ locationId });
    if (pipelineId) {
      params.append('pipelineId', pipelineId);
    }

    const result = await this.request<{ opportunities: GHLOpportunity[] }>(
      'GET',
      `/opportunities/?${params.toString()}`
    );

    return result.opportunities;
  }

  /**
   * Create opportunity
   */
  async createOpportunity(opportunity: Partial<GHLOpportunity>): Promise<GHLOpportunity> {
    logger.info('Creating opportunity', { name: opportunity.name });

    const result = await this.request<{ opportunity: GHLOpportunity }>(
      'POST',
      '/opportunities/',
      opportunity
    );

    return result.opportunity;
  }

  /**
   * Update opportunity
   */
  async updateOpportunity(opportunityId: string, updates: Partial<GHLOpportunity>): Promise<GHLOpportunity> {
    logger.info('Updating opportunity', { opportunityId });

    const result = await this.request<{ opportunity: GHLOpportunity }>(
      'PUT',
      `/opportunities/${opportunityId}`,
      updates
    );

    return result.opportunity;
  }

  /**
   * Delete opportunity
   */
  async deleteOpportunity(opportunityId: string): Promise<void> {
    logger.info('Deleting opportunity', { opportunityId });

    await this.request(
      'DELETE',
      `/opportunities/${opportunityId}`
    );
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<GHLConversation> {
    logger.debug('Getting conversation', { conversationId });

    const result = await this.request<{ conversation: GHLConversation }>(
      'GET',
      `/conversations/${conversationId}`
    );

    return result.conversation;
  }

  /**
   * List conversations
   */
  async listConversations(locationId: string): Promise<GHLConversation[]> {
    logger.debug('Listing conversations', { locationId });

    const params = new URLSearchParams({ locationId });

    const result = await this.request<{ conversations: GHLConversation[] }>(
      'GET',
      `/conversations/?${params.toString()}`
    );

    return result.conversations;
  }

  /**
   * Send message
   */
  async sendMessage(conversationId: string, message: { type: string; message: string }): Promise<GHLMessage> {
    logger.info('Sending message', { conversationId, type: message.type });

    const result = await this.request<{ message: GHLMessage }>(
      'POST',
      `/conversations/${conversationId}/messages`,
      message
    );

    return result.message;
  }

  /**
   * Get messages in conversation
   */
  async getMessages(conversationId: string): Promise<GHLMessage[]> {
    logger.debug('Getting messages', { conversationId });

    const result = await this.request<{ messages: GHLMessage[] }>(
      'GET',
      `/conversations/${conversationId}/messages`
    );

    return result.messages;
  }

  // ==================== CALENDARS ====================

  /**
   * List calendars
   */
  async listCalendars(locationId: string): Promise<GHLCalendar[]> {
    logger.debug('Listing calendars', { locationId });

    const params = new URLSearchParams({ locationId });

    const result = await this.request<{ calendars: GHLCalendar[] }>(
      'GET',
      `/calendars/?${params.toString()}`
    );

    return result.calendars;
  }

  /**
   * Get calendar by ID
   */
  async getCalendar(calendarId: string): Promise<GHLCalendar> {
    logger.debug('Getting calendar', { calendarId });

    const result = await this.request<{ calendar: GHLCalendar }>(
      'GET',
      `/calendars/${calendarId}`
    );

    return result.calendar;
  }

  /**
   * List appointments
   */
  async listAppointments(calendarId: string, startDate?: string, endDate?: string): Promise<GHLAppointment[]> {
    logger.debug('Listing appointments', { calendarId });

    const params = new URLSearchParams({ calendarId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const result = await this.request<{ appointments: GHLAppointment[] }>(
      'GET',
      `/calendars/events?${params.toString()}`
    );

    return result.appointments;
  }

  /**
   * Create appointment
   */
  async createAppointment(appointment: Partial<GHLAppointment>): Promise<GHLAppointment> {
    logger.info('Creating appointment', { calendarId: appointment.calendarId });

    const result = await this.request<{ appointment: GHLAppointment }>(
      'POST',
      '/calendars/events',
      appointment
    );

    return result.appointment;
  }

  /**
   * Update appointment
   */
  async updateAppointment(appointmentId: string, updates: Partial<GHLAppointment>): Promise<GHLAppointment> {
    logger.info('Updating appointment', { appointmentId });

    const result = await this.request<{ appointment: GHLAppointment }>(
      'PUT',
      `/calendars/events/${appointmentId}`,
      updates
    );

    return result.appointment;
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(appointmentId: string): Promise<void> {
    logger.info('Deleting appointment', { appointmentId });

    await this.request(
      'DELETE',
      `/calendars/events/${appointmentId}`
    );
  }

  // ==================== WORKFLOWS ====================

  /**
   * List workflows
   */
  async listWorkflows(locationId: string): Promise<GHLWorkflow[]> {
    logger.debug('Listing workflows', { locationId });

    const params = new URLSearchParams({ locationId });

    const result = await this.request<{ workflows: GHLWorkflow[] }>(
      'GET',
      `/workflows/?${params.toString()}`
    );

    return result.workflows;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<GHLWorkflow> {
    logger.debug('Getting workflow', { workflowId });

    const result = await this.request<{ workflow: GHLWorkflow }>(
      'GET',
      `/workflows/${workflowId}`
    );

    return result.workflow;
  }

  // ==================== FORMS ====================

  /**
   * List forms
   */
  async listForms(locationId: string): Promise<GHLForm[]> {
    logger.debug('Listing forms', { locationId });

    const params = new URLSearchParams({ locationId });

    const result = await this.request<{ forms: GHLForm[] }>(
      'GET',
      `/forms/?${params.toString()}`
    );

    return result.forms;
  }

  /**
   * Get form by ID
   */
  async getForm(formId: string): Promise<GHLForm> {
    logger.debug('Getting form', { formId });

    const result = await this.request<{ form: GHLForm }>(
      'GET',
      `/forms/${formId}`
    );

    return result.form;
  }

  // ==================== CUSTOM OBJECTS ====================

  /**
   * List custom objects
   */
  async listCustomObjects(locationId: string, objectType?: string): Promise<GHLCustomObject[]> {
    logger.debug('Listing custom objects', { locationId, objectType });

    const params = new URLSearchParams({ locationId });
    if (objectType) params.append('objectType', objectType);

    const result = await this.request<{ objects: GHLCustomObject[] }>(
      'GET',
      `/custom-objects/?${params.toString()}`
    );

    return result.objects;
  }

  /**
   * Get custom object by ID
   */
  async getCustomObject(objectId: string): Promise<GHLCustomObject> {
    logger.debug('Getting custom object', { objectId });

    const result = await this.request<{ object: GHLCustomObject }>(
      'GET',
      `/custom-objects/${objectId}`
    );

    return result.object;
  }

  /**
   * Create custom object
   */
  async createCustomObject(object: Partial<GHLCustomObject>): Promise<GHLCustomObject> {
    logger.info('Creating custom object', { objectType: object.objectType });

    const result = await this.request<{ object: GHLCustomObject }>(
      'POST',
      '/custom-objects/',
      object
    );

    return result.object;
  }

  /**
   * Update custom object
   */
  async updateCustomObject(objectId: string, updates: Partial<GHLCustomObject>): Promise<GHLCustomObject> {
    logger.info('Updating custom object', { objectId });

    const result = await this.request<{ object: GHLCustomObject }>(
      'PUT',
      `/custom-objects/${objectId}`,
      updates
    );

    return result.object;
  }

  /**
   * Delete custom object
   */
  async deleteCustomObject(objectId: string): Promise<void> {
    logger.info('Deleting custom object', { objectId });

    await this.request(
      'DELETE',
      `/custom-objects/${objectId}`
    );
  }

  // ==================== MEDIA ====================

  /**
   * List media files
   */
  async listMedia(locationId: string): Promise<GHLMedia[]> {
    logger.debug('Listing media files', { locationId });

    const params = new URLSearchParams({ locationId });

    const result = await this.request<{ medias: GHLMedia[] }>(
      'GET',
      `/medias/?${params.toString()}`
    );

    return result.medias;
  }

  /**
   * Upload media file
   */
  async uploadMedia(locationId: string, file: { name: string; data: string; type?: string }): Promise<GHLMedia> {
    logger.info('Uploading media file', { locationId, fileName: file.name });

    const result = await this.request<{ media: GHLMedia }>(
      'POST',
      '/medias/upload-file',
      {
        locationId,
        name: file.name,
        file: file.data,
        fileType: file.type,
      }
    );

    return result.media;
  }

  /**
   * Delete media file
   */
  async deleteMedia(mediaId: string): Promise<void> {
    logger.info('Deleting media file', { mediaId });

    await this.request(
      'DELETE',
      `/medias/${mediaId}`
    );
  }

  // ==================== LOCATIONS ====================

  /**
   * Get location details
   */
  async getLocation(locationId: string): Promise<GHLLocation> {
    logger.debug('Getting location', { locationId });

    const result = await this.request<{ location: GHLLocation }>(
      'GET',
      `/locations/${locationId}`
    );

    return result.location;
  }

  /**
   * Update location
   */
  async updateLocation(locationId: string, updates: Partial<GHLLocation>): Promise<GHLLocation> {
    logger.info('Updating location', { locationId });

    const result = await this.request<{ location: GHLLocation }>(
      'PUT',
      `/locations/${locationId}`,
      updates
    );

    return result.location;
  }

  /**
   * List location custom fields
   */
  async listLocationCustomFields(locationId: string): Promise<Array<{ id: string; name: string; type: string }>> {
    logger.debug('Listing location custom fields', { locationId });

    const result = await this.request<{ customFields: Array<{ id: string; name: string; type: string }> }>(
      'GET',
      `/locations/${locationId}/customFields`
    );

    return result.customFields;
  }

  /**
   * Get location custom values
   */
  async getLocationCustomValues(locationId: string): Promise<Record<string, unknown>> {
    logger.debug('Getting location custom values', { locationId });

    const result = await this.request<{ customFields: Record<string, unknown> }>(
      'GET',
      `/locations/${locationId}/customValues`
    );

    return result.customFields;
  }

  /**
   * Update location custom values
   */
  async updateLocationCustomValues(locationId: string, customValues: Record<string, unknown>): Promise<Record<string, unknown>> {
    logger.info('Updating location custom values', { locationId });

    const result = await this.request<{ customFields: Record<string, unknown> }>(
      'PUT',
      `/locations/${locationId}/customValues`,
      { customFields: customValues }
    );

    return result.customFields;
  }

  // ==================== USERS ====================

  /**
   * List users
   */
  async listUsers(locationId: string): Promise<GHLUser[]> {
    logger.debug('Listing users', { locationId });

    const params = new URLSearchParams({ locationId });

    const result = await this.request<{ users: GHLUser[] }>(
      'GET',
      `/users/?${params.toString()}`
    );

    return result.users;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<GHLUser> {
    logger.debug('Getting user', { userId });

    const result = await this.request<{ user: GHLUser }>(
      'GET',
      `/users/${userId}`
    );

    return result.user;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<GHLUser>): Promise<GHLUser> {
    logger.info('Updating user', { userId });

    const result = await this.request<{ user: GHLUser }>(
      'PUT',
      `/users/${userId}`,
      updates
    );

    return result.user;
  }

  // ==================== TAGS ====================

  /**
   * List tags
   */
  async listTags(locationId: string): Promise<GHLTag[]> {
    logger.debug('Listing tags', { locationId });

    const result = await this.request<{ tags: GHLTag[] }>(
      'GET',
      `/locations/${locationId}/tags`
    );

    return result.tags;
  }

  /**
   * Create tag
   */
  async createTag(locationId: string, name: string, color?: string): Promise<GHLTag> {
    logger.info('Creating tag', { locationId, name });

    const result = await this.request<{ tag: GHLTag }>(
      'POST',
      `/locations/${locationId}/tags`,
      {
        name,
        color,
      }
    );

    return result.tag;
  }

  /**
   * Delete tag
   */
  async deleteTag(tagId: string): Promise<void> {
    logger.info('Deleting tag', { tagId });

    await this.request(
      'DELETE',
      `/tags/${tagId}`
    );
  }
}
