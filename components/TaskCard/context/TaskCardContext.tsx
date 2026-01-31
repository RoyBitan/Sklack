/**
 * TaskCard Context
 * Provides task data and actions to all TaskCard sub-components
 * Eliminates prop drilling throughout the TaskCard component tree
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../../contexts/AuthContext";
import { useTasks } from "../../../contexts/TasksContext";
import { supabase } from "../../../lib/supabase";
import { Priority, Profile, Task, TaskStatus, UserRole } from "../../../types";
import { playClickSound } from "../../../utils/uiUtils";

interface PriorityInfo {
  ring: string;
  border: string;
  label?: string;
}

interface TaskCardContextType {
  // Data
  task: Task;
  profile: Profile | null;
  assignedWorkers: Profile[];
  priorityInfo: PriorityInfo;

  // Computed
  isManager: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isAssignedToMe: boolean;
  isOverdue: boolean;
  timeLeft: number | null;

  // UI State
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  updating: boolean;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  showProposalModal: boolean;
  setShowProposalModal: (show: boolean) => void;
  showHandOverModal: boolean;
  setShowHandOverModal: (show: boolean) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;

  // Actions
  handleClaim: () => Promise<void>;
  handleRelease: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleComplete: () => Promise<void>;
  handleApprove: (
    sendToTeamNow: boolean,
    reminderAt?: string | null,
  ) => Promise<void>;
  handleReject: () => Promise<void>;
  confirmHandOver: (
    summary: { completed: string; remaining: string },
  ) => Promise<void>;
  navigateToDetails: () => void;
}

const TaskCardContext = createContext<TaskCardContextType | undefined>(
  undefined,
);

interface TaskCardProviderProps {
  task: Task;
  children: React.ReactNode;
}

export const TaskCardProvider: React.FC<TaskCardProviderProps> = (
  { task, children },
) => {
  const { profile } = useAuth();
  const {
    updateTaskStatus,
    claimTask,
    releaseTask,
    deleteTask,
    approveTask,
  } = useTasks();
  const navigate = useNavigate();

  // UI State
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showHandOverModal, setShowHandOverModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState<Profile[]>([]);

  // Role checks
  const isManager = profile?.role === UserRole.SUPER_MANAGER;
  const isStaff = profile?.role === UserRole.STAFF;
  const isCustomer = profile?.role === UserRole.CUSTOMER;
  const isAssignedToMe = task.assigned_to?.includes(profile?.id || "") ?? false;

  // Fetch assigned worker profiles
  useEffect(() => {
    const fetchWorkers = async () => {
      if (task.assigned_to && task.assigned_to.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, role, phone")
          .in("id", task.assigned_to);
        if (data) setAssignedWorkers(data as Profile[]);
      } else {
        setAssignedWorkers([]);
      }
    };
    fetchWorkers();
  }, [task.assigned_to]);

  // Computed values
  const isOverdue = useMemo(() => {
    if (
      !task.allotted_time ||
      task.status === TaskStatus.COMPLETED ||
      !task.started_at
    ) {
      return false;
    }
    const startedAt = new Date(task.started_at).getTime();
    const deadline = startedAt + task.allotted_time * 60 * 1000;
    return Date.now() > deadline;
  }, [task.started_at, task.allotted_time, task.status]);

  const timeLeft = useMemo(() => {
    if (
      !task.allotted_time ||
      task.status === TaskStatus.COMPLETED ||
      !task.started_at
    ) {
      return null;
    }
    const startedAt = new Date(task.started_at).getTime();
    const deadline = startedAt + task.allotted_time * 60 * 1000;
    const diff = deadline - Date.now();
    return Math.floor(diff / (1000 * 60));
  }, [task.started_at, task.allotted_time, task.status]);

  const priorityInfo = useMemo((): PriorityInfo => {
    const isUrgent = task.priority === Priority.URGENT ||
      task.priority === Priority.CRITICAL;
    if (isOverdue && isManager) {
      return {
        ring: "shadow-[0_0_40px_rgba(255,0,0,0.4)]",
        border: "border-4 border-red-600 animate-pulse-slow",
        label: "OVERDUE ⏰",
      };
    }
    if (isUrgent) {
      return {
        ring: "shadow-[0_0_30px_rgba(220,38,38,0.3)]",
        border: "border-2 border-red-500",
      };
    }
    return { ring: "", border: "border border-gray-100" };
  }, [task.priority, isOverdue, isManager]);

  // Actions
  const handleClaim = async () => {
    playClickSound();
    setUpdating(true);
    try {
      await claimTask(task.id);
    } catch (err) {
      console.error("Claim failed", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRelease = async () => {
    // If staff is releasing, show the mandatory Hand-over modal
    if (isStaff && isAssignedToMe) {
      setShowHandOverModal(true);
      return;
    }

    if (!window.confirm("האם אתה בטוח שברצונך לשחרר משימה זו חזרה למאגר?")) {
      return;
    }
    setUpdating(true);
    try {
      await releaseTask(task.id);
    } catch (err) {
      console.error("Release failed", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק משימה זו?")) return;
    try {
      await deleteTask(task.id);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleComplete = async () => {
    playClickSound();
    setUpdating(true);
    try {
      await updateTaskStatus(task.id, TaskStatus.COMPLETED);
    } catch (err) {
      console.error("Complete failed", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = async (
    sendToTeamNow: boolean,
    reminderAt?: string | null,
  ) => {
    setUpdating(true);
    try {
      await approveTask(task.id, sendToTeamNow, reminderAt);
    } catch (err) {
      console.error("Approve failed", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    setUpdating(true);
    try {
      await updateTaskStatus(task.id, TaskStatus.CANCELLED);
    } catch (err) {
      console.error("Reject failed", err);
    } finally {
      setUpdating(false);
    }
  };

  const confirmHandOver = async (
    summary: { completed: string; remaining: string },
  ) => {
    setUpdating(true);
    try {
      // Add hand-over notes to metadata
      const newMetadata = {
        ...(task.metadata || {}),
        handOverNotes: {
          completed: summary.completed,
          remaining: summary.remaining,
          by: profile?.full_name,
          at: new Date().toISOString(),
        },
      };

      await updateTaskStatus(task.id, task.status); // Trigger refresh
      const { error } = await supabase
        .from("tasks")
        .update({ metadata: newMetadata })
        .eq("id", task.id);

      if (error) throw error;

      await releaseTask(task.id);
      toast.success("המשימה שוחררה עם סיכום עבודה");
      setShowHandOverModal(false);
    } catch (err) {
      console.error("Hand-over failed", err);
      toast.error("שגיאה בתהליך השחרור");
    } finally {
      setUpdating(false);
    }
  };

  const navigateToDetails = () => {
    navigate(`/tasks/${task.id}`);
  };

  const value: TaskCardContextType = {
    // Data
    task,
    profile,
    assignedWorkers,
    priorityInfo,

    // Computed
    isManager,
    isStaff,
    isCustomer,
    isAssignedToMe,
    isOverdue,
    timeLeft,

    // UI State
    expanded,
    setExpanded,
    updating,
    showEditModal,
    setShowEditModal,
    showProposalModal,
    setShowProposalModal,
    showHandOverModal,
    setShowHandOverModal,
    showChat,
    setShowChat,

    // Actions
    handleClaim,
    handleRelease,
    handleDelete,
    handleComplete,
    handleApprove,
    handleReject,
    confirmHandOver,
    navigateToDetails,
  };

  return (
    <TaskCardContext.Provider value={value}>
      {children}
    </TaskCardContext.Provider>
  );
};

/**
 * Hook to access TaskCard context
 * Must be used within a TaskCardProvider
 */
export const useTaskCard = (): TaskCardContextType => {
  const context = useContext(TaskCardContext);
  if (!context) {
    throw new Error("useTaskCard must be used within a TaskCardProvider");
  }
  return context;
};
