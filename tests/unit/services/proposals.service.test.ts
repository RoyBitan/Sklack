import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { ProposalsService } from "@/src/features/proposals/services/proposals.service";
import { supabase } from "@/lib/supabase";
import { ProposalStatus } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("ProposalsService", () => {
  let service: ProposalsService;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProposalsService();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);
  });

  describe("fetchProposalsByTask", () => {
    it("should fetch by task ID", async () => {
      await service.fetchProposalsByTask("t1");
      expect(mockChain.eq).toHaveBeenCalledWith("task_id", "t1");
    });

    it("should throw on failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(service.fetchProposalsByTask("t1")).rejects.toThrow();
    });
  });

  describe("fetchPendingProposals", () => {
    it("should fetch by org ID and status", async () => {
      await service.fetchPendingProposals("org-1");
      expect(mockChain.eq).toHaveBeenCalledWith("org_id", "org-1");
      expect(mockChain.in).toHaveBeenCalledWith("status", [
        ProposalStatus.PENDING_MANAGER,
        ProposalStatus.PENDING_ADMIN,
      ]);
    });

    it("should throw on failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(service.fetchPendingProposals("org-1")).rejects.toThrow();
    });
  });

  describe("createProposal", () => {
    it("should insert proposal", async () => {
      const dto = {
        task_id: "t1",
        org_id: "org-1",
        created_by: "u1",
        description: "Desc",
      };
      mockChain.single.mockResolvedValueOnce({
        data: { id: "p1", ...dto },
        error: null,
      });
      const result = await service.createProposal(dto);
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        description: "Desc",
        status: ProposalStatus.PENDING_MANAGER,
      }));
      expect(result.id).toBe("p1");
    });

    it("should throw on failure", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.createProposal({} as any)).rejects.toThrow();
    });
  });

  describe("updateProposal", () => {
    it("should update proposal", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "p1" },
        error: null,
      });
      await service.updateProposal("p1", { description: "New" });
      expect(mockChain.update).toHaveBeenCalledWith({ description: "New" });
    });

    it("should throw if not found/error", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.updateProposal("p1", {})).rejects.toThrow();
    });
  });

  describe("Workflow methods", () => {
    it("approveProposal should update status and price", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.approveProposal("p1", 500);
      expect(mockChain.update).toHaveBeenCalledWith({
        status: ProposalStatus.PENDING_CUSTOMER,
        price: 500,
      });
    });

    it("rejectProposal should update status", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.rejectProposal("p1");
      expect(mockChain.update).toHaveBeenCalledWith({
        status: ProposalStatus.REJECTED,
      });
    });

    it("customerApproveProposal should update status", async () => {
      mockChain.single.mockResolvedValue({ data: {}, error: null });
      await service.customerApproveProposal("p1");
      expect(mockChain.update).toHaveBeenCalledWith({
        status: ProposalStatus.APPROVED,
      });
    });
  });
});
