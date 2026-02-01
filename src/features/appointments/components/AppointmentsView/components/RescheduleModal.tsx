import React from "react";
import { toast } from "sonner";
import { Task } from "@/types";

interface RescheduleModalProps {
  reschedulingTask: Task | null;
  setReschedulingTask: (task: Task | null) => void;
  rescheduleData: { date: string; time: string };
  setRescheduleData: (data: { date: string; time: string }) => void;
  updateTask: (
    id: string,
    updates: Partial<Task>,
  ) => Promise<void>;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  reschedulingTask,
  setReschedulingTask,
  rescheduleData,
  setRescheduleData,
  updateTask,
}) => {
  if (!reschedulingTask) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-xl font-black mb-6 text-center">הצע מועד חדש</h3>
        <div className="space-y-4">
          <input
            type="date"
            className="input-premium h-14"
            value={rescheduleData.date}
            onChange={(e) =>
              setRescheduleData({
                ...rescheduleData,
                date: e.target.value,
              })}
          />
          <input
            type="time"
            className="input-premium h-14"
            value={rescheduleData.time}
            onChange={(e) =>
              setRescheduleData({
                ...rescheduleData,
                time: e.target.value,
              })}
          />
          <div className="flex gap-2 pt-4">
            <button
              onClick={async () => {
                if (!rescheduleData.date || !rescheduleData.time) return;
                await updateTask(reschedulingTask.id, {
                  metadata: {
                    ...reschedulingTask.metadata,
                    appointmentDate: rescheduleData.date,
                    appointmentTime: rescheduleData.time,
                  },
                });
                setReschedulingTask(null);
                toast.success("עודכן");
              }}
              className="flex-1 btn-primary py-4 rounded-xl font-black"
            >
              עדכן
            </button>
            <button
              onClick={() => setReschedulingTask(null)}
              className="bg-gray-100 text-gray-600 px-6 py-4 rounded-xl font-black"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
