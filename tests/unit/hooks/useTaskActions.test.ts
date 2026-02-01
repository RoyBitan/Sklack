import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTaskActions } from "@/src/features/tasks/hooks/useTaskActions";
import { useTasks } from "@/src/features/tasks/context/TasksContext";
import { TaskStatus } from "@/types";

// Mock the context
vi.mock("@/src/features/tasks/context/TasksContext", () => ({
  useTasks: vi.fn(),
}));

// Mock uiUtils
vi.mock("@/utils/uiUtils", () => ({
  playClickSound: vi.fn(),
}));

describe("useTaskActions", () => {
  const mockClaimTask = vi.fn();
  const mockReleaseTask = vi.fn();
  const mockUpdateTaskStatus = vi.fn();
  const mockDeleteTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTasks as any).mockReturnValue({
      claimTask: mockClaimTask,
      releaseTask: mockReleaseTask,
      updateTaskStatus: mockUpdateTaskStatus,
      deleteTask: mockDeleteTask,
    });

    // Mock window.confirm
    window.confirm = vi.fn().mockReturnValue(true);
  });

  it("should handle claiming a task", async () => {
    const { result } = renderHook(() => useTaskActions());

    await act(async () => {
      await result.current.handleClaim("task-1");
    });

    expect(mockClaimTask).toHaveBeenCalledWith("task-1");
  });

  it("should handle releasing a task after confirmation", async () => {
    const { result } = renderHook(() => useTaskActions());

    await act(async () => {
      await result.current.handleRelease("task-1");
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(mockReleaseTask).toHaveBeenCalledWith("task-1");
  });

  it("should not release task if confirmation is rejected", async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    const { result } = renderHook(() => useTaskActions());

    await act(async () => {
      await result.current.handleRelease("task-1");
    });

    expect(mockReleaseTask).not.toHaveBeenCalled();
  });

  it("should handle completing a task", async () => {
    const { result } = renderHook(() => useTaskActions());

    await act(async () => {
      await result.current.handleComplete("task-1");
    });

    expect(mockUpdateTaskStatus).toHaveBeenCalledWith(
      "task-1",
      TaskStatus.COMPLETED,
    );
  });
});
