import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, Save, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useData } from "../contexts/DataContext";
import { Priority, Task, TaskStatus } from "../types";

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose }) => {
  const { refreshData } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [isUrgent, setIsUrgent] = useState(
    task.priority === Priority.URGENT || task.priority === Priority.CRITICAL,
  );
  const [assignedTo, setAssignedTo] = useState<string[]>(
    task.assigned_to || [],
  );
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAssignment, setShowAssignment] = useState(
    (task.assigned_to?.length || 0) > 0,
  );
  const { fetchTeamMembers, notifyMultiple } = useData();

  useEffect(() => {
    if (showAssignment && teamMembers.length === 0) {
      fetchTeamMembers().then(setTeamMembers);
    }
  }, [showAssignment, fetchTeamMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          priority: isUrgent ? Priority.URGENT : Priority.NORMAL,
          assigned_to: assignedTo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Notify newly assigned members
      const previousAssigned = task.assigned_to || [];
      const newlyAssigned = assignedTo.filter((id) =>
        !previousAssigned.includes(id)
      );

      if (newlyAssigned.length > 0) {
        await notifyMultiple(
          newlyAssigned,
          "משימה שויכה אליך 🔧",
          `נתבקשת לטפל במשימה: ${title}`,
          "TASK_ASSIGNED",
          task.id,
        );
      }

      await refreshData();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "שגיאה בעדכון המשימה");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up">
      <div className="bg-white w-full h-full sm:h-auto sm:w-full sm:max-w-2xl sm:rounded-[2rem] shadow-2xl flex flex-col transition-all duration-300">
        <div className="px-6 py-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-white sm:rounded-t-[2rem] sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tighter">
              עריכת משימה
            </h2>
            <p className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mt-1">
              עדכון פרטי המשימה
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all active:scale-90 touch-target"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-8">
          <form
            id="edit-task-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                כותרת הטיפול
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-premium px-4 py-3 text-base rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">
                תיאור והערות
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-premium h-32 py-4 resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                דחיפות
              </label>
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isUrgent
                    ? "border-red-500 bg-red-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isUrgent
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isUrgent && <Check size={14} strokeWidth={4} />}
                </div>
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="hidden"
                />
                <span
                  className={`font-black ${
                    isUrgent ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {isUrgent ? "דחוף מאוד" : "רגיל"}
                </span>
              </label>
            </div>

            {/* TASK ASSIGNMENT SECTION */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAssignment(!showAssignment)}
                className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${
                  showAssignment
                    ? "border-black bg-black text-white"
                    : "border-gray-100 bg-gray-50 text-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      showAssignment ? "bg-white/20" : "bg-white"
                    }`}
                  >
                    <Check
                      size={18}
                      className={showAssignment
                        ? "text-white"
                        : "text-gray-300"}
                    />
                  </div>
                  <span className="font-black text-sm">סקלאק ספציפי</span>
                </div>
                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    showAssignment ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showAssignment && (
                <div className="mt-4 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setAssignedTo((prev) =>
                            prev.includes(member.id)
                              ? prev.filter((id) => id !== member.id)
                              : [...prev, member.id]
                          );
                        }}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                          assignedTo.includes(member.id)
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-white bg-white text-gray-500 hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-xs">
                            {member.full_name[0]}
                          </div>
                          <div className="text-start">
                            <div className="text-xs font-black">
                              {member.full_name}
                            </div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase">
                              {member.role}
                            </div>
                          </div>
                        </div>
                        {assignedTo.includes(member.id) && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {assignedTo.length === 0 && (
                    <div className="mt-4 text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                        משימה גלובלית - כל הצוות יוכל לראות ולקחת את המשימה
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-6 rounded-[1.5rem] flex items-center gap-4 border border-red-100">
                <AlertCircle size={24} />
                <p className="text-sm font-black">{error}</p>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 sm:p-8 border-t border-gray-100 bg-white sticky bottom-0 z-10 shrink-0 mb-safe">
          <button
            form="edit-task-form"
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-3 touch-target"
          >
            {loading ? "שומר..." : (
              <>
                <Save size={20} />{" "}
                <span className="font-black text-lg">שמור שינויים</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default EditTaskModal;
