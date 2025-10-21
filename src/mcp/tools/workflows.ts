/**
 * GoHighLevel Workflow MCP Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';
import { logger } from '../../utils/logger.js';

// Schema definitions
const ListWorkflowsSchema = z.object({
  locationId: z.string().describe('The GHL location ID'),
});

const GetWorkflowSchema = z.object({
  workflowId: z.string().describe('The workflow ID to retrieve'),
});

export class WorkflowTools {
  constructor(private client: GHLClient) {}

  /**
   * Get all workflow tool definitions
   */
  getToolDefinitions() {
    return [
      {
        name: 'ghl_list_workflows',
        description: 'List workflows for a location (read-only)',
        inputSchema: ListWorkflowsSchema,
      },
      {
        name: 'ghl_get_workflow',
        description: 'Get a workflow by ID (read-only)',
        inputSchema: GetWorkflowSchema,
      },
    ];
  }

  /**
   * Execute a workflow tool
   */
  async executeTool(name: string, args: unknown): Promise<unknown> {
    logger.debug(`Executing tool: ${name}`, args);

    switch (name) {
      case 'ghl_list_workflows':
        return this.listWorkflows(args);
      case 'ghl_get_workflow':
        return this.getWorkflow(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async listWorkflows(args: unknown) {
    const parsed = ListWorkflowsSchema.parse(args);

    const workflows = await this.client.listWorkflows(parsed.locationId);

    return {
      success: true,
      workflows,
      count: workflows.length,
    };
  }

  private async getWorkflow(args: unknown) {
    const parsed = GetWorkflowSchema.parse(args);

    const workflow = await this.client.getWorkflow(parsed.workflowId);

    return {
      success: true,
      workflow,
    };
  }
}
