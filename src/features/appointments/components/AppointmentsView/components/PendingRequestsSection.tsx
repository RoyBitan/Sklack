import React from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock,
  Database,
  X,
} from "lucide-react";
import { Appointment, AppointmentStatus } from "@/types";
import { playClickSound } from "@/utils/uiUtils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface PendingRequestsSectionProps {
  pendingRequests: Appointment[];
  handleEdit: (appt: Appointment) => void;
  setRescheduleData: (data: { date: string; time: string }) => void;
  approveAppointment: (id: string, openTask: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
}

const PendingRequestsSection: React.FC<PendingRequestsSectionProps> = ({
  pendingRequests,
  handleEdit,
  setRescheduleData,
  approveAppointment,
  refreshData,
}) => {
  if (pendingRequests.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-4">
        <AlertCircle className="text-purple-600" size={24} />
        <h3 className="text-xl font-black tracking-tight text-start">
          בקשות ממתינות ({pendingRequests.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingRequests.map((appt) => (
          <div
            key={appt.id}
            className="card-premium p-6 border-l-8 border-purple-500 relative group overflow-hidden"
          >
            <div className="text-start space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-lg leading-tight">
                    {appt.service_type}
                  </h4>
                  <div className="text-xs text-gray-500 font-bold mt-1">
                    {appt.vehicle?.model} •{" "}
                    {appt.vehicle?.plate || appt.vehicle_plate}
                  </div>
                </div>
                <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                  חדש
                </div>
              </div>
              {appt.mileage && (
                <div className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full inline-block font-bold text-gray-500">
                  ק"מ: {appt.mileage}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <CalendarDays size={14} className="text-purple-500" />
                <span className="font-bold">
                  {appt.appointment_date || "לא נקבע"}
                </span>
                <span className="text-gray-300">|</span>
                <Clock size={14} className="text-purple-500" />
                <span className="font-bold">
                  {appt.appointment_time || "--:--"}
                </span>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(appt)}
                  className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-black text-xs hover:bg-gray-800 transition-all"
                >
                  פרטים
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      // This logic was inline, using simple setter passed from parent
                      setRescheduleData({
                        date: appt.appointment_date || "",
                        time: appt.appointment_time || "",
                      });
                    }}
                    className="bg-yellow-500 text-white p-2.5 rounded-xl hover:bg-yellow-600 transition-all"
                  >
                    <Database size={18} />
                  </button>
                  <button
                    onClick={async () => {
                      playClickSound();
                      const today = new Date().toISOString().split("T")[0];
                      const isToday = appt.appointment_date === today;
                      let openTask = false;
                      if (isToday) {
                        openTask = window.confirm(
                          "האם לפתוח משימה לצוות כבר עכשיו?",
                        );
                      }
                      await approveAppointment(appt.id, openTask);
                    }}
                    className="bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 transition-all"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={async () => {
                      playClickSound();
                      const { error } = await supabase
                        .from("appointments")
                        .update({
                          status: AppointmentStatus.CANCELLED,
                        })
                        .eq("id", appt.id);
                      if (!error) {
                        toast.success("הבקשה בוטלה");
                        refreshData();
                      }
                    }}
                    className="bg-red-500 text-white p-2.5 rounded-xl hover:bg-red-600 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PendingRequestsSection;
