import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { AppointmentsService } from "@/src/features/appointments/services/appointments.service";
import { supabase } from "@/lib/supabase";
import { AppointmentStatus, UserRole } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("AppointmentsService", () => {
  let service: AppointmentsService;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AppointmentsService();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);
  });

  describe("fetchAppointments", () => {
    it("should fetch appointments with filters", async () => {
      await service.fetchAppointments({ orgId: "org-1", limit: 5 });
      expect(mockChain.eq).toHaveBeenCalledWith("org_id", "org-1");
      expect(mockChain.limit).toHaveBeenCalledWith(5);
    });

    it("should fetch for customer with OR logic", async () => {
      await service.fetchAppointments({
        userId: "u1",
        userRole: UserRole.CUSTOMER,
        vehicleIds: ["v1"],
      });
      expect(mockChain.or).toHaveBeenCalledWith(
        expect.stringContaining("customer_id.eq.u1"),
      );
    });

    it("should throw on failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(service.fetchAppointments({})).rejects.toThrow();
    });
  });

  describe("getAppointment", () => {
    it("should fetch by ID", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "a1" },
        error: null,
      });
      const result = await service.getAppointment("a1");
      expect(mockChain.eq).toHaveBeenCalledWith("id", "a1");
      expect(result.id).toBe("a1");
    });

    it("should throw if not found", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.getAppointment("a1")).rejects.toThrow();
    });
  });

  describe("createAppointment", () => {
    it("should insert appointment", async () => {
      const dto = {
        org_id: "org-1",
        service_type: "Oil",
        appointment_date: "2023-01-01",
        appointment_time: "10:00",
      };
      mockChain.single.mockResolvedValueOnce({
        data: { id: "a1", ...dto },
        error: null,
      });
      const result = await service.createAppointment(dto);
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        service_type: "Oil",
        status: AppointmentStatus.PENDING,
      }));
      expect(result.id).toBe("a1");
    });
  });

  describe("updateAppointment", () => {
    it("should update appointment", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "a1", status: AppointmentStatus.APPROVED },
        error: null,
      });
      const result = await service.updateAppointment("a1", {
        status: AppointmentStatus.APPROVED,
      });
      expect(mockChain.update).toHaveBeenCalledWith({
        status: AppointmentStatus.APPROVED,
      });
      expect(result.status).toBe(AppointmentStatus.APPROVED);
    });
  });

  describe("Status transitions", () => {
    it("approveAppointment should call update", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.approveAppointment("a1");
      expect(mockChain.update).toHaveBeenCalledWith({
        status: AppointmentStatus.APPROVED,
      });
    });

    it("rejectAppointment should call update", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.rejectAppointment("a1");
      expect(mockChain.update).toHaveBeenCalledWith({
        status: AppointmentStatus.REJECTED,
      });
    });

    it("cancelAppointment should call update", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.cancelAppointment("a1");
      expect(mockChain.update).toHaveBeenCalledWith({
        status: AppointmentStatus.CANCELLED,
      });
    });
  });

  describe("createTaskFromAppointment", () => {
    it("should fetch appointment, create task, and link them", async () => {
      const mockAppt = {
        id: "a1",
        org_id: "org-1",
        appointment_date: "2023-01-01",
        appointment_time: "10:00",
      };
      // 1. mock getAppointment
      mockChain.single.mockResolvedValueOnce({ data: mockAppt, error: null });
      // 2. mock task insert
      mockChain.single.mockResolvedValueOnce({
        data: { id: "t1" },
        error: null,
      });
      // 3. mock appt update (linkage)
      mockChain.single.mockResolvedValueOnce({
        data: { id: "a1" },
        error: null,
      });

      const result = await service.createTaskFromAppointment(
        "a1",
        "user-admin",
      );

      expect(result.taskId).toBe("t1");
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringContaining("2023-01-01"),
      }));
      expect(mockChain.update).toHaveBeenCalledWith({ task_id: "t1" });
    });

    it("should throw if task insert fails", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "a1" },
        error: null,
      });
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.createTaskFromAppointment("a1", "u1")).rejects
        .toThrow();
    });
  });
});
