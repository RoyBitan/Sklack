import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useManagerDashboardLogic } from "@/src/features/tasks/components/ManagerDashboard/hooks/useManagerDashboardLogic";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { TaskStatus } from "@/types";

// Mock dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/DataContext", () => ({
  useData: vi.fn(),
}));

vi.mock("use-debounce", () => ({
  useDebounce: vi.fn((val) => [val]),
}));

describe("useManagerDashboardLogic", () => {
  const mockDeleteTask = vi.fn();
  const mockUpdateTaskStatus = vi.fn();
  const mockTasks = [
    { id: "1", title: "Task 1", status: TaskStatus.WAITING, assigned_to: [] },
    {
      id: "2",
      title: "Task 2",
      status: TaskStatus.IN_PROGRESS,
      assigned_to: ["u1"],
    },
    {
      id: "3",
      title: "Task 3",
      status: TaskStatus.COMPLETED,
      assigned_to: ["u1"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      profile: { id: "m1", role: "SUPER_MANAGER" },
    });
    (useData as any).mockReturnValue({
      tasks: mockTasks,
      loading: false,
      deleteTask: mockDeleteTask,
      updateTaskStatus: mockUpdateTaskStatus,
      hasMoreTasks: false,
      loadMoreTasks: vi.fn(),
    });

    window.confirm = vi.fn().mockReturnValue(true);
  });

  it("should calculate correct stats", () => {
    const { result } = renderHook(() => useManagerDashboardLogic());

    expect(result.current.stats.waiting).toBe(1);
    expect(result.current.stats.inProgress).toBe(1);
    expect(result.current.stats.completed).toBe(1);
  });

  it("should filter tasks by search query", () => {
    const { result } = renderHook(() => useManagerDashboardLogic());

    act(() => {
      result.current.setSearchQuery("Task 1");
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe("1");
  });

  it("should handle task deletion with confirmation", async () => {
    const { result } = renderHook(() => useManagerDashboardLogic());

    await act(async () => {
      await result.current.handleDeleteTask(mockTasks[0] as any);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteTask).toHaveBeenCalledWith("1");
  });
});
