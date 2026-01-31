import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { TaskStatus } from "../../types";
import { useTaskCard } from "./context";

/**
 * TaskCard Approval Actions Component
 * Displays approve/reject buttons for managers on pending tasks
 * Uses TaskCard context - no props needed!
 */
const TaskCardApprovalActions: React.FC = () => {
  const { task, isManager, handleApprove, handleReject } = useTaskCard();

  if (!isManager || task.status !== TaskStatus.WAITING_FOR_APPROVAL) {
    return null;
  }

  const handleApproveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const requestedDate = task.metadata?.appointmentDate || today;

    if (requestedDate === today) {
      const sendNow = window.confirm(
        "האם להעביר את המשימה ללוח העבודה של הצוות עכשיו?",
      );
      if (sendNow) {
        await handleApprove(true);
      } else {
        const reminder = window.prompt("הזן שעה לתזכורת (HH:mm):", "10:00");
        if (reminder) {
          const [hours, minutes] = reminder.split(":");
          const reminderDate = new Date();
          reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          await handleApprove(false, reminderDate.toISOString());
        } else {
          await handleApprove(false);
        }
      }
    } else {
      await handleApprove(false);
      alert(`המשימה תוזמנה לתאריך ${requestedDate}`);
    }
  };

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("האם לדחות את הבקשה? המשימה תבוטל.")) {
      handleReject();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-1 animate-fade-in-up">
      <button
        onClick={handleApproveClick}
        className="bg-green-600 text-white px-4 h-10 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-green-700 transition-all shadow-md active:scale-95"
      >
        <CheckCircle2 size={16} /> אשר בקשה
      </button>

      <button
        onClick={handleRejectClick}
        className="bg-red-500 text-white px-4 h-10 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-600 transition-all shadow-md active:scale-95"
      >
        <AlertCircle size={16} /> דחה
      </button>
    </div>
  );
};

export default TaskCardApprovalActions;
