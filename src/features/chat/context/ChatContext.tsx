import React, { createContext, useCallback, useContext } from "react";
import { useAuth } from "@/features/auth";
import { useNotifications } from "@/features/notifications";
import { TaskMessage } from "@/types";
import { chatService, SendMessageDTO } from "../services/chat.service";

interface ChatContextType {
  sendMessage: (
    taskId: string,
    content: string,
    isInternal?: boolean,
  ) => Promise<void>;
  getTaskMessages: (taskId: string) => Promise<TaskMessage[]>;
  getExternalMessages: (taskId: string) => Promise<TaskMessage[]>;
  getInternalMessages: (taskId: string) => Promise<TaskMessage[]>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();
  const { sendSystemNotification } = useNotifications();

  const sendMessage = useCallback(
    async (taskId: string, content: string, isInternal = false) => {
      if (!profile?.org_id) return;

      const dto: SendMessageDTO = {
        task_id: taskId,
        org_id: profile.org_id,
        sender_id: profile.id,
        content,
        is_internal: isInternal,
      };

      await chatService.sendMessage(dto);
      // Notification logic can be added here if needed
    },
    [profile],
  );

  const getTaskMessages = useCallback(async (taskId: string) => {
    return await chatService.getTaskMessages(taskId);
  }, []);

  const getExternalMessages = useCallback(async (taskId: string) => {
    return await chatService.getExternalMessages(taskId);
  }, []);

  const getInternalMessages = useCallback(async (taskId: string) => {
    return await chatService.getInternalMessages(taskId);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        sendMessage,
        getTaskMessages,
        getExternalMessages,
        getInternalMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat error");
  return context;
};
