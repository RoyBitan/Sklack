import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTasks } from "../context/TasksContext";
import { TaskStatus } from "@/types";
import { playClickSound } from "@/utils/uiUtils";

export const useTaskActions = () => {
  const {
    updateTaskStatus,
    claimTask,
    releaseTask,
    deleteTask,
    approveTask,
  } = useTasks();

  const [isUpdating, setIsUpdating] = useState(false);

  const handleClaim = useCallback(async (taskId: string) => {
    playClickSound();
    setIsUpdating(true);
    try {
      await claimTask(taskId);
      toast.success("המשימה נלקחה");
    } catch (err) {
      console.error("Claim failed", err);
      toast.error("נכשל בלקיחת משימה");
    } finally {
      setIsUpdating(false);
    }
  }, [claimTask]);

  const handleRelease = useCallback(async (taskId: string) => {
    if (!window.confirm("האם אתה בטוח שברצונך לשחרר משימה זו חזרה למאגר?")) {
      return;
    }
    setIsUpdating(true);
    try {
      await releaseTask(taskId);
      toast.success("שוחרר בהצלחה");
    } catch (err) {
      console.error("Release failed", err);
      toast.error("שגיאה בשחרור");
    } finally {
      setIsUpdating(false);
    }
  }, [releaseTask]);

  const handleComplete = useCallback(async (taskId: string) => {
    playClickSound();
    setIsUpdating(true);
    try {
      await updateTaskStatus(taskId, TaskStatus.COMPLETED);
      toast.success("הושלם בהצלחה");
    } catch (err) {
      console.error("Complete failed", err);
      toast.error("נכשל בהשלמת המשימה");
    } finally {
      setIsUpdating(false);
    }
  }, [updateTaskStatus]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק משימה זו?")) return;
    setIsUpdating(true);
    try {
      await deleteTask(taskId);
      toast.success("נמחק בהצלחה");
    } catch (e) {
      console.error("Delete failed", e);
      toast.error("שגיאה במחיקה");
    } finally {
      setIsUpdating(false);
    }
  }, [deleteTask]);

  return {
    isUpdating,
    handleClaim,
    handleRelease,
    handleComplete,
    handleDelete,
    approveTask,
  };
};
