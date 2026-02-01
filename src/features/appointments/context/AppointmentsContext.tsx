import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/src/features/auth";
import { useNotifications } from "@/src/features/notifications";
import {
  Appointment,
  AppointmentStatus,
  PreCheckInData,
  UserRole,
} from "@/types";
import {
  appointmentsService,
  CreateAppointmentDTO,
} from "../services/appointments.service";
import { vehiclesService } from "@/src/features/vehicles";

interface AppointmentsContextType {
  appointments: Appointment[];
  loading: boolean;
  refreshAppointments: () => Promise<void>;
  approveAppointment: (
    appointmentId: string,
    createTaskNow: boolean,
  ) => Promise<void>;
  submitCheckIn: (data: PreCheckInData) => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(
  undefined,
);

export const AppointmentsProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();
  const { sendSystemNotification } = useNotifications();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshAppointments = useCallback(async () => {
    const curr = profileRef.current;
    if (!curr?.org_id && curr?.role !== UserRole.CUSTOMER) return;

    setLoading(true);
    try {
      // Get vehicle IDs if customer
      let vehicleIds: string[] = [];
      if (curr.role === UserRole.CUSTOMER) {
        vehicleIds = await vehiclesService.getVehicleIdsByOwner(curr.id);
      }

      const data = await appointmentsService.fetchAppointments({
        orgId: curr.org_id || undefined,
        userId: curr.id,
        userRole: curr.role,
        vehicleIds,
        limit: 20,
      });
      setAppointments(data);
    } catch (e) {
      console.error("Failed to fetch appointments", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const approveAppointment = useCallback(
    async (appointmentId: string, createTaskNow: boolean) => {
      const curr = profileRef.current;
      if (!curr) return;

      try {
        // Get appointment details first
        const appt = await appointmentsService.getAppointment(appointmentId);

        // Approve the appointment
        await appointmentsService.approveAppointment(appointmentId);

        // Create task if requested
        if (createTaskNow) {
          await appointmentsService.createTaskFromAppointment(
            appointmentId,
            curr.id,
          );
        }

        // Send notification to customer
        if (appt.customer_id && sendSystemNotification) {
          await sendSystemNotification(
            appt.customer_id,
            "התור אושר ✅",
            "בקשת התור שלך אושרה.",
            "APPOINTMENT_APPROVED",
            appointmentId,
          );
        }

        toast.success("תור אושר בהצלחה");
        refreshAppointments();
      } catch (e) {
        console.error("approveAppointment error:", e);
        toast.error("שגיאה באישור תור");
      }
    },
    [refreshAppointments, sendSystemNotification],
  );

  const submitCheckIn = useCallback(async (data: PreCheckInData) => {
    const curr = profileRef.current;
    if (!curr?.org_id) return;

    try {
      // Find the vehicle by plate
      const vehicle = await vehiclesService.getVehicleByPlate(
        data.vehiclePlate,
        curr.org_id,
      );

      if (!vehicle) {
        toast.error("רכב לא נמצא");
        return;
      }

      const dto: CreateAppointmentDTO = {
        org_id: curr.org_id,
        vehicle_id: vehicle.id,
        customer_id: curr.id,
        service_type: data.serviceTypes?.join(", ") || "General",
        description: data.faultDescription,
        appointment_date: data.appointmentDate ||
          new Date().toISOString().split("T")[0],
        appointment_time: data.appointmentTime ||
          new Date().toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        mileage: data.currentMileage
          ? parseInt(data.currentMileage)
          : undefined,
        status: AppointmentStatus.PENDING,
        metadata: { ...data, submittedAt: Date.now() },
      };

      await appointmentsService.createAppointment(dto);
      toast.success("הבקשה נשלחה בהצלחה");
      refreshAppointments();
    } catch (e) {
      console.error("submitCheckIn error:", e);
      toast.error("נכשל בשליחת הבקשה");
    }
  }, [refreshAppointments]);

  // Realtime
  useEffect(() => {
    if (!profile?.org_id) return;
    refreshAppointments();

    const channel = supabase.channel(`appointments-${profile.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `org_id=eq.${profile.org_id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setAppointments((prev) => [...prev, payload.new as Appointment]);
        } else if (payload.eventType === "UPDATE") {
          setAppointments((prev) =>
            prev.map((a) =>
              a.id === payload.new.id ? { ...a, ...payload.new } : a
            )
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.org_id, refreshAppointments]);

  const value = {
    appointments,
    loading,
    refreshAppointments,
    approveAppointment,
    submitCheckIn,
  };

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
};

export const useAppointments = () => {
  const context = useContext(AppointmentsContext);
  if (!context) throw new Error("useAppointments must be used within Provider");
  return context;
};
