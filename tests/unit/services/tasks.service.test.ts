import { beforeEach, describe, expect, it, vi } from "vitest";
import { tasksService } from "@/services/api/tasks.service";
import { supabase } from "@/lib/supabase";
import { TaskStatus } from "@/types";

describe("TasksService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTask", () => {
    it("should fetch a task by ID", async () => {
      const mockTaskData = { id: "123", title: "Test Task" };

      // Mock the supabase chain
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockTaskData,
        error: null,
      });
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await tasksService.getTask("123");

      expect(supabase.from).toHaveBeenCalledWith("tasks");
      expect(mockEq).toHaveBeenCalledWith("id", "123");
      expect(result).toEqual(mockTaskData);
    });

    it("should throw error if task not found", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      } as any);

      await expect(tasksService.getTask("123")).rejects.toThrow();
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status and set started_at when IN_PROGRESS", async () => {
      const taskId = "123";
      const mockTaskData = { id: taskId, status: TaskStatus.IN_PROGRESS };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockTaskData,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      } as any);

      await tasksService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: TaskStatus.IN_PROGRESS,
        started_at: expect.any(String),
      }));
    });
  });
});
