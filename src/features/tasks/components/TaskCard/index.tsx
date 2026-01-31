/**
 * TaskCard - Compound Component Pattern
 *
 * This component uses the compound component pattern to eliminate prop drilling.
 * All sub-components access data and actions via the TaskCardContext.
 *
 * Usage:
 *   <TaskCard task={task} />
 *
 * Or with compound pattern for customization:
 *   <TaskCard.Provider task={task}>
 *     <TaskCard.Header />
 *     <TaskCard.Actions />
 *     <TaskCard.Footer />
 *   </TaskCard.Provider>
 */

import React from "react";
import { Task } from "@/types";
import EditTaskModal from "../EditTaskModal";
import ProposalCreationModal from "@/components/ProposalCreationModal";
import HandOverModal from "@/components/HandOverModal";

import { TaskCardProvider, useTaskCard } from "./context";
import TaskCardHeader from "./TaskCardHeader";
import TaskCardOverlayActions from "./TaskCardOverlayActions";
import TaskCardApprovalActions from "./TaskCardApprovalActions";
import TaskCardMainActions from "./TaskCardMainActions";
import TaskCardStaffInfo from "./TaskCardStaffInfo";
import TaskCardFooter from "./TaskCardFooter";
import TaskCardExpanded from "./TaskCardExpanded";

interface TaskCardProps {
  task: Task;
}

/**
 * Internal TaskCard content that uses context
 */
const TaskCardContent: React.FC = () => {
  const {
    task,
    priorityInfo,
    expanded,
    setExpanded,
    showEditModal,
    setShowEditModal,
    showProposalModal,
    setShowProposalModal,
    showHandOverModal,
    setShowHandOverModal,
    confirmHandOver,
  } = useTaskCard();

  return (
    <div
      id={`task-${task.id}`}
      onClick={() => setExpanded(!expanded)}
      className={`card-premium overflow-hidden group transition-all duration-500 relative cursor-pointer ${
        expanded ? "scale-[1.01] shadow-xl z-10" : ""
      } ${priorityInfo.border} ${priorityInfo.ring}`}
    >
      {/* Absolute Admin Actions */}
      <TaskCardOverlayActions />

      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-4 md:gap-8">
          <div className="flex-1 space-y-2 md:space-y-4 text-right" dir="rtl">
            <TaskCardHeader />

            {/* Approval Actions (Manager only, waiting for approval) */}
            <TaskCardApprovalActions />

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <TaskCardMainActions />
            </div>

            <TaskCardStaffInfo />
          </div>

          <TaskCardFooter />
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div onClick={(e) => e.stopPropagation()} className="cursor-default">
          <TaskCardExpanded />
        </div>
      )}

      {/* Modals */}
      {showProposalModal && (
        <ProposalCreationModal
          taskId={task.id}
          onClose={() => setShowProposalModal(false)}
        />
      )}
      {showHandOverModal && (
        <HandOverModal
          onClose={() => setShowHandOverModal(false)}
          onConfirm={confirmHandOver}
        />
      )}
      {showEditModal && (
        <EditTaskModal
          task={task}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

/**
 * Main TaskCard component
 * Wraps content in TaskCardProvider for context access
 */
const TaskCard: React.FC<TaskCardProps> & {
  // Compound component static properties
  Provider: typeof TaskCardProvider;
  Header: typeof TaskCardHeader;
  OverlayActions: typeof TaskCardOverlayActions;
  ApprovalActions: typeof TaskCardApprovalActions;
  MainActions: typeof TaskCardMainActions;
  StaffInfo: typeof TaskCardStaffInfo;
  Footer: typeof TaskCardFooter;
  Expanded: typeof TaskCardExpanded;
} = ({ task }) => {
  return (
    <TaskCardProvider task={task}>
      <TaskCardContent />
    </TaskCardProvider>
  );
};

// Attach sub-components for compound pattern usage
TaskCard.Provider = TaskCardProvider;
TaskCard.Header = TaskCardHeader;
TaskCard.OverlayActions = TaskCardOverlayActions;
TaskCard.ApprovalActions = TaskCardApprovalActions;
TaskCard.MainActions = TaskCardMainActions;
TaskCard.StaffInfo = TaskCardStaffInfo;
TaskCard.Footer = TaskCardFooter;
TaskCard.Expanded = TaskCardExpanded;

export default TaskCard;

// Also export the hook for custom implementations
export { useTaskCard } from "./context";
