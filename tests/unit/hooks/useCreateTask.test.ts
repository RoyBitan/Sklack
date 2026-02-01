import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCreateTaskLogic } from "@/src/features/tasks/components/CreateTaskModal/hooks/useCreateTaskLogic";
import { useTasks } from "@/src/features/tasks/context/TasksContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Mock dependencies
vi.mock("@/src/features/tasks/context/TasksContext", () => ({
  useTasks: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: vi.fn().mockReturnValue({
    canAddMoreTasks: true,
    activeTasksCount: 0,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({
        data: { id: "mock-id" },
        error: null,
      }),
    })),
  },
}));

describe("useCreateTask (mapped to useCreateTaskLogic)", () => {
  const mockOnClose = vi.fn();
  const mockRefreshTasks = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      profile: { id: "user-1", org_id: "org-1" },
    });
    (useTasks as any).mockReturnValue({
      refreshTasks: mockRefreshTasks,
    });
  });

  it("should update form data when updateField is called", () => {
    const { result } = renderHook(() => useCreateTaskLogic(mockOnClose));

    act(() => {
      result.current.updateField("title", "New Task");
    });

    expect(result.current.formData.title).toBe("New Task");
  });

  it("should validate and submit form", async () => {
    const { result } = renderHook(() => useCreateTaskLogic(mockOnClose));

    act(() => {
      result.current.updateField("title", "Test Task");
      result.current.updateField("plate", "12345678");
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(mockRefreshTasks).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should show error if title is empty", async () => {
    const { result } = renderHook(() => useCreateTaskLogic(mockOnClose));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(result.current.error).toContain("אנא הזן כותרת");
    expect(mockRefreshTasks).not.toHaveBeenCalled();
  });
});
