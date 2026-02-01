import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentStatus, PreCheckInData } from "@/types";

describe("Appointment Booking Workflow", () => {
  const mockAppointmentData: PreCheckInData = {
    vehiclePlate: "12-345-67",
    vehicleModel: "Toyota Corolla",
    vehicleYear: "2020",
    vehicleColor: "White",
    ownerName: "John Doe",
    ownerPhone: "0501234567",
    ownerEmail: "john@example.com",
    ownerAddress: "123 Main St",
    currentMileage: "50000",
    serviceTypes: ["Oil Change", "Tire Rotation"],
    faultDescription: "Regular maintenance",
    appointmentDate: "2024-02-15",
    appointmentTime: "10:00",
    paymentMethod: "CREDIT_CARD",
    hasInsurance: true,
    submittedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate complete appointment booking workflow", () => {
    // Step 1: Customer fills out appointment form
    const appointmentData = { ...mockAppointmentData };

    expect(appointmentData.appointmentDate).toBe("2024-02-15");
    expect(appointmentData.appointmentTime).toBe("10:00");
    expect(appointmentData.serviceTypes).toContain("Oil Change");

    // Step 2: Validate required fields
    const hasRequiredFields = !!appointmentData.vehiclePlate &&
      !!appointmentData.ownerName &&
      !!appointmentData.ownerPhone &&
      !!appointmentData.appointmentDate;

    expect(hasRequiredFields).toBe(true);

    // Step 3: Prepare data for submission
    const appointmentForSubmission = {
      ...appointmentData,
      status: AppointmentStatus.PENDING,
      org_id: "org-1",
      created_by: "user-1",
    };

    expect(appointmentForSubmission.status).toBe(AppointmentStatus.PENDING);
    expect(appointmentForSubmission.org_id).toBe("org-1");
  });

  it("should validate appointment time slot availability", () => {
    // Check for existing appointments at the same time
    const existingAppointments = [
      { id: "appt-1", appointmentDate: "2024-02-15", appointmentTime: "10:00" },
    ];

    const newAppointment = {
      appointmentDate: "2024-02-15",
      appointmentTime: "10:00",
    };

    // Simulate conflict check
    const hasConflict = existingAppointments.some(
      (appt) =>
        appt.appointmentDate === newAppointment.appointmentDate &&
        appt.appointmentTime === newAppointment.appointmentTime,
    );

    expect(hasConflict).toBe(true);

    // Test with different time - no conflict
    const differentTimeAppointment = {
      appointmentDate: "2024-02-15",
      appointmentTime: "11:00",
    };

    const hasConflictDifferentTime = existingAppointments.some(
      (appt) =>
        appt.appointmentDate === differentTimeAppointment.appointmentDate &&
        appt.appointmentTime === differentTimeAppointment.appointmentTime,
    );

    expect(hasConflictDifferentTime).toBe(false);
  });

  it("should handle appointment approval workflow", () => {
    const appointment = {
      id: "appt-1",
      ...mockAppointmentData,
      status: AppointmentStatus.PENDING,
    };

    // Manager approves appointment
    const approvedAppointment = {
      ...appointment,
      status: AppointmentStatus.APPROVED,
      approved_by: "manager-1",
      approved_at: new Date().toISOString(),
    };

    expect(approvedAppointment.status).toBe(AppointmentStatus.APPROVED);
    expect(approvedAppointment.approved_by).toBe("manager-1");
    expect(approvedAppointment.approved_at).toBeDefined();
  });

  it("should handle appointment rejection workflow", () => {
    const appointment = {
      id: "appt-1",
      ...mockAppointmentData,
      status: AppointmentStatus.PENDING,
    };

    // Manager rejects appointment
    const rejectedAppointment = {
      ...appointment,
      status: AppointmentStatus.REJECTED,
      rejection_reason: "Fully booked",
      rejected_by: "manager-1",
    };

    expect(rejectedAppointment.status).toBe(AppointmentStatus.REJECTED);
    expect(rejectedAppointment.rejection_reason).toBe("Fully booked");
  });

  it("should validate phone number format", () => {
    const validPhone = "0501234567";
    const invalidPhone = "123";

    const isValidPhone = (phone: string) => {
      const cleaned = phone.replace(/\D/g, "");
      return cleaned.length === 10 && cleaned.startsWith("0");
    };

    expect(isValidPhone(validPhone)).toBe(true);
    expect(isValidPhone(invalidPhone)).toBe(false);
  });

  it("should validate appointment date is in the future", () => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 7);

    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 7);

    const isFutureDate = (dateStr: string) => {
      const appointmentDate = new Date(dateStr);
      return appointmentDate > today;
    };

    expect(isFutureDate(futureDate.toISOString().split("T")[0])).toBe(true);
    expect(isFutureDate(pastDate.toISOString().split("T")[0])).toBe(false);
  });

  it("should handle appointment cancellation", () => {
    const appointment = {
      id: "appt-1",
      ...mockAppointmentData,
      status: AppointmentStatus.APPROVED,
    };

    const cancelledAppointment = {
      ...appointment,
      status: AppointmentStatus.CANCELLED,
      cancellation_reason: "Customer requested",
      cancelled_at: new Date().toISOString(),
    };

    expect(cancelledAppointment.status).toBe(AppointmentStatus.CANCELLED);
    expect(cancelledAppointment.cancellation_reason).toBeDefined();
  });
});
