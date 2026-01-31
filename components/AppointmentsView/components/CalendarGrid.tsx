import React from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { Appointment, Task, TaskStatus } from "../../../types";

interface CalendarGridProps {
  WORKING_HOURS: string[];
  weekDays: Date[];
  isToday: (date: Date) => boolean;
  formatDateForDB: (date: Date) => string;
  appointments: Appointment[];
  tasks: Task[];
  handleEdit: (appt: Appointment) => void;
  handleDelete: (id: string) => void;
  navigateTask: (id: string) => void;
  handleSlotClick: (time: string) => void;
  setSelectedDate: (date: string) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  WORKING_HOURS,
  weekDays,
  isToday,
  formatDateForDB,
  appointments,
  tasks,
  handleEdit,
  handleDelete,
  navigateTask,
  handleSlotClick,
  setSelectedDate,
}) => {
  return (
    <div className="bg-white rounded-[1.5rem] border border-gray-200 shadow-sm overflow-x-auto relative group/calendar">
      <div className="w-full">
        {/* Header Row */}
        <div className="grid grid-cols-[50px_repeat(7,1fr)] bg-gray-50 text-gray-400 border-b border-gray-200">
          <div className="p-2 border-r border-gray-200 font-black text-[8px] uppercase tracking-widest flex items-end justify-center">
            שעה
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className={`p-2 text-center border-r border-gray-200 last:border-0 ${
                isToday(day) ? "bg-blue-600 text-white" : ""
              }`}
            >
              <div
                className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${
                  isToday(day) ? "opacity-90" : "opacity-40"
                }`}
              >
                {day.toLocaleString("he-IL", { weekday: "short" })}
              </div>
              <div className="text-base font-black tracking-tighter">
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="max-h-[700px] overflow-y-auto custom-scrollbar relative">
          {WORKING_HOURS.map((time) => (
            <div
              key={time}
              className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-gray-100/30 group/row"
            >
              <div className="p-1 border-r border-gray-100/50 bg-gray-50/10 flex items-center justify-center font-bold text-gray-400 text-[8.5px] group-hover/row:text-black transition-colors">
                {time}
              </div>
              {weekDays.map((day) => {
                const dateStr = formatDateForDB(day);
                const app = appointments.find(
                  (a) =>
                    a.appointment_date === dateStr &&
                    a.appointment_time.startsWith(time),
                );
                // Also check for Approved Tasks that are effectively scheduled appointments
                const taskApp = tasks.find(
                  (t) =>
                    t.status === TaskStatus.APPROVED &&
                    t.metadata?.appointmentDate === dateStr &&
                    t.metadata?.appointmentTime?.startsWith(time),
                );
                const bookedItem = app || taskApp;

                return (
                  <div
                    key={`${day}-${time}`}
                    className={`min-h-[60px] p-0.5 border-r border-gray-100/10 relative transition-all duration-300 ${
                      isToday(day) ? "bg-blue-50/5" : ""
                    } group/slot`}
                  >
                    {bookedItem
                      ? (
                        <div
                          onClick={() =>
                            app ? handleEdit(app) : navigateTask(taskApp!.id)}
                          className={`h-full w-full rounded-md p-1.5 text-start transition-all cursor-pointer shadow-sm hover:scale-[1.01] border-r-2 ${
                            app
                              ? "bg-white border-black"
                              : "bg-purple-600 text-white border-purple-800"
                          }`}
                        >
                          <div
                            className={`text-[7px] font-black uppercase tracking-tight truncate mb-0.5 ${
                              app ? "text-gray-400" : "text-purple-200"
                            }`}
                          >
                            {app ? app.service_type || "APPT" : "TASK"}
                          </div>
                          <div className="text-[9px] font-black leading-none line-clamp-1 mb-1">
                            {app ? app.description : taskApp?.title}
                          </div>
                          <div
                            className={`text-[8px] font-bold mt-0.5 pt-0.5 border-t flex flex-col gap-0 ${
                              app
                                ? "text-gray-500 border-gray-50"
                                : "text-purple-100 border-purple-500/20"
                            }`}
                          >
                            <span className="truncate opacity-90 leading-tight">
                              {app
                                ? app.customer?.full_name ||
                                  app.metadata?.customer_name ||
                                  "Guest"
                                : taskApp?.vehicle?.owner?.full_name ||
                                  "Guest"}
                            </span>
                            <span className="font-mono text-[7px] opacity-50 shrink-0">
                              {app
                                ? app.vehicle?.plate ||
                                  app.metadata?.vehicle_plate ||
                                  "---"
                                : taskApp?.vehicle?.plate || "---"}
                            </span>
                          </div>

                          {app && (
                            <div className="absolute top-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-md p-0.5 shadow-sm">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(app);
                                }}
                                className="p-0.5 hover:bg-gray-100 rounded text-gray-400"
                              >
                                <Edit2 size={8} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(app.id);
                                }}
                                className="p-0.5 hover:bg-red-50 rounded text-red-400"
                              >
                                <Trash2 size={8} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                      : (
                        <button
                          onClick={() => {
                            setSelectedDate(dateStr);
                            handleSlotClick(time);
                          }}
                          className="w-full h-full rounded-xl border-2 border-dashed border-transparent hover:border-blue-100 hover:bg-white/50 flex items-center justify-center text-gray-200 hover:text-blue-500 transition-all group/btn"
                        >
                          <Plus
                            size={18}
                            className="opacity-0 group-hover/btn:opacity-100 transition-all"
                          />
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
