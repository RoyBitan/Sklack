import React from "react";
import { Crown, Zap } from "lucide-react";

interface SubscriptionOverlayProps {
  canAddMoreTasks: boolean;
  activeTasksCount: number;
  onClose: () => void;
}

const SubscriptionOverlay: React.FC<SubscriptionOverlayProps> = ({
  canAddMoreTasks,
  activeTasksCount,
  onClose,
}) => {
  if (canAddMoreTasks) return null;

  return (
    <div className="absolute inset-0 z-[500] bg-white/95 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in text-center">
      <div className="max-w-md">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3 animate-bounce">
          <Crown size={40} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter">
          הגעת למגבלת המשימות! 🚀
        </h2>
        <p className="text-gray-500 font-bold mb-10 leading-relaxed text-lg">
          המסלול החינמי מאפשר עד 5 משימות פעילות בו-זמנית. כרגע יש לך{" "}
          <span className="text-black font-black">{activeTasksCount}</span>{" "}
          משימות. שדרג ל-Premium כדי לצמוח ללא הגבלה!
        </p>
        <div className="flex flex-col gap-4">
          <button className="bg-black text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
            <Zap size={20} fill="white" />
            שדרג עכשיו ל-Premium
          </button>
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all font-mono uppercase text-xs tracking-widest"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionOverlay;
