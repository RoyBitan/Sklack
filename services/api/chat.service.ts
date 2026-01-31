/**
 * Chat Service
 * Centralizes all task message/chat-related database operations
 */

import { supabase } from "../../lib/supabase";
import { TaskMessage } from "../../types";
import { ChatMessageError } from "../errors";

// DTOs
export interface SendMessageDTO {
  task_id: string;
  org_id: string;
  sender_id: string;
  content: string;
  is_internal?: boolean;
}

class ChatService {
  private readonly selectQuery =
    `*, sender:profiles(full_name, role, avatar_url)`;

  /**
   * Get all messages for a task
   */
  async getTaskMessages(taskId: string): Promise<TaskMessage[]> {
    const { data, error } = await supabase
      .from("task_messages")
      .select(this.selectQuery)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[ChatService] getTaskMessages error:", error);
      throw error;
    }

    return (data || []) as TaskMessage[];
  }

  /**
   * Send a message in a task chat
   */
  async sendMessage(dto: SendMessageDTO): Promise<TaskMessage> {
    const { data, error } = await supabase
      .from("task_messages")
      .insert({
        task_id: dto.task_id,
        org_id: dto.org_id,
        sender_id: dto.sender_id,
        content: dto.content,
        is_internal: dto.is_internal || false,
      })
      .select(this.selectQuery)
      .single();

    if (error || !data) {
      throw new ChatMessageError(error);
    }

    return data as TaskMessage;
  }

  /**
   * Get external (customer-visible) messages only
   */
  async getExternalMessages(taskId: string): Promise<TaskMessage[]> {
    const { data, error } = await supabase
      .from("task_messages")
      .select(this.selectQuery)
      .eq("task_id", taskId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []) as TaskMessage[];
  }

  /**
   * Get internal (staff-only) messages
   */
  async getInternalMessages(taskId: string): Promise<TaskMessage[]> {
    const { data, error } = await supabase
      .from("task_messages")
      .select(this.selectQuery)
      .eq("task_id", taskId)
      .eq("is_internal", true)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []) as TaskMessage[];
  }
}

// Export singleton instance
export const chatService = new ChatService();
