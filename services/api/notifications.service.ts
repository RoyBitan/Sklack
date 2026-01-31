/**
 * Notifications Service
 * Centralizes all notification-related database operations
 */

import { supabase } from "../../lib/supabase";
import {
  Notification as AppNotification,
  NotificationMetadata,
} from "../../types";
import { NotificationCreationError } from "../errors";

// DTOs
export interface CreateNotificationDTO {
  org_id: string;
  user_id: string;
  actor_id?: string;
  title: string;
  message: string;
  type: string;
  reference_id?: string;
  url?: string;
  metadata?: NotificationMetadata;
}

export interface FetchNotificationsOptions {
  userId: string;
  limit?: number;
}

class NotificationsService {
  /**
   * Fetch notifications for a user
   */
  async fetchNotifications(options: FetchNotificationsOptions): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
  }> {
    const { userId, limit = 20 } = options;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[NotificationsService] fetchNotifications error:", error);
      throw error;
    }

    const notifications = (data || []) as AppNotification[];
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return { notifications, unreadCount };
  }

  /**
   * Create a single notification
   */
  async createNotification(
    dto: CreateNotificationDTO,
  ): Promise<AppNotification> {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        org_id: dto.org_id,
        user_id: dto.user_id,
        actor_id: dto.actor_id,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        reference_id: dto.reference_id,
        url: dto.url,
        metadata: dto.metadata,
        is_read: false,
      })
      .select()
      .single();

    if (error || !data) {
      throw new NotificationCreationError(error);
    }

    return data as AppNotification;
  }

  /**
   * Send notification to a single user (convenience method)
   */
  async sendSystemNotification(
    orgId: string,
    userId: string,
    actorId: string,
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ): Promise<void> {
    await this.createNotification({
      org_id: orgId,
      user_id: userId,
      actor_id: actorId,
      title,
      message,
      type,
      reference_id: referenceId,
    });
  }

  /**
   * Send notifications to multiple users
   */
  async notifyMultiple(
    orgId: string,
    userIds: string[],
    actorId: string,
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const notifications = userIds.map((userId) => ({
      org_id: orgId,
      user_id: userId,
      actor_id: actorId,
      title,
      message,
      type,
      reference_id: referenceId,
      is_read: false,
    }));

    const { error } = await supabase.from("notifications").insert(
      notifications,
    );

    if (error) {
      throw new NotificationCreationError(error);
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
