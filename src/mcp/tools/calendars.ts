/**
 * GoHighLevel Calendar MCP Tools
 */

import { z } from 'zod';
import { GHLClient } from '../ghl/client.js';
import { logger } from '../../utils/logger.js';

// Schema definitions
const ListCalendarsSchema = z.object({
  locationId: z.string().describe('The GHL location ID'),
});

const GetCalendarSchema = z.object({
  calendarId: z.string().describe('The calendar ID to retrieve'),
});

const ListAppointmentsSchema = z.object({
  calendarId: z.string().describe('The calendar ID'),
  startDate: z.string().optional().describe('Start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('End date (ISO 8601 format)'),
});

const CreateAppointmentSchema = z.object({
  calendarId: z.string().describe('The calendar ID'),
  contactId: z.string().describe('Contact ID for the appointment'),
  startTime: z.string().describe('Start time (ISO 8601 format)'),
  endTime: z.string().describe('End time (ISO 8601 format)'),
  title: z.string().optional().describe('Appointment title'),
  notes: z.string().optional().describe('Appointment notes'),
  status: z.string().optional().describe('Appointment status'),
});

const UpdateAppointmentSchema = z.object({
  appointmentId: z.string().describe('The appointment ID to update'),
  startTime: z.string().optional().describe('Updated start time'),
  endTime: z.string().optional().describe('Updated end time'),
  title: z.string().optional().describe('Updated title'),
  notes: z.string().optional().describe('Updated notes'),
  status: z.string().optional().describe('Updated status'),
});

const DeleteAppointmentSchema = z.object({
  appointmentId: z.string().describe('The appointment ID to delete'),
});

export class CalendarTools {
  constructor(private client: GHLClient) {}

  /**
   * Get all calendar tool definitions
   */
  getToolDefinitions() {
    return [
      {
        name: 'ghl_list_calendars',
        description: 'List calendars for a location',
        inputSchema: ListCalendarsSchema,
      },
      {
        name: 'ghl_get_calendar',
        description: 'Get a calendar by ID',
        inputSchema: GetCalendarSchema,
      },
      {
        name: 'ghl_list_appointments',
        description: 'List appointments for a calendar',
        inputSchema: ListAppointmentsSchema,
      },
      {
        name: 'ghl_create_appointment',
        description: 'Create a new appointment',
        inputSchema: CreateAppointmentSchema,
      },
      {
        name: 'ghl_update_appointment',
        description: 'Update an existing appointment',
        inputSchema: UpdateAppointmentSchema,
      },
      {
        name: 'ghl_delete_appointment',
        description: 'Delete an appointment',
        inputSchema: DeleteAppointmentSchema,
      },
    ];
  }

  /**
   * Execute a calendar tool
   */
  async executeTool(name: string, args: unknown): Promise<unknown> {
    logger.debug(`Executing tool: ${name}`, args);

    switch (name) {
      case 'ghl_list_calendars':
        return this.listCalendars(args);
      case 'ghl_get_calendar':
        return this.getCalendar(args);
      case 'ghl_list_appointments':
        return this.listAppointments(args);
      case 'ghl_create_appointment':
        return this.createAppointment(args);
      case 'ghl_update_appointment':
        return this.updateAppointment(args);
      case 'ghl_delete_appointment':
        return this.deleteAppointment(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async listCalendars(args: unknown) {
    const parsed = ListCalendarsSchema.parse(args);

    const calendars = await this.client.listCalendars(parsed.locationId);

    return {
      success: true,
      calendars,
      count: calendars.length,
    };
  }

  private async getCalendar(args: unknown) {
    const parsed = GetCalendarSchema.parse(args);

    const calendar = await this.client.getCalendar(parsed.calendarId);

    return {
      success: true,
      calendar,
    };
  }

  private async listAppointments(args: unknown) {
    const parsed = ListAppointmentsSchema.parse(args);

    const appointments = await this.client.listAppointments(
      parsed.calendarId,
      parsed.startDate,
      parsed.endDate
    );

    return {
      success: true,
      appointments,
      count: appointments.length,
    };
  }

  private async createAppointment(args: unknown) {
    const parsed = CreateAppointmentSchema.parse(args);

    const appointment = await this.client.createAppointment(parsed);

    return {
      success: true,
      appointment,
    };
  }

  private async updateAppointment(args: unknown) {
    const parsed = UpdateAppointmentSchema.parse(args);

    const { appointmentId, ...updates } = parsed;

    const appointment = await this.client.updateAppointment(appointmentId, updates);

    return {
      success: true,
      appointment,
    };
  }

  private async deleteAppointment(args: unknown) {
    const parsed = DeleteAppointmentSchema.parse(args);

    await this.client.deleteAppointment(parsed.appointmentId);

    return {
      success: true,
      message: `Appointment ${parsed.appointmentId} deleted successfully`,
    };
  }
}
