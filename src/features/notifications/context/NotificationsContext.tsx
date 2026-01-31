import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/services/api/client";
import { useAuth } from "@/features/auth";
import { Notification as AppNotification } from "@/types";
import { notificationsService } from "../services/notifications.service";

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  sendSystemNotification: (
    userId: string,
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ) => Promise<void>;
  notifyMultiple: (
    userIds: string[],
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ) => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshNotifications = useCallback(async () => {
    if (!profileRef.current?.id) return;
    setLoading(true);
    try {
      const result = await notificationsService.fetchNotifications({
        userId: profileRef.current.id,
        limit: 20,
      });

      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendSystemNotification = useCallback(async (
    userId: string,
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ) => {
    const curr = profileRef.current;
    if (!curr?.org_id) return;

    await notificationsService.sendSystemNotification(
      curr.org_id,
      userId,
      curr.id,
      title,
      message,
      type,
      referenceId,
    );
  }, []);

  const notifyMultiple = useCallback(async (
    userIds: string[],
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ) => {
    const curr = profileRef.current;
    if (!curr?.org_id || userIds.length === 0) return;

    await notificationsService.notifyMultiple(
      curr.org_id,
      userIds,
      curr.id,
      title,
      message,
      type,
      referenceId,
    );
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    await notificationsService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!profileRef.current?.id) return;

    await notificationsService.markAllAsRead(profileRef.current.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  // Subscription
  useEffect(() => {
    if (!profile?.id) return;
    refreshNotifications();

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          // Frontend guard: Don't show notification if the current user caused it
          if (
            newNotif.actor_id === profile.id ||
            newNotif.metadata?.actor_id === profile.id
          ) {
            return;
          }

          setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, refreshNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    sendSystemNotification,
    notifyMultiple,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
};
