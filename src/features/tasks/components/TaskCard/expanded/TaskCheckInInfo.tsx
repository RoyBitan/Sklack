import React from "react";
import { Calendar, Clock, MessageCircle, Wrench } from "lucide-react";
import {
  getPaymentMethodLabel,
  getTaskFaultDescription,
  getTaskMileage,
  getTaskServiceTypes,
  Task,
} from "@/types";

interface TaskCheckInInfoProps {
  task: Task;
  isManager: boolean;
}

/**
 * TaskCheckInInfo - Displays check-in/appointment metadata
 * Uses type-safe helper functions from types.ts
 */
const TaskCheckInInfo: React.FC<TaskCheckInInfoProps> = ({
  task,
  isManager,
}) => {
  // Early return if no metadata type (not a check-in task)
  if (!isManager || !task.metadata?.type) return null;

  const { metadata } = task;
  const mileage = getTaskMileage(task);
  const serviceTypes = getTaskServiceTypes(task);
  const faultDescription = getTaskFaultDescription(task);

  return (
    <div className="animate-fade-in-up">
      <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] block mb-4">
        פרטי צ'ק-אין / בקשת תור
      </label>
      <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100/50 space-y-4 shadow-inner">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              מועד מבוקש
            </div>
            <div className="font-black text-gray-800 flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" />
              {metadata?.appointmentDate || "לא צוין"}{" "}
              {metadata?.appointmentTime || ""}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              קילומטראז'
            </div>
            <div className="font-black text-gray-800 flex items-center gap-2">
              <Clock size={14} className="text-blue-500" />
              {mileage || "---"} KM
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              סוג שירות
            </div>
            <div className="font-black text-gray-800 flex items-center gap-2">
              <Wrench size={14} className="text-blue-500" />
              {serviceTypes.length > 0 ? serviceTypes.join(", ") : "כללי"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              צורת תשלום
            </div>
            <div className="font-black text-gray-800 flex items-center gap-2">
              <MessageCircle size={14} className="text-blue-500" />
              {getPaymentMethodLabel(metadata?.paymentMethod)}
            </div>
          </div>
        </div>
        {faultDescription && (
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              תיאור התקלה / בקשה
            </div>
            <div className="text-sm font-bold text-gray-700 leading-relaxed italic">
              "{faultDescription}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCheckInInfo;
