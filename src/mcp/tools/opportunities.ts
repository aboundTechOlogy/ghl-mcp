/**
 * GoHighLevel Opportunity MCP Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';
import { logger } from '../../utils/logger.js';

// Schema definitions
const GetOpportunitySchema = z.object({
  opportunityId: z.string().describe('The opportunity ID to retrieve'),
});

const ListOpportunitiesSchema = z.object({
  locationId: z.string().describe('The GHL location ID'),
  pipelineId: z.string().optional().describe('Optional pipeline ID to filter by'),
});

const CreateOpportunitySchema = z.object({
  locationId: z.string().describe('The GHL location ID'),
  name: z.string().describe('Opportunity name'),
  pipelineId: z.string().describe('Pipeline ID'),
  pipelineStageId: z.string().describe('Pipeline stage ID'),
  contactId: z.string().optional().describe('Associated contact ID'),
  monetaryValue: z.number().optional().describe('Deal value'),
  status: z.string().optional().describe('Opportunity status'),
  assignedTo: z.string().optional().describe('Assigned user ID'),
  notes: z.string().optional().describe('Opportunity notes'),
  source: z.string().optional().describe('Lead source'),
  customFields: z.array(z.object({
    id: z.string().describe('Custom field ID'),
    value: z.unknown().describe('Custom field value'),
  })).optional().describe('Custom field values'),
});

const UpdateOpportunitySchema = z.object({
  opportunityId: z.string().describe('The opportunity ID to update'),
  name: z.string().optional().describe('Updated opportunity name'),
  pipelineStageId: z.string().optional().describe('Updated pipeline stage'),
  status: z.string().optional().describe('Updated status'),
  monetaryValue: z.number().optional().describe('Updated deal value'),
  assignedTo: z.string().optional().describe('Updated assigned user'),
  notes: z.string().optional().describe('Updated notes'),
  customFields: z.array(z.object({
    id: z.string().describe('Custom field ID'),
    value: z.unknown().describe('Custom field value'),
  })).optional().describe('Updated custom fields'),
});

const DeleteOpportunitySchema = z.object({
  opportunityId: z.string().describe('The opportunity ID to delete'),
});

export class OpportunityTools {
  constructor(private client: GHLClient) {}

  /**
   * Get all opportunity tool definitions
   */
  getToolDefinitions() {
    return [
      {
        name: 'ghl_get_opportunity',
        description: 'Get an opportunity by ID',
        inputSchema: GetOpportunitySchema,
      },
      {
        name: 'ghl_list_opportunities',
        description: 'List opportunities for a location',
        inputSchema: ListOpportunitiesSchema,
      },
      {
        name: 'ghl_create_opportunity',
        description: 'Create a new opportunity',
        inputSchema: CreateOpportunitySchema,
      },
      {
        name: 'ghl_update_opportunity',
        description: 'Update an existing opportunity',
        inputSchema: UpdateOpportunitySchema,
      },
      {
        name: 'ghl_delete_opportunity',
        description: 'Delete an opportunity',
        inputSchema: DeleteOpportunitySchema,
      },
    ];
  }

  /**
   * Execute an opportunity tool
   */
  async executeTool(name: string, args: unknown): Promise<unknown> {
    logger.debug(`Executing tool: ${name}`, args);

    switch (name) {
      case 'ghl_get_opportunity':
        return this.getOpportunity(args);
      case 'ghl_list_opportunities':
        return this.listOpportunities(args);
      case 'ghl_create_opportunity':
        return this.createOpportunity(args);
      case 'ghl_update_opportunity':
        return this.updateOpportunity(args);
      case 'ghl_delete_opportunity':
        return this.deleteOpportunity(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getOpportunity(args: unknown) {
    const parsed = GetOpportunitySchema.parse(args);

    const opportunity = await this.client.getOpportunity(parsed.opportunityId);

    return {
      success: true,
      opportunity,
    };
  }

  private async listOpportunities(args: unknown) {
    const parsed = ListOpportunitiesSchema.parse(args);

    const opportunities = await this.client.listOpportunities(
      parsed.locationId,
      parsed.pipelineId
    );

    return {
      success: true,
      opportunities,
      count: opportunities.length,
    };
  }

  private async createOpportunity(args: unknown) {
    const parsed = CreateOpportunitySchema.parse(args);

    const opportunity = await this.client.createOpportunity(parsed);

    return {
      success: true,
      opportunity,
    };
  }

  private async updateOpportunity(args: unknown) {
    const parsed = UpdateOpportunitySchema.parse(args);

    const { opportunityId, ...updates } = parsed;

    const opportunity = await this.client.updateOpportunity(opportunityId, updates);

    return {
      success: true,
      opportunity,
    };
  }

  private async deleteOpportunity(args: unknown) {
    const parsed = DeleteOpportunitySchema.parse(args);

    await this.client.deleteOpportunity(parsed.opportunityId);

    return {
      success: true,
      message: `Opportunity ${parsed.opportunityId} deleted successfully`,
    };
  }
}
