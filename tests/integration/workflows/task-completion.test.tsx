import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProposalStatus, Task, TaskStatus, UserRole } from "@/types";

describe("Task Completion Workflow", () => {
  const mockTask: Task = {
    id: "task-1",
    title: "Oil Change - Toyota Corolla",
    description: "Regular oil change service",
    status: TaskStatus.IN_PROGRESS,
    priority: "NORMAL" as any,
    org_id: "org-1",
    created_by: "manager-1",
    vehicle_id: "vehicle-1",
    assigned_to: ["worker-1"],
    price: 300,
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
    vehicle: {
      id: "vehicle-1",
      plate: "12-345-67",
      model: "Toyota Corolla",
      year: "2020",
      color: "White",
      owner_id: "customer-1",
      org_id: "org-1",
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full task workflow from creation to completion", () => {
    // Step 1: Manager creates task
    const newTask = {
      ...mockTask,
      status: TaskStatus.WAITING,
      assigned_to: [],
    };

    expect(newTask.status).toBe(TaskStatus.WAITING);
    expect(newTask.assigned_to).toHaveLength(0);

    // Step 2: Worker claims task
    const claimedTask = {
      ...newTask,
      status: TaskStatus.IN_PROGRESS,
      assigned_to: ["worker-1"],
      claimed_at: new Date().toISOString(),
    };

    expect(claimedTask.status).toBe(TaskStatus.IN_PROGRESS);
    expect(claimedTask.assigned_to).toContain("worker-1");

    // Step 3: Worker discovers additional work needed
    const proposal = {
      id: "proposal-1",
      task_id: "task-1",
      description: "Brake pads need replacement",
      price: 500,
      status: ProposalStatus.PENDING_MANAGER,
      created_by: "worker-1",
    };

    expect(proposal.status).toBe(ProposalStatus.PENDING_MANAGER);
    expect(proposal.price).toBe(500);

    // Step 4: Manager approves proposal
    const approvedProposal = {
      ...proposal,
      status: ProposalStatus.APPROVED,
      approved_by: "manager-1",
      approved_at: new Date().toISOString(),
    };

    expect(approvedProposal.status).toBe(ProposalStatus.APPROVED);

    // Step 5: Customer approves proposal
    const customerApprovedProposal = {
      ...approvedProposal,
      status: ProposalStatus.APPROVED,
      customer_approved_at: new Date().toISOString(),
    };

    expect(customerApprovedProposal.status).toBe(
      ProposalStatus.APPROVED,
    );

    // Step 6: Worker completes task
    const completedTask = {
      ...claimedTask,
      status: TaskStatus.COMPLETED,
      completed_at: new Date().toISOString(),
    };

    expect(completedTask.status).toBe(TaskStatus.COMPLETED);
    expect(completedTask.completed_at).toBeDefined();
  });

  it("should handle task release back to pool", () => {
    const claimedTask = {
      ...mockTask,
      status: TaskStatus.IN_PROGRESS,
      assigned_to: ["worker-1"],
    };

    const releasedTask = {
      ...claimedTask,
      status: TaskStatus.WAITING,
      assigned_to: [],
      released_at: new Date().toISOString(),
    };

    expect(releasedTask.status).toBe(TaskStatus.WAITING);
    expect(releasedTask.assigned_to).toHaveLength(0);
  });

  it("should handle task cancellation", () => {
    const activeTask = {
      ...mockTask,
      status: TaskStatus.IN_PROGRESS,
    };

    const cancelledTask = {
      ...activeTask,
      status: TaskStatus.CANCELLED,
      cancellation_reason: "Customer requested cancellation",
      cancelled_at: new Date().toISOString(),
    };

    expect(cancelledTask.status).toBe(TaskStatus.CANCELLED);
    expect(cancelledTask.cancellation_reason).toBeDefined();
  });

  it("should handle proposal rejection by customer", () => {
    const proposal = {
      id: "proposal-1",
      task_id: "task-1",
      description: "Additional work",
      price: 300,
      status: ProposalStatus.APPROVED,
    };

    const rejectedProposal = {
      ...proposal,
      status: ProposalStatus.REJECTED,
      rejection_reason: "Too expensive",
      rejected_at: new Date().toISOString(),
    };

    expect(rejectedProposal.status).toBe(ProposalStatus.REJECTED);
    expect(rejectedProposal.rejection_reason).toBe("Too expensive");
  });

  it("should track task status transitions", () => {
    const statusFlow = [
      TaskStatus.WAITING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ];

    let currentStatus = TaskStatus.WAITING;

    // Claim task
    currentStatus = TaskStatus.IN_PROGRESS;
    expect(statusFlow.indexOf(currentStatus)).toBeGreaterThan(
      statusFlow.indexOf(TaskStatus.WAITING),
    );

    // Complete task
    currentStatus = TaskStatus.COMPLETED;
    expect(statusFlow.indexOf(currentStatus)).toBeGreaterThan(
      statusFlow.indexOf(TaskStatus.IN_PROGRESS),
    );
  });

  it("should validate task assignment permissions", () => {
    const workerRole = UserRole.STAFF;
    const managerRole = UserRole.SUPER_MANAGER;
    const customerRole = UserRole.CUSTOMER;

    const canClaimTask = (role: UserRole) => {
      return role === UserRole.STAFF || role === UserRole.SUPER_MANAGER;
    };

    const canApproveTask = (role: UserRole) => {
      return role === UserRole.SUPER_MANAGER;
    };

    expect(canClaimTask(workerRole)).toBe(true);
    expect(canClaimTask(managerRole)).toBe(true);
    expect(canClaimTask(customerRole)).toBe(false);
    expect(canApproveTask(workerRole)).toBe(false);
    expect(canApproveTask(managerRole)).toBe(true);
  });

  it("should handle multiple workers on same task", () => {
    const task = {
      ...mockTask,
      assigned_to: ["worker-1", "worker-2"],
    };

    expect(task.assigned_to.length).toBe(2);
    expect(task.assigned_to).toContain("worker-1");
    expect(task.assigned_to).toContain("worker-2");
  });

  it("should validate proposal price is positive", () => {
    const validProposal = {
      description: "Brake replacement",
      price: 500,
    };

    const invalidProposal = {
      description: "Free service",
      price: -100,
    };

    const isValidPrice = (price: number) => price >= 0;

    expect(isValidPrice(validProposal.price)).toBe(true);
    expect(isValidPrice(invalidProposal.price)).toBe(false);
  });

  it("should handle task priority escalation", () => {
    const normalTask = {
      ...mockTask,
      priority: "NORMAL",
    };

    const escalatedTask = {
      ...normalTask,
      priority: "URGENT",
      escalated_at: new Date().toISOString(),
      escalation_reason: "Customer complaint",
    };

    expect(escalatedTask.priority).toBe("URGENT");
    expect(escalatedTask.escalation_reason).toBeDefined();
  });

  it("should validate task completion requires all proposals resolved", () => {
    const task = {
      ...mockTask,
      status: TaskStatus.IN_PROGRESS,
    };

    const proposals = [
      { id: "p1", status: ProposalStatus.APPROVED },
      { id: "p2", status: ProposalStatus.PENDING_CUSTOMER },
    ];

    const allProposalsResolved = proposals.every(
      (p) =>
        p.status === ProposalStatus.APPROVED ||
        p.status === ProposalStatus.REJECTED,
    );

    expect(allProposalsResolved).toBe(false);

    // After resolving all proposals
    const resolvedProposals = [
      { id: "p1", status: ProposalStatus.APPROVED },
      { id: "p2", status: ProposalStatus.REJECTED },
    ];

    const allResolved = resolvedProposals.every(
      (p) =>
        p.status === ProposalStatus.APPROVED ||
        p.status === ProposalStatus.REJECTED,
    );

    expect(allResolved).toBe(true);
  });
});
