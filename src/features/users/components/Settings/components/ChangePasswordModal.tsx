import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Key, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { scrollToFormStart } from "@/utils/uiUtils";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user: authUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToFormStart(formRef);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("הסיסמאות החדשות אינן תואמות");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("הסיסמה החדשה חייבת להכיל לפחות 6 תווים");
      return;
    }

    setLoading(true);

    try {
      // 1. Verify current password by signing in again
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error("הסיסמה הנוכחית אינה נכונה");
        setLoading(false);
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("הסיסמה שונתה בהצלחה");
      onClose();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error
        ? err.message
        : "שגיאה בשינוי הסיסמה";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        ref={formRef}
        className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-sm animate-scale-in shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="text-start">
            <h3 className="text-2xl font-black tracking-tight">
              שינוי סיסמה
            </h3>
            <p className="text-gray-400 text-xs font-bold mt-1">
              עדכן את פרטי הגישה שלך
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1 text-start">
              סיסמה נוכחית
            </label>
            <input
              type="password"
              required
              className="input-premium h-14 text-base"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1 text-start">
                סיסמה חדשה
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input-premium h-14 text-base"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1 text-start">
                אימות סיסמה חדשה
              </label>
              <input
                type="password"
                required
                className="input-premium h-14 text-base"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-700 hover:bg-gray-200 transition-all"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-800 shadow-xl active:scale-95 disabled:bg-gray-400 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "מעדכן..." : (
                <>
                  <Key size={18} />
                  עדכן סיסמה
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ChangePasswordModal;
