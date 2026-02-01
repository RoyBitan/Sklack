import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAppointmentBooking } from "@/src/features/appointments/hooks/useAppointmentBooking";
import { useAppointments } from "@/src/features/appointments/context/AppointmentsContext";

// Mock the context
vi.mock("@/src/features/appointments/context/AppointmentsContext", () => ({
  useAppointments: vi.fn(),
}));

describe("useAppointmentBooking", () => {
  const mockSubmitCheckIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppointments as any).mockReturnValue({
      submitCheckIn: mockSubmitCheckIn,
    });
  });

  it("should successfully book an appointment", async () => {
    const { result } = renderHook(() => useAppointmentBooking());
    const mockData = { vehiclePlate: "123", faultDescription: "Fix me" };

    let success;
    await act(async () => {
      success = await result.current.handleBookAppointment(mockData as any);
    });

    expect(mockSubmitCheckIn).toHaveBeenCalledWith(mockData);
    expect(success).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("should handle booking failure", async () => {
    mockSubmitCheckIn.mockRejectedValue(new Error("Failed"));
    const { result } = renderHook(() => useAppointmentBooking());

    let success;
    await act(async () => {
      success = await result.current.handleBookAppointment({} as any);
    });

    expect(success).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });
});
