import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, Loader, Save, X } from "lucide-react";
import { toast } from "sonner";
import { scrollToFormStart } from "@/shared/utils/uiUtils";
import { useEffect, useRef } from "react";

interface HandOverModalProps {
  onClose: () => void;
  onConfirm: (
    summary: { completed: string; remaining: string },
  ) => Promise<void>;
}

const HandOverModal: React.FC<HandOverModalProps> = (
  { onClose, onConfirm },
) => {
  const [completed, setCompleted] = useState("");
  const [remaining, setRemaining] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollToFormStart(scrollRef.current);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completed.trim() || !remaining.trim()) {
      toast.error("אנא מלא את כל השדות");
      return;
    }

    setLoading(true);
    try {
      await onConfirm({ completed, remaining });
      onClose();
    } catch (err) {
      console.error("Hand-over failed:", err);
      toast.error("שגיאה בשמירת סיכום העבודה");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up">
      <div
        ref={scrollRef}
        className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-blue-500" />
            סיכום עבודה (העברת מקל)
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6"
        >
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-start">
              מה הושלם עד כה?
            </label>
            <textarea
              required
              value={completed}
              onChange={(e) => setCompleted(e.target.value)}
              className="input-premium h-24 py-3 resize-none"
              placeholder="פרט איזה חלקים מהמשימה כבר בוצעו..."
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-start">
              משימות שנותרו לביצוע?
            </label>
            <textarea
              required
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              className="input-premium h-24 py-3 resize-none"
              placeholder="מה על העובד הבא לעשות?"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-black text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : (
              <>
                <Save size={18} />
                שמור ושחרר משימה
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default HandOverModal;
