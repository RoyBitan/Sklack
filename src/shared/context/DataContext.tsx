import React, { createContext, useContext, useMemo } from "react";
import {
  Appointment,
  Notification as AppNotification,
  OrganizationSettings,
  PreCheckInData,
  Profile,
  Task,
  TaskMessage,
  TaskStatus,
  Vehicle,
} from "@/types";

// Import Hooks from Features
import { useNotifications } from "@/src/features/notifications";
import { useTasks } from "@/src/features/tasks";
import { useVehicles } from "@/src/features/vehicles";
import { useAppointments } from "@/src/features/appointments";
import { useProposals } from "@/src/features/proposals";
import { useUsers } from "@/src/features/users";
import { useChat } from "@/src/features/chat";

// Define Interface (Must match existing usage)
interface DataContextType {
  tasks: Task[];
  appointments: Appointment[];
  vehicles: Vehicle[];
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshData: () => Promise<void>;
  addVehicle: (vehicle: Partial<Vehicle>) => Promise<void>;
  removeVehicle: (plate: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  claimTask: (taskId: string) => Promise<void>;
  releaseTask: (taskId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<Profile>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addProposal: (
    taskId: string,
    proposal: {
      description: string;
      price?: number | null;
      photo_url?: string | null;
      audio_url?: string | null;
    },
  ) => Promise<void>;
  updateProposal: (
    taskId: string,
    proposalId: string,
    data: Partial<{ status: string; price: number | null }>,
  ) => Promise<void>;
  submitCheckIn: (data: PreCheckInData) => Promise<void>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  updateOrganization: (
    data: Partial<OrganizationSettings & { name?: string; logo_url?: string }>,
  ) => Promise<void>;
  approveTask: (
    taskId: string,
    sendToTeamNow: boolean,
    reminderAt?: string | null,
  ) => Promise<void>;
  approveAppointment: (
    appointmentId: string,
    createTaskNow: boolean,
  ) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  lookupCustomerByPhone: (
    phone: string,
  ) => Promise<{ customer: Profile; vehicles: Vehicle[] } | null>;
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
  fetchTeamMembers: () => Promise<Profile[]>;
  loadMoreTasks: () => Promise<void>;
  hasMoreTasks: boolean;
  promoteToAdmin: (userId: string) => Promise<void>;
  sendMessage: (
    taskId: string,
    content: string,
    isInternal?: boolean,
  ) => Promise<void>;
  getTaskMessages: (taskId: string) => Promise<TaskMessage[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Consume all domain contexts
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    sendSystemNotification,
    notifyMultiple,
  } = useNotifications();

  const {
    tasks,
    loading: tasksLoading,
    hasMoreTasks,
    refreshTasks,
    loadMoreTasks,
    updateTaskStatus,
    claimTask,
    releaseTask,
    deleteTask,
    approveTask,
    updateTask,
  } = useTasks();

  const {
    vehicles,
    loading: vehiclesLoading,
    refreshVehicles,
    addVehicle,
    removeVehicle,
  } = useVehicles();

  const {
    appointments,
    loading: appointmentsLoading,
    refreshAppointments,
    approveAppointment,
    submitCheckIn,
  } = useAppointments();

  const {
    addProposal,
    updateProposal,
  } = useProposals();

  const {
    promoteToAdmin,
    updateUser,
    fetchTeamMembers,
    lookupCustomerByPhone,
    updateOrganization,
  } = useUsers();

  const {
    sendMessage,
    getTaskMessages,
  } = useChat();

  // Combine Refresh
  const refreshData = async () => {
    await Promise.all([
      refreshNotifications(),
      refreshTasks(),
      refreshVehicles(),
      refreshAppointments(),
    ]);
  };

  const loading = tasksLoading || vehiclesLoading || appointmentsLoading ||
    notificationsLoading;

  const value = useMemo(
    () => ({
      tasks,
      appointments,
      vehicles,
      notifications,
      unreadCount,
      loading,
      refreshData,
      addVehicle,
      removeVehicle,
      updateTaskStatus,
      claimTask,
      releaseTask,
      updateUser,
      deleteTask,
      addProposal,
      updateProposal,
      submitCheckIn,
      updateTask,
      updateOrganization,
      approveTask,
      approveAppointment,
      markNotificationRead,
      markAllNotificationsRead,
      lookupCustomerByPhone,
      sendSystemNotification,
      notifyMultiple,
      fetchTeamMembers,
      loadMoreTasks,
      hasMoreTasks,
      promoteToAdmin,
      sendMessage,
      getTaskMessages,
    }),
    [
      tasks,
      appointments,
      vehicles,
      notifications,
      unreadCount,
      loading,
      hasMoreTasks,
      refreshData,
      addVehicle,
      removeVehicle,
      updateTaskStatus,
      claimTask,
      releaseTask,
      updateUser,
      deleteTask,
      addProposal,
      updateProposal,
      submitCheckIn,
      updateTask,
      updateOrganization,
      approveTask,
      approveAppointment,
      markNotificationRead,
      markAllNotificationsRead,
      lookupCustomerByPhone,
      sendSystemNotification,
      notifyMultiple,
      fetchTeamMembers,
      loadMoreTasks,
      promoteToAdmin,
      sendMessage,
      getTaskMessages,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
