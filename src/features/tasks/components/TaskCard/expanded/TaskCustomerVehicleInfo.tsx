import React from "react";
import { ShieldAlert, User as UserIcon } from "lucide-react";
import { Profile, Task, TaskStatus, UserRole } from "@/types";

interface TaskCustomerVehicleInfoProps {
  task: Task;
  profile: Profile | null;
  isManager: boolean;
}

const TaskCustomerVehicleInfo: React.FC<TaskCustomerVehicleInfoProps> = ({
  task,
  profile,
  isManager,
}) => {
  // Logic for Kodanit / Immobilizer Privacy
  const renderSecretCode = () => {
    const kodanitValue = task.immobilizer_code || task.vehicle?.kodanit;
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
            קוד זה גלוי לך כיוון שהמשימה משוייכת אליך או שהנך בעל הרכב/מנהל
          </p>
        </div>
      );
    }
    return null;
  };

  return (
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

      {renderSecretCode()}

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
  );
};

export default TaskCustomerVehicleInfo;
