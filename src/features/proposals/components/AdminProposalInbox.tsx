import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Mic,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/services/api/client";
import { ProposalData, ProposalStatus, UserRole } from "@/types";
import { useAuth } from "@/features/auth";
import { useProposals } from "../context/ProposalsContext";
import { useNotifications } from "@/features/notifications";
import LoadingSpinner from "@/shared/components/ui/LoadingSpinner";
import { scrollToFormStart } from "@/shared/utils/uiUtils";

interface AdminProposalInboxProps {
  onClose: () => void;
}

const AdminProposalInbox: React.FC<AdminProposalInboxProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const { updateProposal } = useProposals();
  const { sendSystemNotification } = useNotifications();
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(
    null,
  );
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProposals();
  }, [profile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollToFormStart(scrollRef.current);
    }
  }, []);

  const fetchProposals = async () => {
    if (!profile?.org_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("upsell_proposals")
        .select(`
          *,
          task:tasks(id, title, vehicle_id, customer_id, customer:profiles(id, full_name, phone)),
          creator:profiles(id, full_name),
          vehicle:tasks(vehicle:vehicles(plate, model))
        `)
        .eq("org_id", profile.org_id)
        .eq("status", ProposalStatus.PENDING_ADMIN)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast.error("שגיאה בטעינת הצעות");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    proposal: ProposalData,
    approved: boolean,
    price?: number,
    adminNote?: string,
  ) => {
    try {
      setProcessingId(proposal.id);

      const newStatus = approved
        ? ProposalStatus.PENDING_CUSTOMER
        : ProposalStatus.REJECTED;

      const updates: Partial<ProposalData> = {
        status: newStatus,
        price: price || proposal.price,
      };

      await updateProposal(proposal.task_id, proposal.id, updates);

      if (!approved && proposal.created_by && sendSystemNotification) {
        await sendSystemNotification(
          proposal.created_by,
          "הצעה נדחתה ❌",
          `ההצעה עבור ${proposal.task?.title || "משימה"} נדחתה על ידי המנהל`,
          "PROPOSAL_REJECTED",
          proposal.task_id,
        );
      }

      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      setSelectedProposal(null);
      toast.success(approved ? "ההצעה אושרה ונשלחה ללקוח" : "ההצעה נדחתה");
    } catch (error) {
      console.error("Action failed:", error);
      toast.error("פעולה נכשלה");
    } finally {
      setProcessingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div
        ref={scrollRef}
        className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden border-t-[8px] border-orange-500"
      >
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50 flex-none bg-white z-10">
          <div className="text-start">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
              <Archive className="text-orange-500" />
              אישור הצעות עובדים
            </h2>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">
              {proposals.length} ממתינות לאישור
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all transform hover:rotate-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* List */}
          <div
            className={`flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 ${
              selectedProposal ? "hidden md:block" : "block"
            }`}
          >
            {loading
              ? <LoadingSpinner />
              : proposals.length === 0
              ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <CheckCircle2 size={48} className="mb-4 text-gray-200" />
                  <p className="font-bold">אין הצעות חדשות</p>
                </div>
              )
              : (
                proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    onClick={() => setSelectedProposal(proposal)}
                    className={`p-6 rounded-2xl cursor-pointer transition-all border-2 text-start ${
                      selectedProposal?.id === proposal.id
                        ? "bg-orange-50 border-orange-500 shadow-lg"
                        : "bg-gray-50 border-transparent hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white px-2 py-1 rounded-md text-gray-500 border border-gray-100">
                        {new Date(proposal.created_at).toLocaleDateString(
                          "he-IL",
                        )}
                      </span>
                      {proposal.photo_url && (
                        <ImageIcon size={16} className="text-blue-500" />
                      )}
                    </div>
                    <h3 className="font-black text-lg text-gray-900 mb-1">
                      {proposal.task?.title || "ללא כותרת"}
                    </h3>
                    <div className="text-xs font-bold text-gray-500 flex items-center gap-2 mb-3">
                      <span className="text-black bg-gray-200 px-2 py-0.5 rounded text-[10px]">
                        {proposal.vehicle?.vehicle?.plate
                          ? formatVehiclePlate(proposal.vehicle.vehicle.plate)
                          : "רכב?"}
                      </span>
                      • {proposal.creator?.full_name || "עובד לא ידוע"}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {proposal.description}
                    </p>
                  </div>
                ))
              )}
          </div>

          {/* Detail View */}
          {selectedProposal
            ? (
              <div className="flex-1 bg-gray-50 p-6 overflow-y-auto scrollbar-hide border-r border-gray-100 flex flex-col animate-fade-in text-start">
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="md:hidden mb-4 flex items-center gap-2 text-sm font-bold text-gray-500"
                >
                  <ArrowRight size={16} /> חזרה לרשימה
                </button>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm mb-6">
                  <h3 className="text-xl font-black mb-2">
                    {selectedProposal.task?.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                      {selectedProposal.creator?.full_name}
                    </span>
                    {selectedProposal.customer && (
                      <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                        לקוח: {selectedProposal.customer.full_name}
                      </span>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {selectedProposal.description}
                  </div>

                  {selectedProposal.photo_url && (
                    <div
                      className="mb-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative group cursor-pointer"
                      onClick={() =>
                        window.open(selectedProposal.photo_url, "_blank")}
                    >
                      <img
                        src={selectedProposal.photo_url}
                        alt="Problem"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Search className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                      </div>
                    </div>
                  )}

                  {selectedProposal.audio_url && (
                    <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-xl mb-6">
                      <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shrink-0">
                        <Mic size={20} />
                      </div>
                      <audio
                        controls
                        src={selectedProposal.audio_url}
                        className="w-full h-8"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-auto bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 md:sticky md:bottom-0">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block text-start">
                    מחיר מוצע (לפני מע"מ)
                  </label>
                  <div className="flex gap-4 mb-6">
                    <input
                      type="number"
                      defaultValue={selectedProposal.price || ""}
                      placeholder="0.00"
                      className="input-premium flex-1 text-xl font-mono"
                      id="proposal-price-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleAction(selectedProposal, false)}
                      disabled={processingId === selectedProposal.id}
                      className="flex items-center justify-center gap-2 py-4 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-100 transition-colors"
                    >
                      <XCircle size={20} />
                      דחה
                    </button>
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "proposal-price-input",
                        ) as HTMLInputElement;
                        handleAction(
                          selectedProposal,
                          true,
                          Number(input.value),
                        );
                      }}
                      disabled={processingId === selectedProposal.id}
                      className="flex items-center justify-center gap-2 py-4 rounded-xl bg-black text-white font-black hover:bg-gray-800 transition-colors shadow-lg"
                    >
                      {processingId === selectedProposal.id
                        ? <Loader2 size={20} className="animate-spin" />
                        : <CheckCircle2 size={20} />}
                      אשר ושלח ללקוח
                    </button>
                  </div>
                </div>
              </div>
            )
            : (
              <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 text-gray-300 flex-col">
                <FileText size={64} className="mb-4 opacity-20" />
                <p className="font-bold text-lg opacity-40">בחר הצעה לצפייה</p>
              </div>
            )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

// Helper for display
function formatVehiclePlate(plate?: string) {
  if (!plate) return "";
  return plate.replace(/(\d{2})(\d{3})(\d{2})/, "$1-$2-$3");
}

export default AdminProposalInbox;
