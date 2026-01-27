import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useApp } from "../contexts/AppContext";
import { supabase } from "../lib/supabase";
import { Profile, Task, TaskStatus, UserRole } from "../types";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  User as UserIcon,
  Wrench,
  X,
} from "lucide-react";
import { formatLicensePlate } from "../utils/formatters";
import EditTaskModal from "./EditTaskModal";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const TaskDetailsView: React.FC = () => {
  const { id: urlTaskId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { tasks } = useData();
  const { setSelectedTaskId, navigateTo } = useApp();
  const [assignedWorkers, setAssignedWorkers] = useState<Profile[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPriceProposalId, setEditingPriceProposalId] = useState<
    string | null
  >(null);
  const [priceInput, setPriceInput] = useState("");
  const { updateProposal } = useData();

  // Sync context with URL param
  useEffect(() => {
    if (urlTaskId) {
      setSelectedTaskId(urlTaskId);
    }
    return () => setSelectedTaskId(null);
  }, [urlTaskId, setSelectedTaskId]);

  const task = useMemo(() => tasks.find((t) => t.id === urlTaskId), [
    tasks,
    urlTaskId,
  ]);

  useEffect(() => {
    const fetchWorkers = async () => {
      if (task?.assigned_to && task.assigned_to.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, role, phone")
          .in("id", task.assigned_to);
        if (data) setAssignedWorkers(data as Profile[]);
      }
    };
    if (task) fetchWorkers();
  }, [task?.assigned_to]);

  // IDOR Protection: Customers can ONLY view their own tasks
  useEffect(() => {
    if (!task || !profile) return;

    if (profile.role === UserRole.CUSTOMER) {
      const isOwner = task.customer_id === profile.id ||
        task.created_by === profile.id ||
        task.vehicle?.owner_id === profile.id;

      if (!isOwner) {
        navigate("/tasks");
        toast.error("אין לך הרשאה לצפות במשימה זו");
      }
    }
  }, [task, profile, navigate]);

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <AlertCircle size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">
          המשימה לא נמצאה
        </h2>
        <button
          onClick={() => {
            setSelectedTaskId(null);
            navigateTo("DASHBOARD");
          }}
          className="text-purple-600 font-bold flex items-center gap-2"
        >
          <ArrowRight size={20} />
          חזרה ללוח המשימות
        </button>
      </div>
    );
  }

  const handleBack = () => {
    setSelectedTaskId(null);
    navigateTo("DASHBOARD");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Header */}
      <div className="flex-none p-5 md:p-6 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowRight size={24} className="text-gray-600" />
          </button>
          <div className="text-start">
            <h3 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-3">
              <ClipboardList className="text-purple-600 ltr" size={24} />
              ניהול משימה
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="bg-[#FFE600] border-2 border-black rounded-lg px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-mono font-black text-xs tracking-widest">
                  {formatLicensePlate(task.vehicle?.plate || "")}
                </span>
              </div>
              <span className="text-xs font-bold text-gray-400">|</span>
              <span className="text-xs font-black text-gray-500">
                {task.vehicle?.model}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile?.role === UserRole.SUPER_MANAGER && (
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-black text-white px-4 py-2 rounded-xl text-sm font-black shadow-lg active:scale-95 transition-all"
            >
              ערוך משימה
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto p-5 md:p-8 space-y-6 pb-24 native-scroll">
        {/* Section: Status & Assignment */}
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div className="text-[11px] font-black text-purple-600 uppercase tracking-widest">
              סטטוס וביצוע
            </div>
            <div
              className={`px-4 py-1.5 rounded-full text-[11px] font-black ring-1 ring-offset-2 ${
                task.status === TaskStatus.COMPLETED
                  ? "bg-green-100 text-green-700 ring-green-500/20"
                  : task.status === TaskStatus.IN_PROGRESS
                  ? "bg-blue-100 text-blue-700 ring-blue-500/20"
                  : "bg-gray-100 text-gray-600 ring-gray-500/20"
              }`}
            >
              {task.status}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                <Wrench size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase mb-0.5">
                  צוות בביצוע
                </div>
                <div className="font-black text-gray-900 text-base">
                  {assignedWorkers.length > 0
                    ? assignedWorkers.map((w) => w.full_name).join(", ")
                    : "טרם שויך"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Customer Info */}
        <div className="space-y-4">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 text-start">
            פרטי תקשורת ולקוח
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 text-start group hover:border-purple-200 transition-colors">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-3">
                <UserIcon size={20} />
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">
                שם המנוי
              </div>
              <div className="font-black text-gray-900 text-lg">
                {task.vehicle?.owner?.full_name ||
                  (task.metadata as any)?.ownerName || "---"}
              </div>
            </div>
            <a
              href={`tel:${
                task.vehicle?.owner?.phone || (task.metadata as any)?.ownerPhone
              }`}
              className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 text-start group hover:border-green-200 transition-colors"
            >
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-3">
                <Phone size={20} />
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">
                חייג ללקוח
              </div>
              <div className="font-black text-gray-900 text-lg font-mono tracking-tighter">
                {task.vehicle?.owner?.phone ||
                  (task.metadata as any)?.ownerPhone || "---"}
              </div>
            </a>
          </div>
        </div>

        {/* Section: Vehicle Specs */}
        <div className="space-y-4">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 text-start">
            מפרט רכב מלא
          </div>
          <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-6 text-start">
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  דגם ושנה
                </div>
                <div className="font-black text-gray-900 text-base">
                  {task.vehicle?.model}{" "}
                  {task.vehicle?.year ? `(${task.vehicle.year})` : ""}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  צבע וגימור
                </div>
                <div className="font-black text-gray-900 text-base">
                  {task.vehicle?.color || "---"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  סוג דלק
                </div>
                <div className="font-black text-gray-900 text-base">
                  {task.vehicle?.fuel_type || "---"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  קודנית / נעילה
                </div>
                <div className="font-black text-red-600 font-mono tracking-widest text-base">
                  {task.immobilizer_code || task.vehicle?.kodanit || "---"}
                </div>
              </div>
              <div className="col-span-2 pt-4 border-t border-gray-50 space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  מספר שלדה (VIN)
                </div>
                <div className="font-black text-gray-900 font-mono text-sm uppercase break-all">
                  {task.vehicle?.vin || "---"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  דגם מנוע
                </div>
                <div className="font-black text-gray-900 font-mono uppercase text-sm">
                  {task.vehicle?.engine_model || "---"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  טסט בתוקף עד
                </div>
                <div className="font-black text-gray-900 text-base">
                  {task.vehicle?.registration_valid_until || "---"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Proposals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="text-[11px] font-black text-amber-600 uppercase tracking-[0.15em] text-start">
              הצעות לתיקונים נוספים (Upsells)
            </div>
            {task.proposals && task.proposals.length > 0 && (
              <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black">
                {task.proposals.length} הצעות
              </div>
            )}
          </div>

          <div className="space-y-3">
            {task.proposals && task.proposals.length > 0
              ? (
                task.proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className={`bg-white p-5 rounded-[1.5rem] shadow-sm border-2 transition-all ${
                      proposal.status === "PENDING_MANAGER"
                        ? "border-amber-200 bg-amber-50/20"
                        : proposal.status === "PENDING_CUSTOMER"
                        ? "border-blue-200"
                        : proposal.status === "APPROVED"
                        ? "border-green-200"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-xs font-bold text-gray-700 text-start flex-1">
                        {proposal.description}
                      </div>
                      <div
                        className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter mr-2 ${
                          proposal.status === "PENDING_MANAGER"
                            ? "bg-amber-500 text-white"
                            : proposal.status === "PENDING_CUSTOMER"
                            ? "bg-blue-500 text-white"
                            : proposal.status === "APPROVED"
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {proposal.status}
                      </div>
                    </div>

                    {proposal.price
                      ? (
                        <div className="bg-gray-900 text-white p-3 rounded-xl flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black opacity-60">
                            מחיר להצעה:
                          </span>
                          <span className="text-lg font-black font-mono">
                            ₪{proposal.price}
                          </span>
                        </div>
                      )
                      : proposal.status === "PENDING_MANAGER" &&
                          profile?.role === UserRole.SUPER_MANAGER
                      ? (
                        <div className="flex gap-2 mb-3">
                          <input
                            type="number"
                            placeholder="הוסף מחיר..."
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                            value={editingPriceProposalId === proposal.id
                              ? priceInput
                              : ""}
                            onChange={(e) => {
                              setEditingPriceProposalId(proposal.id);
                              setPriceInput(e.target.value);
                            }}
                          />
                          <button
                            onClick={() => {
                              if (!priceInput) {
                                return toast.error("אנא הזן מחיר");
                              }
                              updateProposal(task.id, proposal.id, {
                                price: parseFloat(priceInput),
                                status: "PENDING_CUSTOMER",
                              });
                              setEditingPriceProposalId(null);
                              setPriceInput("");
                            }}
                            className="bg-black text-white px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2"
                          >
                            <Send size={14} /> שלח ללקוח
                          </button>
                        </div>
                      )
                      : (
                        <div className="text-[10px] font-bold text-gray-400 italic mb-3">
                          {proposal.status === "PENDING_MANAGER"
                            ? "ממתין לתמחור מנהל"
                            : "אין מחיר מוגדר"}
                        </div>
                      )}

                    <div className="flex items-center gap-3">
                      {proposal.photo_url && (
                        <a
                          href={proposal.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline"
                        >
                          <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                            <Check size={12} />
                          </div>
                          צפה בתמונה
                        </a>
                      )}
                      {proposal.audio_url && (
                        <a
                          href={proposal.audio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-black text-purple-600 flex items-center gap-1 hover:underline"
                        >
                          <div className="w-6 h-6 bg-purple-50 rounded flex items-center justify-center">
                            <Check size={12} />
                          </div>
                          הודעה קולית
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )
              : (
                <div className="text-center py-8 bg-gray-50 rounded-[1.5rem] border border-dashed border-gray-200">
                  <Sparkles className="mx-auto text-gray-300 mb-2" size={24} />
                  <div className="text-xs font-bold text-gray-400">
                    אין הצעות לתיקונים נוספים למשימה זו
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Section: Fault Description */}
        <div className="space-y-4">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 text-start">
            תיאור העבודה והערות
          </div>
          <div className="bg-purple-900 text-white p-7 md:p-10 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <MessageCircle size={120} />
            </div>
            <div className="relative z-10 space-y-5">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle size={24} className="text-purple-300" />
              </div>
              <p className="text-xl font-black leading-relaxed italic text-start">
                "{task.description ||
                  (task.metadata as any)?.faultDescription ||
                  "אין הערות נוספות למשימה זו."}"
              </p>
              <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                <Clock size={16} className="text-purple-300" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  נפתח ב: {new Date(task.created_at).toLocaleString("he-IL")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="flex-none p-5 md:p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
        <button
          onClick={handleBack}
          className="w-full bg-black text-white py-4 rounded-[1.2rem] font-black text-base shadow-2xl hover:bg-gray-900 transition-all active:scale-95 touch-target flex items-center justify-center gap-3"
        >
          סגור וחזור לרשימה
        </button>
      </div>

      {showEditModal && (
        <EditTaskModal
          task={task}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default TaskDetailsView;
