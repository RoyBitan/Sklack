import React from "react";
import { ArrowRightLeft } from "lucide-react";

interface HandOverNotes {
  completed: string;
  remaining: string;
  by: string;
  at: string;
}

interface TaskHandoverInfoProps {
  handOverNotes?: HandOverNotes;
}

const TaskHandoverInfo: React.FC<TaskHandoverInfoProps> = (
  { handOverNotes },
) => {
  if (!handOverNotes) return null;

  return (
    <div className="mb-8 animate-fade-in-up border-r-8 border-amber-500 bg-amber-50 p-8 rounded-[2.5rem] shadow-md">
      <div className="flex items-center gap-3 mb-4 text-amber-700">
        <ArrowRightLeft size={24} />
        <label className="text-sm font-black uppercase tracking-[0.2em]">
          סיכום העברת מקל (Baton Notes)
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-2">
            מה בוצע ע"י {handOverNotes.by}
          </div>
          <div className="text-lg font-bold text-gray-800 leading-relaxed italic">
            "{handOverNotes.completed}"
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-2">
            משימות שנותרו לביצוע
          </div>
          <div className="text-lg font-black text-amber-700 leading-relaxed underline decoration-amber-300 underline-offset-4">
            "{handOverNotes.remaining}"
          </div>
        </div>
      </div>
      <div className="mt-4 text-[9px] font-black text-amber-400 text-end uppercase tracking-[0.1em]">
        הועבר ב-
        {new Date(handOverNotes.at).toLocaleString("he-IL")}
      </div>
    </div>
  );
};

export default TaskHandoverInfo;
