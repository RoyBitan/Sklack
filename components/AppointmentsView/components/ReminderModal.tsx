import React from "react";
import { Appointment, Task } from "../../../types";

interface ReminderModalProps {
  showReminderOptions: Task | null;
  setShowReminderOptions: (task: Task | null) => void;
  approveTask: (
    id: string,
    sendNow: boolean,
    reminderAt: string,
  ) => Promise<void>;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  showReminderOptions,
  setShowReminderOptions,
  approveTask,
}) => {
  if (!showReminderOptions) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
        <h3 className="text-xl font-black mb-6">מתי תזכורת?</h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: "בעוד 30 דקות", mins: 30 },
            { label: "בעוד שעה", mins: 60 },
            { label: "בעוד שעתיים", mins: 120 },
          ].map((opt) => (
            <button
              key={opt.mins}
              onClick={async () => {
                const d = new Date();
                d.setMinutes(d.getMinutes() + opt.mins);
                await approveTask(
                  showReminderOptions.id,
                  false,
                  d.toISOString(),
                );
                setShowReminderOptions(null);
              }}
              className="bg-gray-50 p-4 rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowReminderOptions(null)}
            className="mt-4 text-gray-400 font-bold"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderModal;
