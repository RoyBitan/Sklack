import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Task, TaskStatus, UserRole } from "@/types";
import {
  TaskCreationError,
  TaskNotFoundError,
  tasksService,
  TaskUpdateError,
  vehiclesService,
} from "@/services";

interface TasksContextType {
  tasks: Task[];
  loading: boolean;
  hasMoreTasks: boolean;
  refreshTasks: () => Promise<void>;
  loadMoreTasks: () => Promise<void>;

  // Actions
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  claimTask: (taskId: string) => Promise<void>;
  releaseTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  approveTask: (
    taskId: string,
    sendToTeamNow: boolean,
    reminderAt?: string | null,
  ) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();
  const { sendSystemNotification } = useNotifications();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshTasks = useCallback(async () => {
    const curr = profileRef.current;
    if (!curr?.org_id && curr?.role !== UserRole.CUSTOMER) return;

    setLoading(true);
    try {
      // Get vehicle IDs if customer
      let vehicleIds: string[] = [];
      if (curr.role === UserRole.CUSTOMER) {
        vehicleIds = await vehiclesService.getVehicleIdsByOwner(curr.id);
      }

      const { tasks: fetchedTasks, hasMore } = await tasksService.fetchTasks({
        orgId: curr.org_id || undefined,
        userId: curr.id,
        userRole: curr.role,
        vehicleIds,
        limit: 20,
      });

      setTasks(fetchedTasks);
      setHasMoreTasks(hasMore);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreTasks = useCallback(async () => {
    const curr = profileRef.current;
    if (!curr?.org_id && curr?.role !== UserRole.CUSTOMER) return;
    if (loading || !hasMoreTasks || tasks.length === 0) return;

    const lastTask = tasks[tasks.length - 1];
    setLoading(true);

    try {
      let vehicleIds: string[] = [];
      if (curr.role === UserRole.CUSTOMER) {
        vehicleIds = await vehiclesService.getVehicleIdsByOwner(curr.id);
      }

      const { tasks: moreTasks, hasMore } = await tasksService.fetchTasks({
        orgId: curr.org_id || undefined,
        userId: curr.id,
        userRole: curr.role,
        vehicleIds,
        limit: 20,
        cursor: lastTask.created_at,
      });

      setTasks((prev) => [...prev, ...moreTasks]);
      setHasMoreTasks(hasMore);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMoreTasks, tasks]);

  // --- Actions using Service Layer ---

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status } : t)
      );

      try {
        // Get task info for notification
        const taskInfo = await tasksService.getTaskBasicInfo(taskId);

        // Update via service
        await tasksService.updateTaskStatus(taskId, status);

        // Send notification if completed
        if (status === TaskStatus.COMPLETED && taskInfo.customer_id) {
          await sendSystemNotification(
            taskInfo.customer_id,
            "הטיפול הושלם! ✅",
            `הטיפול ב"${taskInfo.title}" הושלם.`,
            "TASK_COMPLETED",
            taskId,
          );
        }
        toast.success("סטטוס עודכן");
      } catch (e) {
        console.error("updateTaskStatus error:", e);
        toast.error("נכשל בעדכון");
        refreshTasks();
      }
    },
    [refreshTasks, sendSystemNotification],
  );

  const claimTask = useCallback(async (taskId: string) => {
    const curr = profileRef.current;
    if (!curr) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
            ...t,
            assigned_to: [...(t.assigned_to || []), curr.id],
            status: TaskStatus.IN_PROGRESS,
          }
          : t
      )
    );

    try {
      await tasksService.claimTask(taskId, curr.id);
      toast.success("המשימה נלקחה");
      await refreshTasks(); // Full refresh to get joined data
    } catch (e) {
      console.error("claimTask error:", e);
      toast.error("נכשל בלקיחת משימה");
      refreshTasks();
    }
  }, [refreshTasks]);

  const releaseTask = useCallback(async (taskId: string) => {
    const curr = profileRef.current;
    if (!curr) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
            ...t,
            assigned_to: (t.assigned_to || []).filter((id) => id !== curr.id),
          }
          : t
      )
    );

    try {
      await tasksService.releaseTask(taskId, curr.id);
      toast.success("שוחרר בהצלחה");
    } catch (e) {
      console.error("releaseTask error:", e);
      toast.error("שגיאה בשחרור");
      refreshTasks();
    }
  }, [refreshTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await tasksService.cancelTask(taskId);
      toast.success("בוטל בהצלחה");
    } catch (e) {
      console.error("deleteTask error:", e);
      toast.error("שגיאה בביטול");
      refreshTasks();
    }
  }, [refreshTasks]);

  const approveTask = useCallback(
    async (
      taskId: string,
      sendToTeamNow: boolean,
      reminderAt?: string | null,
    ) => {
      try {
        await tasksService.approveTask(taskId, sendToTeamNow, reminderAt);
        toast.success("אושר בהצלחה");
        await refreshTasks();
      } catch (e) {
        console.error("approveTask error:", e);
        toast.error("שגיאה באישור");
      }
    },
    [refreshTasks],
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      try {
        await tasksService.updateTask(taskId, updates);
        await refreshTasks();
      } catch (e) {
        console.error("updateTask error:", e);
        throw e; // let caller handle
      }
    },
    [refreshTasks],
  );

  // Realtime Logic
  useEffect(() => {
    if (!profile?.org_id) return;
    refreshTasks();

    const channel = supabase.channel(`tasks-${profile.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `org_id=eq.${profile.org_id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTasks((prev) => [payload.new as Task, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === payload.new.id ? { ...t, ...payload.new } : t
            )
          );
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.org_id, refreshTasks]);

  const value = {
    tasks,
    loading,
    hasMoreTasks,
    refreshTasks,
    loadMoreTasks,
    updateTaskStatus,
    claimTask,
    releaseTask,
    deleteTask,
    approveTask,
    updateTask,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
};
