import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Priority, Profile, Task, TaskStatus, UserRole } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useApp } from "../contexts/AppContext";
import { supabase } from "../lib/supabase";
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  Car as CarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Edit2,
  MessageCircle,
  Phone,
  Play,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Undo2,
  User as UserIcon,
  Wrench,
  X,
} from "lucide-react";
import EditTaskModal from "./EditTaskModal";
import { formatLicensePlate } from "../utils/formatters";

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { profile } = useAuth();
  const {
    refreshData,
    updateTaskStatus,
    claimTask,
    releaseTask,
    deleteTask: deleteTaskFn,
    approveTask,
  } = useData();
  const { setSelectedTaskId } = useApp();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState<Profile[]>([]);

  const isManager = profile?.role === UserRole.SUPER_MANAGER;
  const isStaff = profile?.role === UserRole.STAFF;

  // Fetch assigned worker profiles
  useEffect(() => {
    const fetchWorkers = async () => {
      if (task.assigned_to && task.assigned_to.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, role, phone")
          .in("id", task.assigned_to);
        if (data) setAssignedWorkers(data as Profile[]);
      }
    };
    fetchWorkers();
  }, [task.assigned_to]);

  const updateStatus = async (newStatus: TaskStatus) => {
    setUpdating(true);
    try {
      await updateTaskStatus(task.id, newStatus);
    } catch (err) {
      console.error("Failed to update task status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleClaim = async () => {
    setUpdating(true);
    try {
      await claimTask(task.id);
    } catch (err) {
      console.error("Claim failed", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRelease = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך לשחרר משימה זו חזרה למאגר?")) {
      return;
    }
    setUpdating(true);
    try {
      await releaseTask(task.id);
    } catch (err) {
      console.error("Release failed", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק משימה זו?")) return;
    try {
      await deleteTaskFn(task.id);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const getPriorityInfo = (p: Priority) => {
    // Simple logic: Urgent/Critical get red border. Normal gets nothing.
    const isUrgent = p === Priority.URGENT || p === Priority.CRITICAL;
    if (isUrgent) {
      return {
        ring: "shadow-[0_0_30px_rgba(220,38,38,0.3)]",
        border: "border-2 border-red-500",
      };
    }
    return { ring: "", border: "border border-gray-100" };
  };

  const pInfo = getPriorityInfo(task.priority);

  return (
    <div
      id={`task-${task.id}`}
      className={`card-premium overflow-hidden group transition-all duration-500 relative ${
        expanded ? "scale-[1.01] shadow-xl z-10" : ""
      } ${pInfo.border} ${pInfo.ring}`}
    >
      {/* Absolute Admin Actions */}
      {profile?.role === UserRole.SUPER_MANAGER && (
        <div className="absolute top-4 left-4 flex gap-1 z-20">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-1.5 bg-white/80 backdrop-blur-sm border border-gray-100 hover:bg-black hover:text-white rounded-lg text-gray-400 transition-all shadow-sm active:scale-90"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 bg-white/80 backdrop-blur-sm border border-gray-100 hover:bg-red-500 hover:text-white rounded-lg text-red-400 transition-all shadow-sm active:scale-90"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-4 md:gap-8">
          {/* Main Info */}
          <div className="flex-1 space-y-2 md:space-y-4 text-right" dir="rtl">
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter leading-tight transition-transform">
                {task.title}
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                {task.vehicle && (
                  <>
                    <div className="text-base font-black text-gray-400 italic">
                      {task.vehicle.model}
                    </div>
                    <div className="bg-[#FFE600] border-2 border-black rounded-lg px-2.5 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <span className="font-mono font-black text-sm tracking-widest">
                        {formatLicensePlate(task.vehicle.plate)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Consolidated Quick Info Row */}
              <div className="flex items-center gap-4 text-gray-500">
                <div className="flex items-center gap-1.5">
                  <UserIcon size={14} className="text-gray-300" />
                  <span className="text-xs font-black">
                    {task.vehicle?.owner?.full_name ||
                      (task.metadata as any)?.ownerName || "לקוח מזדמן"}
                  </span>
                </div>
                {(task.vehicle_year || task.vehicle?.year) && (
                  <div className="flex items-center gap-1.5 border-r border-gray-100 pr-4">
                    <Calendar size={14} className="text-gray-300" />
                    <span className="text-xs font-black font-mono">
                      {task.vehicle_year || task.vehicle?.year}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Actions for Appointment Requests or New Check-ins - Manager ONLY */}
            {profile?.role === UserRole.SUPER_MANAGER &&
              task.status === TaskStatus.WAITING_FOR_APPROVAL && (
              <div className="flex flex-wrap gap-2 pt-1 animate-fade-in-up">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const now = new Date();
                    const today = now.toISOString().split("T")[0];
                    const requestedDate =
                      (task.metadata as any)?.appointmentDate || today;

                    if (requestedDate === today) {
                      const sendNow = window.confirm(
                        "האם להעביר את המשימה ללוח העבודה של הצוות עכשיו?",
                      );
                      if (sendNow) {
                        await approveTask(task.id, true);
                      } else {
                        const reminder = window.prompt(
                          "הזן שעה לתזכורת (HH:mm):",
                          "10:00",
                        );
                        if (reminder) {
                          const [hours, minutes] = reminder.split(":");
                          const reminderDate = new Date();
                          reminderDate.setHours(
                            parseInt(hours),
                            parseInt(minutes),
                            0,
                            0,
                          );
                          await approveTask(
                            task.id,
                            false,
                            reminderDate.toISOString(),
                          );
                        } else {
                          await approveTask(task.id, false);
                        }
                      }
                    } else {
                      await approveTask(task.id, false);
                      alert(`המשימה תוזמנה לתאריך ${requestedDate}`);
                    }
                  }}
                  className="bg-green-600 text-white px-4 h-10 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                  <CheckCircle2 size={16} /> אשר בקשה
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("האם לדחות את הבקשה? המשימה תבוטל.")) {
                      updateTaskStatus(task.id, TaskStatus.CANCELLED);
                    }
                  }}
                  className="bg-red-500 text-white px-4 h-10 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-600 transition-all shadow-md active:scale-95"
                >
                  <AlertCircle size={16} /> דחה
                </button>
              </div>
            )}

            {/* Workflow & Details Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {(isManager || isStaff) && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tasks/${task.id}`);
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
                    {!task.assigned_to?.includes(profile?.id || "")
                      ? (
                        <button
                          onClick={handleClaim}
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
                            onClick={handleRelease}
                            disabled={updating}
                            title="שחרר משימה"
                            className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-all active:scale-90"
                          >
                            <RotateCcw size={16} />
                          </button>
                          {task.status !== TaskStatus.COMPLETED && (
                            <button
                              onClick={() => updateStatus(TaskStatus.COMPLETED)}
                              disabled={updating}
                              className="h-10 px-4 bg-green-500 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-green-600 transition-all shadow-md active:scale-95"
                            >
                              <CheckCircle2 size={16} />
                              סיים טיפול
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>

            {/* Assigned Staff Info - Repositioned/Tightened */}
            {(isManager || isStaff) && assignedWorkers.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <div className="p-1 px-2.5 bg-blue-50/50 rounded-lg border border-blue-100/50 flex items-center gap-2">
                  <Wrench size={12} className="text-blue-500" />
                  <span className="text-[10px] font-black text-blue-700">
                    באחריות:{" "}
                    {assignedWorkers.map((w) => w.full_name).join(", ")}
                  </span>
                  {(isManager || isStaff) && assignedWorkers[0]?.phone && (
                    <a
                      href={`tel:${assignedWorkers[0].phone}`}
                      className="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all active:scale-90"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Combined Footer Info (Date/Time) */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 lg:border-r border-gray-100 lg:pr-6 mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0">
            <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-gray-300" />
                <span>
                  {new Date(task.created_at).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 border-r border-gray-100 pr-4">
                <Calendar size={12} className="text-gray-300" />
                <span>
                  {new Date(task.created_at).toLocaleDateString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="bg-gray-50/70 p-6 md:p-12 border-t-2 border-gray-100 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <div className="space-y-8">
              {/* Customer Details */}
              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4">
                  פרטי לקוח
                </label>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    {/* @ts-ignore */}
                    <div className="font-black text-lg text-gray-900">
                      {task.vehicle?.owner?.full_name || "לקוח מזדמן"}
                    </div>
                    {/* @ts-ignore */}
                    <div className="text-sm font-bold text-gray-400 font-mono">
                      {task.vehicle?.owner?.phone || "---"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Kodanit / Immobilizer Privacy Logic */}
              {(() => {
                const kodanitValue = task.immobilizer_code ||
                  task.vehicle?.kodanit;
                const isOwner = profile?.id === task.vehicle?.owner_id;
                const isAssignedStaff = isManager &&
                  task.assigned_to?.includes(profile?.id || "") &&
                  task.status !== TaskStatus.COMPLETED;
                const canSeeKodanit = isManager || isOwner || isAssignedStaff;

                if (kodanitValue && canSeeKodanit) {
                  return (
                    <div className="animate-fade-in">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4">
                        קודנית (Secret Code)
                      </label>
                      <div className="bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl flex items-center gap-4 border-l-8 border-red-500">
                        <ShieldAlert size={24} className="text-red-500" />
                        <div className="font-mono text-3xl font-black tracking-[0.3em]">
                          {kodanitValue}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold mt-2 pr-2">
                        קוד זה גלוי לך כיוון שהמשימה משוייכת אליך או שהנך בעל
                        הרכב/מנהל
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6">
                  פרטי רכב מלאים
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                      Make, Model & Year
                    </div>
                    <div className="font-black text-gray-800">
                      {task.vehicle?.model}{" "}
                      {task.vehicle?.year ? `(${task.vehicle.year})` : ""}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                      Color
                    </div>
                    <div className="font-black text-gray-800">
                      {task.vehicle?.color || "---"}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                      Fuel Type
                    </div>
                    <div className="font-black text-gray-800">
                      {task.vehicle?.fuel_type || "---"}
                    </div>
                  </div>
                  {/* More details tab content inside basic grid for expansion ease */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                      VIN / Chassis
                    </div>
                    <div className="font-mono text-[10px] font-black text-gray-800 uppercase">
                      {task.vehicle?.vin || "---"}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                      Engine Code
                    </div>
                    <div className="font-mono text-[10px] font-black text-gray-800 uppercase">
                      {task.vehicle?.engine_model || "---"}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100">
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                      Next Test
                    </div>
                    <div className="font-black text-gray-800">
                      {task.vehicle?.registration_valid_until || "---"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Check-In Details / Metadata */}
              {isManager && (task.metadata as any)?.type && (
                <div className="animate-fade-in-up">
                  <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] block mb-4">
                    פרטי צ'ק-אין / בקשת תור
                  </label>
                  <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100/50 space-y-4 shadow-inner">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          מועד מבוקש
                        </div>
                        <div className="font-black text-gray-800 flex items-center gap-2">
                          <Calendar size={14} className="text-blue-500" />
                          {(task.metadata as any)?.appointmentDate || "לא צוין"}
                          {" "}
                          {(task.metadata as any)?.appointmentTime || ""}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          קילומטראז'
                        </div>
                        <div className="font-black text-gray-800 flex items-center gap-2">
                          <Clock size={14} className="text-blue-500" />
                          {(task.metadata as any)?.currentMileage ||
                            (task.metadata as any)?.mileage || "---"} KM
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          סוג שירות
                        </div>
                        <div className="font-black text-gray-800 flex items-center gap-2">
                          <Wrench size={14} className="text-blue-500" />
                          {Array.isArray((task.metadata as any)?.serviceTypes)
                            ? (task.metadata as any).serviceTypes.join(", ")
                            : (task.metadata as any)?.serviceType || "כללי"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          צורת תשלום
                        </div>
                        <div className="font-black text-gray-800 flex items-center gap-2">
                          <MessageCircle size={14} className="text-blue-500" />
                          {(task.metadata as any)?.paymentMethod ===
                              "CREDIT_CARD"
                            ? "אשראי"
                            : (task.metadata as any)?.paymentMethod === "CASH"
                            ? "מזומן"
                            : "אחר"}
                        </div>
                      </div>
                    </div>
                    {((task.metadata as any)?.faultDescription ||
                      (task.metadata as any)?.description) && (
                      <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          תיאור התקלה / בקשה
                        </div>
                        <div className="text-sm font-bold text-gray-700 leading-relaxed italic">
                          "{(task.metadata as any)?.faultDescription ||
                            (task.metadata as any)?.description}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
      )}
      {showEditModal && (
        <EditTaskModal
          task={task}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default TaskCard;
