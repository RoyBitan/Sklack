import React, { useState } from "react";
import { MessageCircle, Phone, Send, X } from "lucide-react";
import { useAuth } from "@/features/auth";
import { supabase } from "@/services/api/client";
import { scrollToFormStart } from "@/shared/utils/uiUtils";
import { useEffect, useRef } from "react";

interface InviteMemberModalProps {
  onClose: () => void;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollToFormStart(scrollRef.current);
    }
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !profile?.org_id) return;

    setLoading(true);
    setError("");

    try {
      // Create invitation in database
      const { error: inviteError } = await supabase
        .from("invitations")
        .insert({
          phone: phone.trim(),
          org_id: profile.org_id,
          invited_by: profile.id,
          status: "PENDING",
        });

      if (inviteError) {
        if (inviteError.code === "23505") {
          throw new Error("הזמנה למספר זה כבר נשלחה");
        }
        throw inviteError;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error
        ? err.message
        : "שגיאה בשליחת ההזמנה";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppInvite = () => {
    if (!profile?.organization?.garage_code) return;

    const message = encodeURIComponent(
      `היי! 🎉\n\n` +
        `הוזמנת להצטרף למוסך ${profile.organization.name}!\n\n` +
        `📱 קוד המוסך: ${profile.organization.garage_code}\n\n` +
        `הורד את האפליקציה והזן את הקוד כדי להתחיל לעבוד.`,
    );
    const whatsappUrl = `https://wa.me/${
      phone.replace(/[^0-9]/g, "")
    }?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div
        ref={scrollRef}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-black"></div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                הזמן חבר צוות
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">
                הזן מספר טלפון
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleInvite}
            className="space-y-6"
          >
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                מספר טלפון
              </label>
              <div className="relative">
                <Phone
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="tel"
                  required
                  className="input-premium h-14 pr-12 text-lg"
                  placeholder="050-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm font-bold">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-600 text-sm font-bold">
                  ההזמנה נשלחה בהצלחה!
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-4"
              >
                <Send size={20} />
                <span>{loading ? "שולח..." : "שלח הזמנה"}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppInvite}
                disabled={!phone.trim()}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl px-6 py-4 font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <MessageCircle size={20} />
                <span>WhatsApp</span>
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-900 font-bold leading-relaxed">
              💡 קוד המוסך שלך:{" "}
              <span className="font-mono text-lg">
                {profile?.organization?.garage_code}
              </span>
            </p>
            <p className="text-xs text-blue-600 mt-2 leading-relaxed">
              העובד יוכל להצטרף עם מספר הטלפון שלו ויקבל גישה אוטומטית
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;
