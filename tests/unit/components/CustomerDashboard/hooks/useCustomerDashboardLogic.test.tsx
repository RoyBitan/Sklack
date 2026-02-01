import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { useCustomerDashboardLogic } from "@/src/features/tasks/components/CustomerDashboard/hooks/useCustomerDashboardLogic";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { supabase } from "@/lib/supabase";
import { mockProfile, mockTask, mockVehicle } from "@/tests/mocks";
import { ProposalStatus, TaskStatus } from "@/types";

// Mock dependencies
vi.mock("@/contexts/AppContext", () => ({
  useApp: vi.fn(),
  AppProvider: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: vi.fn(),
}));
vi.mock("@/contexts/DataContext", () => ({
  useData: vi.fn(),
  DataProvider: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("@/utils/assetUtils", () => ({
  compressImage: vi.fn((file) => Promise.resolve(file)),
  uploadAsset: vi.fn(() => Promise.resolve("https://example.com/image.jpg")),
  deleteAsset: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/utils/uiUtils", () => ({
  scrollToFormStart: vi.fn(),
  playClickSound: vi.fn(),
  scrollToFormStartWithRef: vi.fn(),
}));

vi.mock("@/utils/vehicleApi", () => ({
  fetchVehicleDataFromGov: vi.fn(),
  isValidIsraeliPlate: vi.fn(() => true),
}));

vi.mock("@/utils/formatters", () => ({
  cleanLicensePlate: vi.fn((val) => val.replace(/-/g, "")),
  formatLicensePlate: vi.fn((val) => val),
  sanitize: vi.fn((val) => val),
}));

vi.mock("@/utils/phoneUtils", () => ({
  isValidPhone: vi.fn(() => true),
  normalizePhone: vi.fn((val) => val),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useCustomerDashboardLogic", () => {
  const mockNavigateTo = vi.fn();
  const mockRefreshProfile = vi.fn();
  const mockUpdateUser = vi.fn();
  const mockAddVehicle = vi.fn();
  const mockSubmitCheckIn = vi.fn();
  const mockUpdateTask = vi.fn();
  const mockAddProposal = vi.fn();
  const mockDeleteTask = vi.fn();
  const mockRemoveVehicle = vi.fn();
  const mockRefreshData = vi.fn();
  const mockUpdateTaskStatus = vi.fn();
  const mockUpdateProposal = vi.fn();
  const mockLoadMoreTasks = vi.fn();

  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
      order: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);

    // Default Context Returns
    (useApp as any).mockReturnValue({
      user: mockProfile,
      t: (key: string) => key,
      navigateTo: mockNavigateTo,
    });

    (useAuth as any).mockReturnValue({
      profile: mockProfile,
      user: { id: "user-123", email: "test@example.com" },
      refreshProfile: mockRefreshProfile,
    });

    (useData as any).mockReturnValue({
      tasks: [mockTask],
      vehicles: [mockVehicle],
      loading: false,
      hasMoreTasks: false,
      deleteTask: mockDeleteTask,
      refreshData: mockRefreshData,
      updateTask: mockUpdateTask,
      submitCheckIn: mockSubmitCheckIn,
      loadMoreTasks: mockLoadMoreTasks,
      updateTaskStatus: mockUpdateTaskStatus,
      updateProposal: mockUpdateProposal,
      addProposal: mockAddProposal,
      updateUser: mockUpdateUser,
      addVehicle: mockAddVehicle,
      removeVehicle: mockRemoveVehicle,
    });
  });

  it("should initialize with tasks and vehicles", () => {
    const { result } = renderHook(() => useCustomerDashboardLogic());

    expect(result.current.myTasks).toEqual([mockTask]);
    expect(result.current.myVehicles).toEqual([mockVehicle]);
    expect(result.current.activeTasks).toHaveLength(1);
  });

  it("should filter completed tasks", () => {
    const completedTask = {
      ...mockTask,
      id: "task-completed",
      status: TaskStatus.COMPLETED,
    };
    (useData as any).mockReturnValue({
      tasks: [mockTask, completedTask],
      vehicles: [mockVehicle],
      loading: false,
    });

    const { result } = renderHook(() => useCustomerDashboardLogic());

    expect(result.current.activeTasks).toHaveLength(1);
    expect(result.current.completedTasks).toHaveLength(1);
  });

  it("should handle add vehicle submission with valid data", async () => {
    const { result } = renderHook(() => useCustomerDashboardLogic());

    await act(async () => {
      result.current.setNewVehicle({
        plate: "12-345-67",
        model: "Test Model",
      });
      result.current.setShowAddVehicle(true);
    });

    await act(async () => {
      await result.current.handleAddVehicleSubmit(
        { preventDefault: vi.fn() } as any,
      );
    });

    expect(mockAddVehicle).toHaveBeenCalledWith(expect.objectContaining({
      plate: "1234567",
      model: "Test Model",
    }));
    expect(result.current.showAddVehicle).toBe(false);
  });

  it("should handle check-in submission for new task", async () => {
    const { result } = renderHook(() => useCustomerDashboardLogic());

    await act(async () => {
      result.current.setShowCheckIn(mockVehicle);
    });

    await act(async () => {
      result.current.setCheckInForm({
        ownerName: "Test User",
        ownerPhone: "0501234567",
        faultDescription: "Broken engine",
      });
    });

    await act(async () => {
      await result.current.handleCheckInSubmit(
        { preventDefault: vi.fn() } as any,
      );
    });

    expect(mockSubmitCheckIn).toHaveBeenCalled();
    const calledWith = (mockSubmitCheckIn as Mock).mock.calls[0][0];
    expect(calledWith.ownerName).toBe("Test User");
    expect(result.current.showCheckIn).toBeNull();
  });

  it("should handle customer request submission", async () => {
    const { result } = renderHook(() => useCustomerDashboardLogic());

    await act(async () => {
      result.current.setShowRequestForm("task-123");
      result.current.setRequestText("Need clean car");
    });

    await act(async () => {
      await result.current.submitCustomerRequest("task-123");
    });

    expect(mockAddProposal).toHaveBeenCalledWith(
      "task-123",
      expect.objectContaining({
        description: "Need clean car",
      }),
    );
    expect(result.current.showRequestForm).toBeNull();
  });

  it("should handle disconnect", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() =>
      true
    );
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { ...originalLocation, href: "" };

    const { result } = renderHook(() => useCustomerDashboardLogic());

    await act(async () => {
      await result.current.handleDisconnect();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith("user-123", {
      org_id: null,
      membership_status: "PENDING",
    });
    confirmSpy.mockRestore();
    (window as any).location = originalLocation;
  });

  it("should handle payment success", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCustomerDashboardLogic());

    act(() => {
      result.current.handlePay("task-123");
    });

    expect(result.current.processingId).toBe("task-123");

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.processingId).toBeNull();
    expect(mockUpdateTaskStatus).toHaveBeenCalledWith(
      "task-123",
      TaskStatus.COMPLETED,
    );
    vi.useRealTimers();
  });

  it("should handle proposal response", () => {
    const { result } = renderHook(() => useCustomerDashboardLogic());

    act(() => {
      result.current.handleProposalResponse("task-123", "prop-123", true);
    });

    expect(mockUpdateProposal).toHaveBeenCalledWith("task-123", "prop-123", {
      status: ProposalStatus.APPROVED,
    });
  });

  it("should handle task editing", () => {
    const { result } = renderHook(() => useCustomerDashboardLogic());

    act(() => {
      result.current.handleEditTask(mockTask);
    });

    expect(result.current.editingTaskId).toBe(mockTask.id);
  });

  it("should handle document upload", async () => {
    const { result } = renderHook(() => useCustomerDashboardLogic());
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

    mockChain.single.mockResolvedValueOnce({
      data: { documents: {} },
      error: null,
    });
    // For the update part, we need it to resolve successfully
    mockChain.then.mockImplementationOnce((onfulfilled) => {
      return Promise.resolve(onfulfilled({ error: null }));
    });

    await act(async () => {
      await result.current.handleDocUpload("license", file);
    });

    expect(result.current.uploadingDoc).toBeNull();
    await waitFor(() => {
      expect(mockRefreshProfile).toHaveBeenCalled();
    });
  });

  it("should fetch garage phone on mount", async () => {
    renderHook(() => useCustomerDashboardLogic());

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("profiles");
    });
  });
});
