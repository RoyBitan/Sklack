import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppointments } from "../context/AppointmentsContext";
import { PreCheckInData } from "@/types";

export const useAppointmentBooking = () => {
  const { submitCheckIn } = useAppointments();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBookAppointment = useCallback(async (data: PreCheckInData) => {
    setIsSubmitting(true);
    try {
      await submitCheckIn(data);
      toast.success("בקשת התור נשלחה בהצלחה");
      return true;
    } catch (err) {
      console.error("Booking failed:", err);
      toast.error("שגיאה בקביעת תור");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [submitCheckIn]);

  return {
    isSubmitting,
    handleBookAppointment,
  };
};
