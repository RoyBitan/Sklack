import React from "react";
import { Archive, CheckCircle2, Clock, Wrench } from "lucide-react";
import { TaskStatus } from "../../../types";

interface DashboardStatsProps {
  stats: {
    pendingApproval: number;
    waiting: number;
    inProgress: number;
    completed: number;
  };
  statusFilter: TaskStatus | "ALL";
  setStatusFilter: (filter: TaskStatus | "ALL") => void;
  setShowProposals: (show: boolean) => void;
  scrollToTaskList: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  statusFilter,
  setStatusFilter,
  setShowProposals,
  scrollToTaskList,
}) => {
  const handleFilterClick = (filter: TaskStatus) => {
    setStatusFilter(
      statusFilter === filter ? "ALL" : filter,
    );
    scrollToTaskList();
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
      <button
        onClick={() => handleFilterClick(TaskStatus.WAITING)}
        className={`card-premium p-6 md:p-8 flex items-center gap-4 md:gap-6 group transition-all ${
          statusFilter === TaskStatus.WAITING
            ? "ring-4 ring-orange-500 scale-105 shadow-2xl"
            : ""
        }`}
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
          <Clock size={24} className="md:w-8 md:h-8" />
        </div>
        <div className="text-start">
          <div className="text-2xl md:text-3xl font-black tracking-tighter">
            {stats.waiting}
          </div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
            ממתין לצוות
          </div>
        </div>
      </button>

      <button
        onClick={() => handleFilterClick(TaskStatus.IN_PROGRESS)}
        className={`card-premium p-6 md:p-8 flex items-center gap-4 md:gap-6 group transition-all ${
          statusFilter === TaskStatus.IN_PROGRESS
            ? "ring-4 ring-blue-500 scale-105 shadow-2xl"
            : ""
        }`}
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
          <Wrench size={24} className="md:w-8 md:h-8" />
        </div>
        <div className="text-start">
          <div className="text-2xl md:text-3xl font-black tracking-tighter">
            {stats.inProgress}
          </div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
            בטיפול פעיל
          </div>
        </div>
      </button>

      <button
        onClick={() => handleFilterClick(TaskStatus.COMPLETED)}
        className={`card-premium p-6 md:p-8 flex items-center gap-4 md:gap-6 group transition-all ${
          statusFilter === TaskStatus.COMPLETED
            ? "ring-4 ring-green-500 scale-105 shadow-2xl"
            : ""
        }`}
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
          <CheckCircle2 size={24} className="md:w-8 md:h-8" />
        </div>
        <div className="text-start">
          <div className="text-2xl md:text-3xl font-black tracking-tighter">
            {stats.completed}
          </div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
            הושלמו
          </div>
        </div>
      </button>

      <button
        onClick={() => setShowProposals(true)}
        className="card-premium p-6 md:p-8 flex items-center gap-4 md:gap-6 group transition-all hover:ring-4 hover:ring-purple-500 hover:scale-105 hover:shadow-2xl"
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
          <Archive size={24} className="md:w-8 md:h-8" />
        </div>
        <div className="text-start">
          <div className="text-2xl md:text-3xl font-black tracking-tighter">
            הצעות
          </div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
            אישור תוספות
          </div>
        </div>
      </button>
    </div>
  );
};
