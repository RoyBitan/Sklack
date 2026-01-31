import React from "react";
import { Check, ChevronDown, DollarSign } from "lucide-react";
import { CreateTaskFormData } from "../hooks/useCreateTaskLogic";

interface TaskDetailsSectionProps {
  formData: CreateTaskFormData;
  updateField: <K extends keyof CreateTaskFormData>(
    field: K,
    value: CreateTaskFormData[K],
  ) => void;
  teamMembers: import("../../../types").Profile[];
}

const TaskDetailsSection: React.FC<TaskDetailsSectionProps> = ({
  formData,
  updateField,
  teamMembers,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
          כותרת הטיפול
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => updateField("title", e.target.value)}
          className="input-premium"
          placeholder="מה צריך לעשות ברכב?"
        />
      </div>

      <div>
        <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">
          תיאור והערות
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          className="input-premium h-32 py-4 resize-none"
          placeholder="בקשות ספציפיות של הלקוח..."
        />
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
          דחיפות וזמן יעד (SLA)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              formData.isUrgent
                ? "border-red-500 bg-red-500 text-white"
                : "border-gray-300 bg-white"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                formData.isUrgent
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-gray-300 bg-white"
              }`}
            >
              {formData.isUrgent && <Check size={14} strokeWidth={4} />}
            </div>
            <input
              type="checkbox"
              checked={formData.isUrgent}
              onChange={(e) => updateField("isUrgent", e.target.checked)}
              className="hidden"
            />
            <span
              className={`font-black ${
                formData.isUrgent ? "text-white" : "text-gray-500"
              }`}
            >
              {formData.isUrgent ? "דחוף מאוד" : "רגיל"}
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <select
              value={formData.dueIn}
              onChange={(e) => updateField("dueIn", e.target.value)}
              className="input-premium h-14 text-sm"
            >
              <option value="30m">צפי סיום: 30 דק׳</option>
              <option value="1h">צפי סיום: שעה</option>
              <option value="2h">צפי סיום: שעתיים</option>
              <option value="4h">צפי סיום: 4 שעות</option>
              <option value="custom">אחר (דקות)</option>
            </select>
            {formData.dueIn === "custom" && (
              <input
                type="number"
                placeholder="הזן דקות..."
                value={formData.customMinutes}
                onChange={(e) => updateField("customMinutes", e.target.value)}
                className="input-premium h-12 text-sm text-center animate-fade-in-up"
              />
            )}
          </div>
        </div>
      </div>

      {/* PRICING TOGGLE */}
      <div className="pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => updateField("showPrice", !formData.showPrice)}
          className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${
            formData.showPrice
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-gray-100 bg-gray-50 text-gray-400"
          }`}
        >
          <div className="flex items-center gap-3">
            <DollarSign size={18} />
            <span className="font-black text-sm">
              הצעת מחיר ראשונית (Excl. VAT)
            </span>
          </div>
          <ChevronDown
            size={20}
            className={`transition-transform ${
              formData.showPrice ? "rotate-180" : ""
            }`}
          />
        </button>

        {formData.showPrice && (
          <div className="mt-4 animate-fade-in-up">
            <input
              type="number"
              value={formData.price}
              onChange={(e) => updateField("price", e.target.value)}
              className="input-premium text-center text-xl font-black"
              placeholder="0.00 ₪"
            />
          </div>
        )}
      </div>

      {/* TASK ASSIGNMENT SECTION */}
      <div className="pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() =>
            updateField("showAssignment", !formData.showAssignment)}
          className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${
            formData.showAssignment
              ? "border-black bg-black text-white"
              : "border-gray-100 bg-gray-50 text-gray-400"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                formData.showAssignment ? "bg-white/20" : "bg-white"
              }`}
            >
              <Check
                size={18}
                className={formData.showAssignment
                  ? "text-white"
                  : "text-gray-300"}
              />
            </div>
            <span className="font-black text-sm">סקלאק ספציפי</span>
          </div>
          <ChevronDown
            size={20}
            className={`transition-transform ${
              formData.showAssignment ? "rotate-180" : ""
            }`}
          />
        </button>

        {formData.showAssignment && (
          <div className="mt-4 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    const current = formData.assignedTo;
                    const newValue = current.includes(member.id)
                      ? current.filter((id) => id !== member.id)
                      : [...current, member.id];
                    updateField("assignedTo", newValue);
                  }}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    formData.assignedTo.includes(member.id)
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
                  {formData.assignedTo.includes(member.id) && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {formData.assignedTo.length === 0 && (
              <div className="mt-4 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                  משימה גלובלית - כל הצוות יוכל לראות ולקחת את המשימה
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailsSection;
