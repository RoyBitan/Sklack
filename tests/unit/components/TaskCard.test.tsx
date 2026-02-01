import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TaskCard from "@/src/features/tasks/components/TaskCard";
import { Priority, Task, TaskStatus } from "@/types";

// Mock Child Components
vi.mock(
  "../EditTaskModal",
  () => ({ default: () => <div data-testid="edit-modal" /> }),
);
vi.mock(
  "@/components/ProposalCreationModal",
  () => ({ default: () => <div data-testid="proposal-modal" /> }),
);
vi.mock(
  "@/src/features/tasks/components/HandOverModal",
  () => ({ default: () => <div data-testid="handover-modal" /> }),
);

// Mock Sub Components of TaskCard to avoid complex tree rendering
vi.mock(
  "@/src/features/tasks/components/TaskCard/TaskCardHeader",
  () => ({ default: () => <div data-testid="task-header" /> }),
);
vi.mock(
  "@/src/features/tasks/components/TaskCard/TaskCardOverlayActions",
  () => ({ default: () => <div data-testid="task-overlay-actions" /> }),
);
vi.mock(
  "@/src/features/tasks/components/TaskCard/TaskCardApprovalActions",
  () => ({ default: () => <div data-testid="task-approval-actions" /> }),
);
vi.mock(
  "@/src/features/tasks/components/TaskCard/TaskCardMainActions",
  () => ({ default: () => <div data-testid="task-main-actions" /> }),
);
vi.mock(
  "@/src/features/tasks/components/TaskCard/TaskCardStaffInfo",
  () => ({ default: () => <div data-testid="task-staff-info" /> }),
);
vi.mock(
  "@/src/features/tasks/components/TaskCard/TaskCardFooter",
  () => ({ default: () => <div data-testid="task-footer" /> }),
);
vi.mock(
  "@/src/features/tasks/components/TaskCard/TaskCardExpanded",
  () => ({ default: () => <div data-testid="task-expanded" /> }),
);

// Mock Dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { id: "user-1", role: "SUPER_MANAGER" }, // Manager role typically sees more
  }),
}));

vi.mock("@/src/features/tasks/context/TasksContext", () => ({
  useTasks: () => ({
    updateTaskStatus: vi.fn(),
    claimTask: vi.fn(),
    releaseTask: vi.fn(),
    deleteTask: vi.fn(),
    approveTask: vi.fn(),
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("TaskCard Component", () => {
  const mockTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.NORMAL,
    created_at: new Date().toISOString(),
    org_id: "org-1",
    created_by: "user-1",
    vehicle_id: null,
    description: "Test Description",
    assigned_to: [],
    price: 100,
    allotted_time: 60,
    started_at: null,
    completed_at: null,
    vehicle_year: "2020",
    immobilizer_code: null,
    metadata: {
      type: "MANUAL",
      ownerName: "Test Owner",
      ownerPhone: "0501234567",
    },
    vehicle: { plate: "123-45-678", model: "Toyota" } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render main structure and sub-components", () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByTestId("task-header")).toBeInTheDocument();
    expect(screen.getByTestId("task-overlay-actions")).toBeInTheDocument();
    expect(screen.getByTestId("task-main-actions")).toBeInTheDocument();
    expect(screen.getByTestId("task-footer")).toBeInTheDocument();
  });

  it("should expand on click", async () => {
    const { container } = render(<TaskCard task={mockTask} />);

    // Click the card (the outer div)
    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(screen.getByTestId("task-expanded")).toBeInTheDocument();
  });

  it("should match snapshot", () => {
    const { container } = render(<TaskCard task={mockTask} />);
    expect(container).toMatchSnapshot();
  });
});
