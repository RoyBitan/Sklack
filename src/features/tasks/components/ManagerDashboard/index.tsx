import React from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { useManagerDashboardLogic } from "./hooks/useManagerDashboardLogic";

// Components
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardStats } from "./components/DashboardStats";
import { DashboardControls } from "./components/DashboardControls";
import { DashboardTaskList } from "./components/DashboardTaskList";
import LoadingSpinner from "@/src/shared/components/ui/LoadingSpinner";
import UpgradeBanner from "@/components/UpgradeBanner";

// Feature Imports
import { InviteMemberModal } from "@/src/features/organizations";
import { AdminProposalInbox } from "@/src/features/proposals";
import { CreateTaskModal, EditTaskModal } from "@/src/features/tasks";

const ManagerDashboard: React.FC = () => {
  const {
    profile,
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
  } = useManagerDashboardLogic();

  if (loading && !filteredTasks.length && !searchQuery) { // Initial load
    return <LoadingSpinner message="טוען נתונים..." />;
  }

  return (
    <div className="space-y-8 md:space-y-12 animate-fade-in-up">
      {/* Personalized Header */}
      <DashboardHeader profile={profile} />

      {/* Stats Overview */}
      <DashboardStats
        stats={stats}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        setShowProposals={setShowProposals}
        scrollToTaskList={scrollToTaskList}
      />

      <UpgradeBanner />

      {/* Controls */}
      <DashboardControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setShowInviteModal={setShowInviteModal}
        setShowAddModal={setShowAddModal}
        profile={profile}
      />

      {/* Task List */}
      <DashboardTaskList
        loading={loading}
        filteredTasks={filteredTasks}
        hasMoreTasks={hasMoreTasks}
        loadMoreTasks={loadMoreTasks}
        getStatusLabel={getStatusLabel}
        getPriorityLabel={getPriorityLabel}
        handleApproveTask={handleApproveTask}
        handleRescheduleTask={handleRescheduleTask}
        handleCancelTask={handleCancelTask}
        handleDeleteTask={handleDeleteTask}
        setEditingTask={setEditingTask}
        setSearchQuery={setSearchQuery}
        setStatusFilter={setStatusFilter}
      />

      {/* Mobile FAB - Floating Action Button - Portal Only */}
      {typeof document !== "undefined" && createPortal(
        <button
          onClick={() => setShowAddModal(true)}
          className="md:hidden fab"
          aria-label="הוסף משימה חדשה"
        >
          <Plus size={28} strokeWidth={3} />
        </button>,
        document.body,
      )}

      {/* Modals */}
      {showAddModal && (
        <CreateTaskModal onClose={() => setShowAddModal(false)} />
      )}
      {showInviteModal && (
        <InviteMemberModal onClose={() => setShowInviteModal(false)} />
      )}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
      {showProposals && (
        <AdminProposalInbox onClose={() => setShowProposals(false)} />
      )}
    </div>
  );
};

export default ManagerDashboard;
