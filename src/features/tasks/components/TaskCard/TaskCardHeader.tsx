import React from "react";
import { Calendar, User } from "lucide-react";
import { formatLicensePlate } from "@/utils/formatters";
import { useTaskCard } from "./context";
import { getTaskOwnerName } from "@/types";

/**
 * TaskCard Header Component
 * Displays task title, vehicle info, priority badges
 * Uses TaskCard context - no props needed!
 */
const TaskCardHeader: React.FC = () => {
  const { task, isOverdue, isManager, priorityInfo } = useTaskCard();

  return (
    <div className="flex-1 space-y-2 md:space-y-4 text-right" dir="rtl">
      <div className="space-y-2">
        <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter leading-tight transition-transform">
          {task.title}
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          {task.vehicle && (
            <>
              <div className="text-base font-black text-gray-400 italic">
                {task.vehicle.model}
              </div>
              <div className="bg-[#FFE600] border-2 border-black rounded-xl px-3 py-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rotate-[-1deg] group-hover:rotate-0 transition-transform duration-500">
                <span className="font-mono font-black text-sm tracking-widest ltr">
                  {formatLicensePlate(task.vehicle.plate)}
                </span>
              </div>
            </>
          )}
          {isOverdue && isManager && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-bounce-subtle">
              OVERDUE ⏰
            </div>
          )}
          {priorityInfo.label && (
            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black animate-bounce-subtle shadow-lg">
              {priorityInfo.label}
            </div>
          )}
        </div>

        {/* Consolidated Quick Info Row */}
        <div className="flex items-center gap-4 text-gray-500">
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-gray-300" />
            <span className="text-xs font-black">
              {getTaskOwnerName(task)}
            </span>
          </div>
          {(task.vehicle_year || task.vehicle?.year) && (
            <div className="flex items-center gap-1.5 border-r border-gray-100 pr-4">
              <Calendar size={14} className="text-gray-300" />
              <span className="text-xs font-black font-mono">
                {task.vehicle_year || task.vehicle?.year}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCardHeader;
