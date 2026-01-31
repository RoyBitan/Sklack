import React from "react";
import {
  Activity,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { TaskStatus } from "../../types";
import { useTaskCard } from "./context";

/**
 * TaskCard Main Actions Component
 * Displays claim, release, complete, upsell buttons
 * Uses TaskCard context - no props needed!
 */
const TaskCardMainActions: React.FC = () => {
  const {
    task,
    isManager,
    isStaff,
    isAssignedToMe,
    updating,
    navigateToDetails,
    handleClaim,
    handleRelease,
    setShowProposalModal,
    handleComplete,
  } = useTaskCard();

  if (!isManager && !isStaff) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigateToDetails();
        }}
        className="h-10 px-4 bg-purple-50 text-purple-700 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-all border border-purple-100 active:scale-95 group/btn"
      >
        <Activity
          size={14}
          className="text-purple-500 group-hover/btn:text-white"
        />
        <span>פרטים וניהול</span>
      </button>

      <div className="flex items-center gap-2">
        {!isAssignedToMe
          ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClaim();
              }}
              disabled={updating}
              title="שייך אליי"
              className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md active:scale-90"
            >
              <Play size={16} fill="white" />
            </button>
          )
          : (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRelease();
                }}
                disabled={updating}
                title="שחרר משימה"
                className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-all active:scale-90"
              >
                <RotateCcw size={16} />
              </button>
              {task.status !== TaskStatus.COMPLETED && (
                <div className="flex gap-2">
                  {isStaff && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProposalModal(true);
                      }}
                      className="h-10 px-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-95 group/upsell"
                    >
                      <Sparkles
                        size={16}
                        className="text-amber-500 group-hover/upsell:text-white"
                      />
                      תיקון נוסף
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComplete();
                    }}
                    disabled={updating}
                    className="h-10 px-4 bg-green-500 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-green-600 transition-all shadow-md active:scale-95"
                  >
                    <CheckCircle2 size={16} />
                    סיים טיפול
                  </button>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default TaskCardMainActions;
