/**
 * Appointments Service
 * Centralizes all appointment-related database operations
 */

import { supabase } from "@/lib/supabase";

import {
  Appointment,
  AppointmentMetadata,
  AppointmentStatus,
  TaskStatus,
  UserRole,
} from "@/types";
import {
  AppointmentCreationError,
  AppointmentNotFoundError,
} from "@/src/shared/utils/errors";

// DTOs
export interface CreateAppointmentDTO {
  org_id: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  vehicle_id?: string | null;
  vehicle_plate?: string;
  service_type: string;
  description?: string | null;
  appointment_date: string;
  appointment_time: string;
  duration?: string;
  mileage?: number;
  status?: AppointmentStatus;
  metadata?: AppointmentMetadata;
}

export interface UpdateAppointmentDTO {
  status?: AppointmentStatus;
  appointment_date?: string;
  appointment_time?: string;
  description?: string | null;
  task_id?: string | null;
  metadata?: AppointmentMetadata;
}

export interface FetchAppointmentsOptions {
  orgId?: string;
  userId?: string;
  userRole?: UserRole;
  vehicleIds?: string[];
  limit?: number;
}

export class AppointmentsService {
  private readonly selectQuery = `*, customer:profiles(*), vehicle:vehicles(*)`;

  /**
   * Fetch appointments with proper filtering
   */
  async fetchAppointments(
    options: FetchAppointmentsOptions,
  ): Promise<Appointment[]> {
    const { orgId, userId, userRole, vehicleIds = [], limit = 20 } = options;

    let query = supabase
      .from("appointments")
      .select(this.selectQuery)
      .neq("status", "CANCELLED")
      .order("appointment_date", { ascending: false })
      .limit(limit);

    if (userRole === UserRole.CUSTOMER && userId) {
      const conditions = [
        `customer_id.eq.${userId}`,
        `created_by.eq.${userId}`,
      ];
      if (vehicleIds.length > 0) {
        conditions.push(`vehicle_id.in.(${vehicleIds.join(",")})`);
      }
      query = query.or(conditions.join(","));
    } else if (orgId) {
      query = query.eq("org_id", orgId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[AppointmentsService] fetchAppointments error:", error);
      throw error;
    }

    return (data || []) as Appointment[];
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointment(appointmentId: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .select(this.selectQuery)
      .eq("id", appointmentId)
      .single();

    if (error || !data) {
      throw new AppointmentNotFoundError(appointmentId);
    }

    return data as Appointment;
  }

  /**
   * Create a new appointment
   */
  async createAppointment(dto: CreateAppointmentDTO): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        ...dto,
        status: dto.status || AppointmentStatus.PENDING,
      })
      .select(this.selectQuery)
      .single();

    if (error || !data) {
      throw new AppointmentCreationError(error);
    }

    return data as Appointment;
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(
    appointmentId: string,
    updates: UpdateAppointmentDTO,
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", appointmentId)
      .select(this.selectQuery)
      .single();

    if (error || !data) {
      throw new AppointmentNotFoundError(appointmentId);
    }

    return data as Appointment;
  }

  /**
   * Approve an appointment
   */
  async approveAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.APPROVED,
    });
  }

  /**
   * Reject an appointment
   */
  async rejectAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.REJECTED,
    });
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointment(appointmentId, {
      status: AppointmentStatus.CANCELLED,
    });
  }

  /**
   * Create a task from an approved appointment
   */
  async createTaskFromAppointment(
    appointmentId: string,
    creatorId: string,
  ): Promise<{ taskId: string }> {
    const appointment = await this.getAppointment(appointmentId);

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        org_id: appointment.org_id,
        customer_id: appointment.customer_id,
        vehicle_id: appointment.vehicle_id,
        title: `טיפול לרכב (מתור ${appointment.appointment_date})`,
        description: appointment.description || "נוצר אוטומטית מתור",
        status: TaskStatus.WAITING,
        priority: "NORMAL",
        created_by: creatorId,
        metadata: {
          source_appointment_id: appointmentId,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
        },
      })
      .select("id")
      .single();

    if (error || !task) {
      throw error;
    }

    // Link task to appointment
    await this.updateAppointment(appointmentId, {
      task_id: task.id,
    });

    return { taskId: task.id };
  }
}

// Export singleton instance
export const appointmentsService = new AppointmentsService();
