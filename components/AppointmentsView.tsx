import React, { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AppointmentStatus, Task, TaskStatus, UserRole } from "../types";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Edit2,
  Info,
  Loader,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { supabase } from "../lib/supabase";
import { cleanLicensePlate, formatLicensePlate } from "../utils/formatters";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "../utils/vehicleApi";
import { toast } from "sonner";

const AppointmentsView: React.FC = () => {
  const {
    appointments,
    refreshData,
    tasks,
    approveTask,
    updateTask,
    updateTaskStatus,
    sendSystemNotification,
  } = useData();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // View State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null);
  const [showReminderOptions, setShowReminderOptions] = useState<Task | null>(
    null,
  );
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState({
    customerName: "",
    phone: "",
    vehiclePlate: "",
    serviceType: "",
    duration: "1 שעה",
    make: "",
  });

  const isManager = profile?.role === UserRole.SUPER_MANAGER ||
    profile?.role === UserRole.STAFF;

  const WORKING_HOURS = useMemo(() => {
    const slots = [];
    for (let h = 7; h <= 19; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
    }
    return slots;
  }, []);

  const weekDays = useMemo(() => {
    const start = new Date(viewDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [viewDate]);

  const navigateWeek = (direction: number) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (direction * 7));
      return next;
    });
  };

  const navigateMonth = (direction: number) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const goToToday = () => setViewDate(new Date());

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const formatDateForDB = (date: Date) => date.toISOString().split("T")[0];

  const pendingRequests = useMemo(
    () => tasks.filter((t) => t.status === TaskStatus.WAITING_FOR_APPROVAL),
    [tasks],
  );

  const handleAutoFill = async () => {
    const cleanedPlate = cleanLicensePlate(bookingData.vehiclePlate);
    if (!cleanedPlate || !isValidIsraeliPlate(cleanedPlate)) {
      toast.error("אנא הזן מספר רישוי תקין");
      return;
    }
    setLoadingApi(true);
    try {
      const data = await fetchVehicleDataFromGov(cleanedPlate);
      if (!data) {
        toast.error("לא נמצאו נתונים למספר רישוי זה");
        return;
      }
      setBookingData({
        ...bookingData,
        make: `${data.make} ${data.model}`.trim() || bookingData.make,
      });
    } catch (err: any) {
      toast.error(err.message || "שגיאה בטעינת נתוני הרכב");
    } finally {
      setLoadingApi(false);
    }
  };

  const handleManagerBook = async () => {
    if (!selectedTime || !profile?.org_id) return;
    setLoading(true);
    try {
      const payload: any = {
        org_id: profile.org_id,
        service_type: bookingData.serviceType || "טיפול",
        description: selectedService,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        status: "PENDING",
        customer_name: bookingData.customerName,
        vehicle_plate: bookingData.vehiclePlate,
      };

      if (editingId) {
        const { error } = await supabase.from("appointments").update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert(payload);
        if (error) throw error;
      }

      await refreshData();
      setShowModal(false);
      setEditingId(null);
      toast.success("התור נשמר בהצלחה");
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error("שגיאה בשמירת התור");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedTime || !selectedService || !profile?.org_id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        org_id: profile.org_id,
        customer_id: profile.id,
        service_type: selectedService,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        status: "PENDING",
      });
      if (error) throw error;
      await refreshData();
      toast.success("בקשת התור נשלחה בהצלחה");
      setSelectedTime(null);
      setSelectedService("");
    } catch (err) {
      console.error("Failed to book appointment:", err);
      toast.error("שגיאה בשליחת הבקשה");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תור זה?")) return;
    try {
      const { error } = await supabase.from("appointments").delete().eq(
        "id",
        id,
      );
      if (error) throw error;
      await refreshData();
      toast.success("התור נמחק");
    } catch (err) {
      toast.error("שגיאה במחיקת התור");
    }
  };

  const handleEdit = (appointment: any) => {
    setEditingId(appointment.id);
    setSelectedTime(appointment.appointment_time.substring(0, 5));
    setSelectedDate(appointment.appointment_date);
    setBookingData({
      customerName: appointment.customer?.full_name ||
        appointment.customer_name || "",
      vehiclePlate: appointment.vehicle?.plate || appointment.vehicle_plate ||
        "",
      phone: appointment.customer?.phone || "",
      serviceType: appointment.service_type || "",
      duration: appointment.duration || "1 שעה",
      make: appointment.vehicle?.model || "",
    });
    setSelectedService(appointment.description || appointment.service_type);
    setShowModal(true);
  };

  const handleSlotClick = (time: string) => {
    setSelectedTime(time);
    setEditingId(null);
    setBookingData({
      customerName: "",
      phone: "",
      vehiclePlate: "",
      serviceType: "",
      duration: "1 שעה",
      make: "",
    });
    setSelectedService("");
    setShowModal(true);
  };

  return (
    <div className="animate-fade-in-up selection:bg-black selection:text-white">
      {isManager
        ? (
          <div className="space-y-8">
            {/* Simple Weekly Navigation */}
            <div className="flex items-center justify-between gap-4 bg-white/50 p-2 rounded-2xl border border-gray-100 mb-4">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="שבוע קודם"
              >
                <ChevronRight size={24} />
              </button>

              <div className="flex flex-col items-center">
                <h2 className="text-lg font-black tracking-tight text-gray-900">
                  {weekDays[0].toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })} - {weekDays[6].toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </h2>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-1">
                  Weekly Schedule Overview
                </div>
              </div>

              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="שבוע הבא"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <AlertCircle className="text-purple-600" size={24} />
                  <h3 className="text-xl font-black tracking-tight text-start">
                    בקשות ממתינות ({pendingRequests.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingRequests.map((task) => (
                    <div
                      key={task.id}
                      className="card-premium p-6 border-l-8 border-purple-500 relative group overflow-hidden"
                    >
                      <div className="text-start space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-lg leading-tight">
                              {task.title}
                            </h4>
                            <div className="text-xs text-gray-500 font-bold mt-1">
                              {task.vehicle?.model} • {task.vehicle?.plate}
                            </div>
                          </div>
                          <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                            חדש
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <CalendarDays size={14} className="text-purple-500" />
                          <span className="font-bold">
                            {(task.metadata as any)?.appointmentDate ||
                              "לא נקבע"}
                          </span>
                          <span className="text-gray-300">|</span>
                          <Clock size={14} className="text-purple-500" />
                          <span className="font-bold">
                            {(task.metadata as any)?.appointmentTime || "--:--"}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-black text-xs hover:bg-gray-800 transition-all"
                          >
                            פרטים
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setRescheduleData({
                                  date:
                                    (task.metadata as any)?.appointmentDate ||
                                    "",
                                  time:
                                    (task.metadata as any)?.appointmentTime ||
                                    "",
                                });
                                setReschedulingTask(task);
                              }}
                              className="bg-yellow-500 text-white p-2.5 rounded-xl hover:bg-yellow-600 transition-all"
                            >
                              <Database size={18} />
                            </button>
                            <button
                              onClick={async () => {
                                await approveTask(task.id, false);
                                toast.success("התור אושר");
                              }}
                              className="bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 transition-all"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={async () => {
                                await updateTaskStatus(
                                  task.id,
                                  TaskStatus.CANCELLED,
                                );
                                toast.success("הבקשה בוטלה");
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
            )}

            {/* Calendar Grid Container */}
            <div className="bg-white rounded-[1.5rem] border border-gray-200 shadow-sm overflow-x-auto relative group/calendar">
              <div className="w-full">
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
                        const app = appointments.find((a) =>
                          a.appointment_date === dateStr &&
                          a.appointment_time.startsWith(time)
                        );
                        const taskApp = tasks.find((t) =>
                          t.status === TaskStatus.APPROVED &&
                          (t.metadata as any)?.appointmentDate === dateStr &&
                          (t.metadata as any)?.appointmentTime?.startsWith(time)
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
                                    app
                                      ? handleEdit(app)
                                      : navigate(`/tasks/${taskApp?.id}`)}
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
                                    {app
                                      ? (app.service_type || "APPT")
                                      : "TASK"}
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
                                        ? (app.customer?.full_name ||
                                          app.customer_name || "Guest")
                                        : (taskApp?.vehicle?.owner?.full_name ||
                                          "Guest")}
                                    </span>
                                    <span className="font-mono text-[7px] opacity-50 shrink-0">
                                      {app
                                        ? (app.vehicle?.plate ||
                                          app.vehicle_plate || "---")
                                        : (taskApp?.vehicle?.plate || "---")}
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

            {/* Legend */}
            <div className="flex flex-wrap gap-8 px-4 pb-12">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-black shadow-sm">
                </div>
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  תור רגיל
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-purple-600 shadow-sm">
                </div>
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  משימה מאושרת
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-600 shadow-sm">
                </div>
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  היום
                </span>
              </div>
            </div>
          </div>
        )
        : (
          /* Customer View */
          <div className="max-w-3xl mx-auto space-y-12 pb-20 text-center">
            <div className="card-premium p-12 md:p-16 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 bg-black"></div>
              <h2 className="text-5xl font-black tracking-tighter mb-12 flex items-center justify-center gap-8 text-center">
                <div className="p-5 bg-black text-white rounded-3xl shadow-2xl">
                  <CalendarDays size={40} />
                </div>
                קביעת תור למוסך
              </h2>
              <div className="space-y-10 text-start">
                <div className="group">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4 px-2">
                    סוג הטיפול המבוקש
                  </label>
                  <select
                    className="input-premium h-20 text-xl"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                  >
                    <option value="">-- בחר שירות --</option>
                    <option value="טיפול שנתי">טיפול שנתי תקופתי</option>
                    <option value="הכנה לטסט">הכנה לטסט ורישוי</option>
                    <option value="דיאגנוסטיקה">דיאגנוסטיקה ממוחשבת</option>
                    <option value="תיקון כללי">תיקון כללי / מכונאות</option>
                  </select>
                </div>
                <div className="group">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4 px-2">
                    בחר תאריך מבוקש
                  </label>
                  <input
                    type="date"
                    className="input-premium h-20 text-xl"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="group">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6 px-2">
                    בחר שעה פנויה
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {WORKING_HOURS.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`h-16 rounded-[1.2rem] font-black text-base transition-all duration-300 border-2 ${
                          selectedTime === time
                            ? "bg-black text-white border-black shadow-2xl scale-105"
                            : "bg-gray-50 border-transparent text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleBook}
                  disabled={loading || !selectedService || !selectedTime}
                  className="btn-primary w-full h-24 text-2xl mt-12 shadow-2xl tracking-tight group"
                >
                  {loading
                    ? (
                      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin">
                      </div>
                    )
                    : (
                      <span className="group-hover:scale-110 transition-transform flex items-center justify-center gap-4">
                        שריין מקום עכשיו <CheckCircle2 size={32} />
                      </span>
                    )}
                </button>
              </div>
            </div>
            <p className="text-gray-400 font-bold text-sm italic">
              * קביעת התור מותנית באישור סופי של מנהל המוסך
            </p>
          </div>
        )}

      {/* Modals */}
      {showModal && (
        <div
          id="booking-modal"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white w-[95%] max-w-lg rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-50 text-start">
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  {editingId && isManager ? "עריכת תור" : "זימון תור חדש"}
                </h2>
                <div className="text-blue-600 font-bold bg-blue-50 inline-block px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-blue-100 mt-1">
                  {selectedDate} • {selectedTime}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-3 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-start">
              {isManager
                ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                          מספר טלפון
                        </label>
                        <input
                          type="tel"
                          className="input-premium h-14"
                          placeholder="050... "
                          value={bookingData.phone}
                          onChange={(e) =>
                            setBookingData({
                              ...bookingData,
                              phone: e.target.value,
                            })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                          שם לקוח
                        </label>
                        <input
                          type="text"
                          className="input-premium h-14"
                          placeholder="ישראל ישראלי"
                          value={bookingData.customerName}
                          onChange={(e) =>
                            setBookingData({
                              ...bookingData,
                              customerName: e.target.value,
                            })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                          מספר רכב
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="input-premium w-full h-14 text-center tracking-widest font-mono"
                            placeholder="12-345-67"
                            value={bookingData.vehiclePlate}
                            onChange={(e) =>
                              setBookingData({
                                ...bookingData,
                                vehiclePlate: formatLicensePlate(
                                  e.target.value,
                                ),
                              })}
                          />
                          <button
                            onClick={handleAutoFill}
                            disabled={loadingApi}
                            className="bg-black text-white px-4 rounded-xl"
                          >
                            {loadingApi
                              ? <Loader className="animate-spin" size={16} />
                              : <Database size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                          יצרן ודגם
                        </label>
                        <input
                          type="text"
                          className="input-premium h-14"
                          placeholder="..."
                          value={bookingData.make}
                          onChange={(e) =>
                            setBookingData({
                              ...bookingData,
                              make: e.target.value,
                            })}
                        />
                      </div>
                    </div>
                  </>
                )
                : null}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                  מהות הטיפול / הערות
                </label>
                <textarea
                  className="input-premium min-h-[120px] resize-none"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  placeholder="פרט כאן..."
                >
                </textarea>
              </div>
            </div>
            <div className="p-6 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={isManager ? handleManagerBook : handleBook}
                className="btn-primary w-full h-16 shadow-xl active:scale-95 flex items-center justify-center gap-3"
              >
                {isManager
                  ? (editingId
                    ? (
                      <>
                        <Edit2 size={20} /> עדכן תור
                      </>
                    )
                    : (
                      <>
                        <Plus size={20} /> שריין תור
                      </>
                    ))
                  : <>שלח בקשת תור</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderOptions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
            <h3 className="text-xl font-black mb-6">מתי תזכורת?</h3>
            <div className="grid grid-cols-1 gap-3">
              {[{ label: "בעוד 30 דקות", mins: 30 }, {
                label: "בעוד שעה",
                mins: 60,
              }, { label: "בעוד שעתיים", mins: 120 }].map((opt) => (
                <button
                  key={opt.mins}
                  onClick={async () => {
                    const d = new Date();
                    d.setMinutes(d.getMinutes() + opt.mins);
                    await approveTask(
                      showReminderOptions.id,
                      false,
                      d.toISOString(),
                    );
                    setShowReminderOptions(null);
                  }}
                  className="bg-gray-50 p-4 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setShowReminderOptions(null)}
                className="mt-4 text-gray-400 font-bold"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {reschedulingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black mb-6 text-center">
              הצע מועד חדש
            </h3>
            <div className="space-y-4">
              <input
                type="date"
                className="input-premium h-14"
                value={rescheduleData.date}
                onChange={(e) =>
                  setRescheduleData({
                    ...rescheduleData,
                    date: e.target.value,
                  })}
              />
              <input
                type="time"
                className="input-premium h-14"
                value={rescheduleData.time}
                onChange={(e) =>
                  setRescheduleData({
                    ...rescheduleData,
                    time: e.target.value,
                  })}
              />
              <div className="flex gap-2 pt-4">
                <button
                  onClick={async () => {
                    if (!rescheduleData.date || !rescheduleData.time) return;
                    await updateTask(reschedulingTask.id, {
                      metadata: {
                        ...reschedulingTask.metadata,
                        appointmentDate: rescheduleData.date,
                        appointmentTime: rescheduleData.time,
                      },
                    });
                    setReschedulingTask(null);
                    toast.success("עודכן");
                  }}
                  className="flex-1 btn-primary py-4 rounded-xl font-black"
                >
                  עדכן
                </button>
                <button
                  onClick={() => setReschedulingTask(null)}
                  className="bg-gray-100 text-gray-600 px-6 py-4 rounded-xl font-black"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsView;
