import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AppointmentsHeaderProps {
  weekDays: Date[];
  navigateWeek: (direction: number) => void;
}

const AppointmentsHeader: React.FC<AppointmentsHeaderProps> = ({
  weekDays,
  navigateWeek,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 bg-white/50 p-2 rounded-2xl border border-gray-100 mb-4">
      <button
        onClick={() => navigateWeek(-1)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
        title="שבוע קודם"
      >
        <ChevronRight size={24} />
      </button>

      <div className="flex flex-col items-center">
        <h2 className="text-lg font-black tracking-tight text-gray-900">
          {weekDays[0].toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          })} - {weekDays[6].toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </h2>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-1">
          Weekly Schedule Overview
        </div>
      </div>

      <button
        onClick={() => navigateWeek(1)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
        title="שבוע הבא"
      >
        <ChevronLeft size={24} />
      </button>
    </div>
  );
};

export default AppointmentsHeader;
