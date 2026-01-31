import React from "react";
import { MessageCircle } from "lucide-react";
import TaskChat from "../TaskChat";
import TaskHandoverInfo from "./expanded/TaskHandoverInfo";
import TaskCustomerVehicleInfo from "./expanded/TaskCustomerVehicleInfo";
import TaskCheckInInfo from "./expanded/TaskCheckInInfo";
import { useTaskCard } from "./context";

/**
 * TaskCard Expanded Content Component
 * Shows detailed task info, chat, and customer/vehicle info
 * Uses TaskCard context - no props needed!
 */
const TaskCardExpanded: React.FC = () => {
  const { task, profile, isManager, showChat, setShowChat } = useTaskCard();

  return (
    <div className="bg-gray-50/70 p-6 md:p-12 border-t-2 border-gray-100 animate-fade-in-up">
      {/* Hand-over Notes if they exist - HIGHLIGHTED AT TOP */}
      <TaskHandoverInfo
        handOverNotes={task.metadata?.handOverNotes}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <div className="space-y-8">
          <TaskCustomerVehicleInfo
            task={task}
            profile={profile}
            isManager={isManager}
          />
        </div>

        <div className="space-y-8">
          {/* Check-In Details / Metadata */}
          <TaskCheckInInfo task={task} isManager={isManager} />

          {/* Chat Section */}
          <div className="animate-fade-in-up">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`w-full py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
                showChat
                  ? "bg-black text-white shadow-xl"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <MessageCircle size={18} />
              {showChat ? "Close Garage Chat" : "Open Garage Chat"}
            </button>

            {showChat && (
              <div className="mt-6">
                <TaskChat taskId={task.id} />
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6">
              תיאור והערות טכנאי
            </label>
            <div className="card-premium p-8 bg-white shadow-sm italic text-gray-600 text-lg leading-relaxed relative min-h-[150px]">
              <MessageCircle
                size={24}
                className="text-gray-200 absolute top-4 left-4"
              />
              {task.description || "לא הוזנו הערות נוספות למשימה זו."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCardExpanded;
