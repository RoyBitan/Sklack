import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../../contexts/AppContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useData } from "../../../contexts/DataContext";
import { supabase } from "../../../lib/supabase";
import { AppointmentStatus, Task, UserRole } from "../../../types";
import { cleanLicensePlate } from "../../../utils/formatters";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "../../../utils/vehicleApi";
import { scrollToTop } from "../../../utils/uiUtils";

export const useAppointmentsLogic = () => {
  const {
    appointments,
    refreshData,
    tasks,
    approveTask,
    approveAppointment,
    updateTask,
    updateTaskStatus,
    sendSystemNotification,
  } = useData();
  const { profile } = useAuth();
  const { navigateTo } = useApp();

  const isManager = profile?.role === UserRole.SUPER_MANAGER ||
    profile?.role === UserRole.STAFF;

  // View State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [mileage, setMileage] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null);
  const [showReminderOptions, setShowReminderOptions] = useState<Task | null>(
    null,
  );
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" });

  // Booking Form Data
  const [bookingData, setBookingData] = useState({
    customerName: "",
    phone: "",
    vehiclePlate: "",
    serviceType: "",
    duration: "1 שעה",
    make: "",
    mileage: "",
  });

  // CONSTANTS
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

  // Derived Logic
  const pendingRequests = useMemo(
    () => appointments.filter((a) => a.status === AppointmentStatus.PENDING),
    [appointments],
  );

  // Effects
  useEffect(() => {
    if (showModal) {
      setTimeout(() => scrollToTop(), 100);
    }
  }, [showModal]);

  // Navigation Helpers
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

  // Actions
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
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "שגיאה בטעינת נתוני הרכב";
      toast.error(message);
    } finally {
      setLoadingApi(false);
    }
  };

  const handleManagerBook = async () => {
    if (!selectedTime || !profile?.org_id) return;
    setLoading(true);
    try {
      const payload: Partial<import("../../../types").Appointment> & {
        customer_name?: string;
        vehicle_plate?: string;
      } = {
        org_id: profile.org_id,
        service_type: bookingData.serviceType || "טיפול",
        description: selectedService,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        status: AppointmentStatus.PENDING,
        customer_name: bookingData.customerName,
        vehicle_plate: bookingData.vehiclePlate,
        mileage: bookingData.mileage ? parseInt(bookingData.mileage) : null,
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
        status: AppointmentStatus.PENDING,
        mileage: mileage ? parseInt(mileage) : null,
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

  const handleEdit = (appointment: import("../../../types").Appointment) => {
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
      mileage: appointment.mileage?.toString() || "",
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
      mileage: "",
    });
    setSelectedService("");
    setShowModal(true);
  };

  return {
    // State
    profile,
    isManager,
    viewDate,
    setViewDate,
    selectedDate,
    setSelectedDate,
    mileage,
    setMileage,
    selectedTime,
    setSelectedTime,
    selectedService,
    setSelectedService,
    loading,
    setLoading,
    loadingApi,
    setLoadingApi,
    showModal,
    setShowModal,
    editingId,
    setEditingId,
    reschedulingTask,
    setReschedulingTask,
    showReminderOptions,
    setShowReminderOptions,
    rescheduleData,
    setRescheduleData,
    bookingData,
    setBookingData,

    // Data
    appointments,
    tasks,
    pendingRequests,
    WORKING_HOURS,
    weekDays,

    // Actions
    navigateWeek,
    navigateMonth,
    goToToday,
    isToday,
    formatDateForDB,
    handleAutoFill,
    handleManagerBook,
    handleBook,
    handleDelete,
    handleEdit,
    handleSlotClick,
    refreshData,
    approveTask,
    approveAppointment,
    updateTask,
    updateTaskStatus,
    navigateTo,
  };
};
