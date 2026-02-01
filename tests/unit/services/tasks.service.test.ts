import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { TasksService } from "@/src/features/tasks/services/tasks.service";
import { supabase } from "@/lib/supabase";
import { TaskStatus, UserRole } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("TasksService", () => {
  let service: TasksService;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TasksService();

    // Mock implementation for the fluent chain
    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      or: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);
  });

  describe("fetchTasks", () => {
    it("should fetch tasks for a manager", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: [{ id: "1" }], error: null }),
        );
      });

      const result = await service.fetchTasks({ orgId: "org-1", limit: 10 });

      expect(supabase.from).toHaveBeenCalledWith("tasks");
      expect(mockChain.eq).toHaveBeenCalledWith("org_id", "org-1");
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(result.tasks).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it("should fetch tasks for a customer with or logic", async () => {
      await service.fetchTasks({
        userId: "user-1",
        userRole: UserRole.CUSTOMER,
        vehicleIds: ["v1", "v2"],
      });

      expect(mockChain.or).toHaveBeenCalledWith(
        expect.stringContaining("customer_id.eq.user-1"),
      );
      expect(mockChain.or).toHaveBeenCalledWith(
        expect.stringContaining("vehicle_id.in.(v1,v2)"),
      );
    });

    it("should handle cursor pagination", async () => {
      await service.fetchTasks({ cursor: "2023-01-01" });
      expect(mockChain.lt).toHaveBeenCalledWith("created_at", "2023-01-01");
    });

    it("should throw error on fetch failure", async () => {
      mockChain.then.mockImplementation((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });

      await expect(service.fetchTasks({})).rejects.toThrow();
    });
  });

  describe("getTask", () => {
    it("should fetch a single task", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "123" },
        error: null,
      });

      const result = await service.getTask("123");

      expect(mockChain.eq).toHaveBeenCalledWith("id", "123");
      expect(result.id).toBe("123");
    });

    it("should throw TaskNotFoundError if not found", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });
      await expect(service.getTask("123")).rejects.toThrow();
    });
  });

  describe("createTask", () => {
    it("should insert a new task", async () => {
      const dto = { org_id: "org-1", title: "New Task", created_by: "user-1" };
      mockChain.single.mockResolvedValueOnce({
        data: { id: "new-id", ...dto },
        error: null,
      });

      const result = await service.createTask(dto);

      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: "New Task",
        status: TaskStatus.WAITING,
      }));
      expect(result.id).toBe("new-id");
    });

    it("should throw TaskCreationError on failure", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Error" },
      });
      await expect(service.createTask({} as any)).rejects.toThrow();
    });
  });

  describe("updateTask", () => {
    it("should update an existing task", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "123", title: "Updated" },
        error: null,
      });

      const result = await service.updateTask("123", { title: "Updated" });

      expect(mockChain.update).toHaveBeenCalledWith({ title: "Updated" });
      expect(mockChain.eq).toHaveBeenCalledWith("id", "123");
      expect(result.title).toBe("Updated");
    });

    it("should throw TaskUpdateError on failure", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Error" },
      });
      await expect(service.updateTask("123", {})).rejects.toThrow();
    });
  });

  describe("updateTaskStatus", () => {
    it("should set started_at when status is IN_PROGRESS", async () => {
      mockChain.single.mockResolvedValue({ data: { id: "123" }, error: null });

      await service.updateTaskStatus("123", TaskStatus.IN_PROGRESS);

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.IN_PROGRESS,
        started_at: expect.any(String),
      }));
    });

    it("should set completed_at when status is COMPLETED", async () => {
      mockChain.single.mockResolvedValue({ data: { id: "123" }, error: null });

      await service.updateTaskStatus("123", TaskStatus.COMPLETED);

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.COMPLETED,
        completed_at: expect.any(String),
      }));
    });
  });

  describe("claimTask", () => {
    it("should add user to assigned_to and set IN_PROGRESS", async () => {
      // Mock get current task
      mockChain.single.mockResolvedValueOnce({
        data: { assigned_to: ["user-old"] },
        error: null,
      });
      // Mock update
      mockChain.single.mockResolvedValueOnce({
        data: { id: "123" },
        error: null,
      });

      await service.claimTask("123", "user-new");

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        assigned_to: ["user-old", "user-new"],
        status: TaskStatus.IN_PROGRESS,
      }));
    });

    it("should throw error if task not found for claiming", async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.claimTask("123", "u1")).rejects.toThrow();
    });
  });

  describe("releaseTask", () => {
    it("should remove user from assigned_to", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { assigned_to: ["u1", "u2"] },
        error: null,
      });
      mockChain.single.mockResolvedValueOnce({
        data: { id: "123" },
        error: null,
      });

      await service.releaseTask("123", "u1");

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        assigned_to: ["u2"],
      }));
    });

    it("should set status to WAITING if no users left", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { assigned_to: ["u1"] },
        error: null,
      });
      mockChain.single.mockResolvedValueOnce({
        data: { id: "123" },
        error: null,
      });

      await service.releaseTask("123", "u1");

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.WAITING,
      }));
    });
  });

  describe("cancelTask", () => {
    it("should set status to CANCELLED", async () => {
      await service.cancelTask("123");
      expect(mockChain.update).toHaveBeenCalledWith({
        status: TaskStatus.CANCELLED,
      });
    });

    it("should throw error if cancel fails", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: { message: "Fail" } }));
      });
      await expect(service.cancelTask("123")).rejects.toThrow();
    });
  });

  describe("approveTask", () => {
    it("should set status to WAITING if sendToTeamNow is true", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.approveTask("123", true);
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.WAITING,
      }));
    });

    it("should set status to SCHEDULED if sendToTeamNow is false", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.approveTask("123", false, "2023-12-01");
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.SCHEDULED,
        scheduled_reminder_at: "2023-12-01",
      }));
    });
  });

  describe("getTaskBasicInfo", () => {
    it("should fetch basic info", async () => {
      mockChain.single.mockResolvedValue({
        data: { customer_id: "c1", title: "T1" },
        error: null,
      });
      const result = await service.getTaskBasicInfo("123");
      expect(result.customer_id).toBe("c1");
    });

    it("should throw error if basic info fetch fails", async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: "Error" },
      });
      await expect(service.getTaskBasicInfo("123")).rejects.toThrow();
    });
  });
});
