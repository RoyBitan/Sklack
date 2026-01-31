import React from "react";
import { Phone, Wrench } from "lucide-react";
import { useTaskCard } from "./context";

/**
 * TaskCard Staff Info Component
 * Displays assigned workers info with call button
 * Uses TaskCard context - no props needed!
 */
const TaskCardStaffInfo: React.FC = () => {
  const { assignedWorkers, isManager, isStaff } = useTaskCard();

  if ((!isManager && !isStaff) || assignedWorkers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="p-1 px-2.5 bg-blue-50/50 rounded-lg border border-blue-100/50 flex items-center gap-2">
        <Wrench size={12} className="text-blue-500" />
        <span className="text-[10px] font-black text-blue-700">
          באחריות: {assignedWorkers.map((w) => w.full_name).join(", ")}
        </span>
        {(isManager || isStaff) && assignedWorkers[0]?.phone && (
          <a
            href={`tel:${assignedWorkers[0].phone}`}
            className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all active:scale-90"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone size={10} />
          </a>
        )}
      </div>
    </div>
  );
};

export default TaskCardStaffInfo;
