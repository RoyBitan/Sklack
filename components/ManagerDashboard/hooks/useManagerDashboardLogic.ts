import React, { useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useData } from "../../../contexts/DataContext";
import { Priority, Task, TaskStatus, UserRole } from "../../../types";
import { useDebounce } from "use-debounce";

export const useManagerDashboardLogic = () => {
  const { profile } = useAuth();
  const {
    tasks,
    loading,
    deleteTask,
    updateTaskStatus,
    updateTask,
    hasMoreTasks,
    loadMoreTasks,
  } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() =>
    tasks.filter((t) => {
      const hasAssignment = t.assigned_to && t.assigned_to.length > 0;
      const isPending =
        (t.status === TaskStatus.WAITING || t.status === TaskStatus.APPROVED) &&
        !hasAssignment;
      const isActive = t.status === TaskStatus.IN_PROGRESS || hasAssignment;
      const isCompleted = t.status === TaskStatus.COMPLETED;

      let matchesStatus = true;
      if (statusFilter === TaskStatus.WAITING) {
        matchesStatus = isPending;
      } else if (statusFilter === TaskStatus.IN_PROGRESS) {
        matchesStatus = isActive;
      } else if (statusFilter === TaskStatus.COMPLETED) {
        matchesStatus = isCompleted;
      } else if (statusFilter === "ALL") {
        matchesStatus = t.status !== TaskStatus.WAITING_FOR_APPROVAL &&
          t.status !== TaskStatus.SCHEDULED &&
          t.status !== TaskStatus.COMPLETED;
      } else {
        matchesStatus = t.status === statusFilter;
      }

      const matchesSearch =
        t.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        t.vehicle?.plate.includes(debouncedSearchQuery) ||
        t.vehicle?.model.toLowerCase().includes(
          debouncedSearchQuery.toLowerCase(),
        );
      return matchesStatus && matchesSearch;
    }), [tasks, statusFilter, debouncedSearchQuery]);

  const stats = {
    pendingApproval:
      tasks.filter((t) => t.status === TaskStatus.WAITING_FOR_APPROVAL).length,
    waiting:
      tasks.filter((t) =>
        (t.status === TaskStatus.WAITING || t.status === TaskStatus.APPROVED) &&
        (!t.assigned_to || t.assigned_to.length === 0)
      ).length,
    inProgress: tasks.filter((t) =>
      t.status === TaskStatus.IN_PROGRESS ||
      (t.assigned_to && t.assigned_to.length > 0)
    ).length,
    completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
  };

  const getStatusLabel = (s: TaskStatus) => {
    switch (s) {
      case TaskStatus.WAITING:
        return "ממתין לצוות";
      case TaskStatus.APPROVED:
        return "אושר - טרם החל";
      case TaskStatus.IN_PROGRESS:
        return "בטיפול";
      case TaskStatus.COMPLETED:
        return "הושלם";
      case TaskStatus.CUSTOMER_APPROVAL:
        return "אישור לקוח";
      case TaskStatus.PAUSED:
        return "מושהה";
      case TaskStatus.WAITING_FOR_APPROVAL:
        return "בקשה חדשה";
      case TaskStatus.SCHEDULED:
        return "מתוזמן";
      default:
        return s;
    }
  };

  const getPriorityLabel = (p: Priority) => {
    switch (p) {
      case Priority.NORMAL:
        return "רגיל";
      case Priority.URGENT:
        return "דחוף";
      case Priority.CRITICAL:
        return "קריטי";
      default:
        return p;
    }
  };

  // Logic to handle quick actions row
  const handleApproveTask = async (task: Task) => {
    if (window.confirm("האם לאשר את הבקשה ולהעביר לטיפול?")) {
      await updateTaskStatus(task.id, TaskStatus.APPROVED);
    }
  };

  const handleRescheduleTask = async (task: Task) => {
    const date = task.metadata?.appointmentDate || "";
    const time = task.metadata?.appointmentTime || "";
    const response = prompt(
      "הזמן מועד חדש (YYYY-MM-DD HH:mm):",
      `${date} ${time}`,
    );
    if (response) {
      const [newDate, newTime] = response.split(" ");
      await updateTask(task.id, {
        metadata: {
          ...task.metadata,
          appointmentDate: newDate,
          appointmentTime: newTime || time,
        },
      });
      alert("המועד עודכן בהצלחה.");
    }
  };

  const handleCancelTask = async (task: Task) => {
    if (window.confirm("האם לבטל את הבקשה?")) {
      await updateTaskStatus(task.id, TaskStatus.CANCELLED);
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק משימה זו?")) {
      deleteTask(task.id);
    }
  };

  const scrollToTaskList = () => {
    document.getElementById("task-list")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return {
    profile,
    tasks,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showAddModal,
    setShowAddModal,
    showInviteModal,
    setShowInviteModal,
    showProposals,
    setShowProposals,
    editingTask,
    setEditingTask,
    filteredTasks,
    stats,
    hasMoreTasks,
    loadMoreTasks,
    getStatusLabel,
    getPriorityLabel,
    handleApproveTask,
    handleRescheduleTask,
    handleCancelTask,
    handleDeleteTask,
    scrollToTaskList,
  };
};
