import React, { useState } from "react";
import {
  getPaymentMethodLabel,
  getTaskAppointmentDate,
  getTaskAppointmentTime,
  ProposalStatus,
  Task,
  TaskProposal,
  TaskStatus,
} from "@/types";
import { formatLicensePlate } from "@/shared/utils/formatters";
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  FileText,
  Mic,
  Phone,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import { useData as useDataContext } from "@/shared/context/DataContext";
import TaskChat from "@/features/chat/components/TaskChat";
import { MessageCircle } from "lucide-react";

interface CustomerTaskCardProps {
  task: Task;
  garagePhone: string | null;
  onShowRequest: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

const serviceLabels: Record<string, string> = {
  "ROUTINE_SERVICE": "טיפול תקופתי",
  "DIAGNOSTICS": "אבחון ותקלה",
  "BRAKES": "ברקסים",
  "TIRES": "צמיגים",
  "BATTERY": "מצבר וחשמל",
  "AIR_CONDITIONING": "מיזוג אוויר",
  "TEST_PREP": "הכנה לטסט",
  "OTHER": "אחר",
};

const CustomerTaskCard: React.FC<CustomerTaskCardProps> = (
  { task, garagePhone, onShowRequest, onCancel, onEdit },
) => {
  const { updateProposal } = useDataContext();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const pendingProposals =
    task.proposals?.filter((p) =>
      p.status === ProposalStatus.PENDING_CUSTOMER
    ) || [];

  const getServicesLabel = () => {
    const { metadata } = task;
    const types = metadata?.serviceTypes ||
      (metadata as { selectedServices?: string[] })?.selectedServices;
    if (Array.isArray(types) && types.length > 0) {
      return types.map((t: string) => serviceLabels[t] || t).join(", ");
    }
    return task.title || "התור שלי למוסך";
  };

  // Status Mapping
  let statusText = "ממתין";
  let statusColor = "bg-gray-100 text-gray-700";

  if (task.status === TaskStatus.WAITING_FOR_APPROVAL) {
    statusText = "ממתין לאישור התור";
    statusColor = "bg-purple-100/80 text-purple-700 border border-purple-200";
  } else if (task.status === TaskStatus.SCHEDULED) {
    statusText = "מתוזמן לעתיד";
    statusColor = "bg-yellow-100/80 text-yellow-700 border border-yellow-200";
  } else if (task.status === TaskStatus.WAITING) {
    statusText = "בתור: ממתין לצוות";
    statusColor = "bg-orange-100/80 text-orange-700 border border-orange-200";
  } else if (task.status === TaskStatus.APPROVED) {
    statusText = "הטיפול אושר";
    statusColor = "bg-blue-100/80 text-blue-700 border border-blue-200";
  } else if (task.status === TaskStatus.IN_PROGRESS) {
    statusText = "הרכב בטיפול";
    statusColor =
      "bg-emerald-100/80 text-emerald-700 border border-emerald-200";
  } else if (task.status === TaskStatus.COMPLETED) {
    statusText = "הטיפול הסתיים בהצלחה";
    statusColor = "bg-green-100/80 text-green-700 border border-green-200";
  } else if (task.status === TaskStatus.CUSTOMER_APPROVAL) {
    statusText = "דרוש אישור הלקוח";
    statusColor = "bg-orange-100 text-orange-700";
  }

  return (
    <div className="card-premium p-6 flex flex-col justify-between group h-full text-start">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="bg-[#FFE600] border-2 border-black rounded-xl px-3 py-1.5 inline-block shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg] group-hover:rotate-0 transition-transform duration-500">
            <span
              className="font-mono text-sm font-black tracking-widest text-black"
              dir="ltr"
            >
              {formatLicensePlate(task.vehicle?.plate || "---")}
            </span>
          </div>
          <span
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusColor}`}
          >
            {statusText}
          </span>
        </div>

        <div>
          <h4 className="font-black text-xl text-gray-900 leading-tight mb-1">
            {getServicesLabel()}
          </h4>
          <div className="flex items-center gap-2">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              {task.vehicle?.model}
            </p>
            {task.organization?.name && (
              <>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <p className="text-blue-500 text-xs font-black uppercase tracking-widest">
                  {task.organization.name}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-2 text-center">
          <div>
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
              תאריך
            </span>
            <div className="font-bold text-gray-700 text-xs flex items-center justify-center gap-1">
              <Calendar size={12} />
              {getTaskAppointmentDate(task) ||
                new Date(task.created_at).toLocaleDateString("en-GB")}
            </div>
          </div>
          <div>
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
              שעה
            </span>
            <div className="font-bold text-gray-700 text-xs flex items-center justify-center gap-1">
              <Clock size={12} />
              {getTaskAppointmentTime(task) ||
                new Date(task.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </div>
          </div>
        </div>

        {/* Actions */}
        {task.status !== TaskStatus.COMPLETED && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {garagePhone && (
              <a
                href={`tel:${garagePhone}`}
                className="bg-black text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-md active:scale-95"
              >
                <Phone size={16} />
                <span className="text-xs font-black">התקשר</span>
              </a>
            )}
            <button
              onClick={() => onShowRequest(task.id)}
              className="bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
            >
              <PlusCircle size={16} />
              <span className="text-xs font-black">בקשה</span>
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`col-span-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                showChat
                  ? "bg-black text-white shadow-xl"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              <MessageCircle size={18} />
              {showChat ? "סגור צ'אט עם המוסך" : "צ'אט עם המוסך"}
            </button>
          </div>
        )}

        {showChat && (
          <div className="mt-4 animate-scale-in">
            <TaskChat taskId={task.id} />
          </div>
        )}

        {task.status === TaskStatus.COMPLETED && (
          <div className="pt-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between text-emerald-800">
              <div className="flex items-center gap-2">
                <Check size={18} className="text-emerald-500" />
                <span className="text-xs font-black">
                  תיעוד זה נשמר בהיסטוריה שלך
                </span>
              </div>
              <FileText size={16} className="text-emerald-300" />
            </div>
          </div>
        )}

        {/* Details Toggle */}
        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span>פרטי תור</span>
          {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isDetailsOpen && (
          <div className="mt-2 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-2 animate-fade-in">
            <div className="flex justify-between items-center">
              <span>סוג שירות:</span>
              <span className="font-bold text-gray-800 text-end pl-2">
                {getServicesLabel()}
              </span>
            </div>
            {task.metadata?.currentMileage && (
              <div className="flex justify-between">
                <span>קילומטראז':</span>
                <span className="font-bold text-gray-800">
                  {task.metadata.currentMileage} km
                </span>
              </div>
            )}
            {task.metadata?.paymentMethod && (
              <div className="flex justify-between">
                <span>תשלום:</span>
                <span className="font-bold text-gray-800">
                  {getPaymentMethodLabel(task.metadata.paymentMethod || "")}
                </span>
              </div>
            )}

            {task.description && (
              <div className="bg-gray-50 p-3 rounded-lg mt-2">
                <span className="block text-[10px] uppercase tracking-widest mb-1">
                  תיאור תקלה:
                </span>
                {task.description}
              </div>
            )}

            {/* Edit/Cancel Actions */}
            <div className="flex gap-2 mt-4 pt-2 border-t border-gray-100">
              <button
                onClick={() => onEdit(task)}
                className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100"
              >
                <Edit2 size={14} /> ערוך פרטים
              </button>
              <button
                onClick={() => {
                  if (confirm("האם אתה בטוח שברצונך לבטל את התור?")) {
                    onCancel(task.id);
                  }
                }}
                className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-100"
              >
                <Trash2 size={14} /> בטל תור
              </button>
            </div>
          </div>
        )}

        {/* Pending Proposals Section */}
        {pendingProposals.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-[1.5rem] p-4 mt-4 space-y-4">
            <div className="flex items-center gap-2 text-amber-800 font-black text-[10px] uppercase tracking-[0.2em]">
              <AlertCircle size={14} className="text-amber-500" />
              נדרש אישור לתיקונים נוספים
            </div>

            <div className="space-y-3">
              {pendingProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm space-y-3"
                >
                  <div className="text-xs font-bold text-gray-700 leading-relaxed">
                    {proposal.description}
                  </div>

                  {proposal.price && (
                    <div className="flex items-center justify-between bg-black text-white p-2 rounded-lg">
                      <span className="text-[10px] font-black uppercase opacity-60">
                        מחיר מבוקש:
                      </span>
                      <span className="font-black text-sm">
                        ₪{proposal.price}{" "}
                        <span className="text-[8px] opacity-60">לפני מע"מ</span>
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateProposal(task.id, proposal.id, {
                          status: ProposalStatus.APPROVED,
                        })}
                      className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1 hover:bg-emerald-600 transition-all active:scale-95"
                    >
                      <Check size={14} strokeWidth={4} /> אישור
                    </button>
                    <button
                      onClick={() =>
                        updateProposal(task.id, proposal.id, {
                          status: ProposalStatus.REJECTED,
                        })}
                      className="flex-1 bg-red-50 text-red-500 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1 hover:bg-red-100 transition-all active:scale-95"
                    >
                      <X size={14} strokeWidth={4} /> דחייה
                    </button>
                  </div>

                  {(proposal.photo_url || proposal.audio_url) && (
                    <div className="flex gap-2 pt-1">
                      {proposal.photo_url && (
                        <a
                          href={proposal.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md"
                        >
                          <Camera size={10} /> תמונה
                        </a>
                      )}
                      {proposal.audio_url && (
                        <a
                          href={proposal.audio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[9px] font-black text-purple-500 bg-purple-50 px-2 py-1 rounded-md"
                        >
                          <Mic size={10} /> הודעה קולית
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTaskCard;
