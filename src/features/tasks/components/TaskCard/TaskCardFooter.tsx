import React from "react";
import { Calendar, Clock } from "lucide-react";
import { useTaskCard } from "./context";

/**
 * TaskCard Footer Component
 * Displays time info and deadline status
 * Uses TaskCard context - no props needed!
 */
const TaskCardFooter: React.FC = () => {
  const { task, isManager, timeLeft } = useTaskCard();

  return (
    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 lg:border-r border-gray-100 lg:pr-6 mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0">
      <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {isManager && timeLeft !== null && (
          <div className="flex items-center gap-1.5 text-blue-600">
            <Clock size={12} className="text-blue-400" />
            <span>
              {timeLeft > 0 ? `${timeLeft} דק׳ לסיום` : "זמן עבר! 🚨"}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 border-r border-gray-100 pr-4">
          <Clock size={12} className="text-gray-300" />
          <span>
            {new Date(task.created_at).toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 border-r border-gray-100 pr-4">
          <Calendar size={12} className="text-gray-300" />
          <span>
            {new Date(task.created_at).toLocaleDateString("he-IL", {
              day: "2-digit",
              month: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCardFooter;
