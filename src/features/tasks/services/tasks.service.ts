/**
 * Tasks Service
 * Centralizes all task-related database operations
 */

import { supabase } from "@/lib/supabase";
import { Task, TaskMetadata, TaskStatus, UserRole } from "@/types";
import {
  TaskCreationError,
  TaskNotFoundError,
  TaskUpdateError,
} from "@/src/shared/utils/errors";
import { withRetry } from "@/src/shared/utils/retry";

// DTOs for type-safe API calls
export interface CreateTaskDTO {
  org_id: string;
  title: string;
  description?: string;
  vehicle_id?: string | null;
  customer_id?: string | null;
  created_by: string;
  priority?: string;
  status?: TaskStatus;
  price?: number | null;
  allotted_time?: number | null;
  metadata?: TaskMetadata;
  scheduled_reminder_at?: string | null;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: string;
  assigned_to?: string[];
  price?: number | null;
  allotted_time?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  scheduled_reminder_at?: string | null;
  metadata?: TaskMetadata;
}

export interface FetchTasksOptions {
  orgId?: string;
  userId?: string;
  userRole?: UserRole;
  vehicleIds?: string[];
  limit?: number;
  cursor?: string; // created_at of last item for pagination
}

export class TasksService {
  private readonly selectQuery = `
    *, 
    organization:organizations(name), 
    vehicle:vehicles(*, owner:profiles(full_name)), 
    creator:profiles!tasks_created_by_fkey(*), 
    proposals:proposals(*)
  `;

  /**
   * Fetch tasks with proper filtering based on user role
   */
  async fetchTasks(
    options: FetchTasksOptions,
  ): Promise<{ tasks: Task[]; hasMore: boolean }> {
    return withRetry(async () => {
      const { orgId, userId, userRole, vehicleIds = [], limit = 20, cursor } =
        options;

      let query = supabase
        .from("tasks")
        .select(this.selectQuery)
        .neq("status", "CANCELLED")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

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
        console.error("[TasksService] fetchTasks error:", error);
        throw error;
      }

      return {
        tasks: (data || []) as Task[],
        hasMore: (data || []).length === limit,
      };
    });
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .select(this.selectQuery)
      .eq("id", taskId)
      .single();

    if (error || !data) {
      throw new TaskNotFoundError(taskId);
    }

    return data as Task;
  }

  /**
   * Creates a new task in the system
   * @param dto - Task creation data
   * @returns Promise resolving to created task
   * @throws {TaskCreationError} When task creation fails
   */
  async createTask(dto: CreateTaskDTO): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        ...dto,
        status: dto.status || TaskStatus.WAITING,
        priority: dto.priority || "NORMAL",
        assigned_to: [],
      })
      .select(this.selectQuery)
      .single();

    if (error || !data) {
      throw new TaskCreationError(error);
    }

    return data as Task;
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: UpdateTaskDTO): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select(this.selectQuery)
      .single();

    if (error || !data) {
      throw new TaskUpdateError(error);
    }

    return data as Task;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const updates: UpdateTaskDTO = { status };

    if (status === TaskStatus.IN_PROGRESS) {
      updates.started_at = new Date().toISOString();
    } else if (status === TaskStatus.COMPLETED) {
      updates.completed_at = new Date().toISOString();
    }

    return this.updateTask(taskId, updates);
  }

  /**
   * Assign user to task
   */
  async claimTask(taskId: string, userId: string): Promise<Task> {
    // First get the current task to check assigned_to
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("id", taskId)
      .single();

    if (!currentTask) {
      throw new TaskNotFoundError(taskId);
    }

    const assigned_to = currentTask.assigned_to || [];
    if (!assigned_to.includes(userId)) {
      assigned_to.push(userId);
    }

    return this.updateTask(taskId, {
      assigned_to,
      status: TaskStatus.IN_PROGRESS,
      started_at: new Date().toISOString(),
    });
  }

  /**
   * Release user from task
   */
  async releaseTask(taskId: string, userId: string): Promise<Task> {
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("id", taskId)
      .single();

    if (!currentTask) {
      throw new TaskNotFoundError(taskId);
    }

    const assigned_to = (currentTask.assigned_to || []).filter(
      (id: string) => id !== userId,
    );

    return this.updateTask(taskId, {
      assigned_to,
      status: assigned_to.length === 0 ? TaskStatus.WAITING : undefined,
    });
  }

  /**
   * Cancel a task (soft delete)
   */
  async cancelTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from("tasks")
      .update({ status: TaskStatus.CANCELLED })
      .eq("id", taskId);

    if (error) {
      throw new TaskUpdateError(error);
    }
  }

  /**
   * Approve a task for team
   */
  async approveTask(
    taskId: string,
    sendToTeamNow: boolean,
    reminderAt?: string | null,
  ): Promise<Task> {
    const status = sendToTeamNow ? TaskStatus.WAITING : TaskStatus.SCHEDULED;

    return this.updateTask(taskId, {
      status,
      scheduled_reminder_at: reminderAt,
    });
  }

  /**
   * Get basic task info (for notifications, etc.)
   */
  async getTaskBasicInfo(
    taskId: string,
  ): Promise<{ customer_id: string | null; title: string }> {
    const { data, error } = await supabase
      .from("tasks")
      .select("customer_id, title")
      .eq("id", taskId)
      .single();

    if (error || !data) {
      throw new TaskNotFoundError(taskId);
    }

    return data;
  }
}

// Export singleton instance
export const tasksService = new TasksService();
