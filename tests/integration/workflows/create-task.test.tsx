import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCreateTaskLogic } from "@/components/CreateTaskModal/hooks/useCreateTaskLogic";
import { supabase } from "@/lib/supabase";

// Mock the context providers
vi.mock("@/contexts/DataContext", () => ({
  useData: () => ({
    refreshData: vi.fn(),
    lookupCustomerByPhone: vi.fn(),
    fetchTeamMembers: vi.fn().mockResolvedValue([]),
    notifyMultiple: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { id: "user-1", org_id: "org-1" },
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    canAddMoreTasks: true,
    activeTasksCount: 5,
  }),
}));

describe("useCreateTaskLogic", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default form data", () => {
    const { result } = renderHook(() => useCreateTaskLogic(onClose));
    expect(result.current.formData.title).toBe("");
    expect(result.current.formData.isUrgent).toBe(false);
  });

  it("should update fields correctly", () => {
    const { result } = renderHook(() => useCreateTaskLogic(onClose));

    act(() => {
      result.current.updateField("title", "Test Title");
    });

    expect(result.current.formData.title).toBe("Test Title");
  });

  it("should validate phone number on submit", async () => {
    const { result } = renderHook(() => useCreateTaskLogic(onClose));

    act(() => {
      result.current.updateField("title", "Valid Title");
      result.current.updateField("phone", "123"); // Invalid phone
    });

    await act(async () => {
      const event = { preventDefault: vi.fn() } as any;
      await result.current.handleSubmit(event);
    });

    expect(result.current.error).toBe("מספר טלפון לא תקין (דרושות 10 ספרות)");
  });
});
