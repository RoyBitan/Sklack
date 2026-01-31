/**
 * Proposals Service
 * Centralizes all proposal/upsell-related database operations
 */

import { supabase } from "@/services/api/client";
import { ProposalStatus, TaskProposal } from "@/types";
import { ProposalCreationError } from "@/shared/utils/errors";

// DTOs
export interface CreateProposalDTO {
  task_id: string;
  org_id: string;
  created_by: string;
  description: string;
  price?: number | null;
  photo_url?: string | null;
  audio_url?: string | null;
  status?: ProposalStatus;
}

export interface UpdateProposalDTO {
  description?: string;
  price?: number | null;
  status?: ProposalStatus;
  photo_url?: string | null;
  audio_url?: string | null;
}

class ProposalsService {
  private readonly selectQuery =
    `*, task:tasks(*, vehicle:vehicles(*)), creator:profiles(*)`;

  /**
   * Fetch proposals for a task
   */
  async fetchProposalsByTask(taskId: string): Promise<TaskProposal[]> {
    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ProposalsService] fetchProposalsByTask error:", error);
      throw error;
    }

    return (data || []) as TaskProposal[];
  }

  /**
   * Fetch all pending proposals for an organization (for admin inbox)
   */
  async fetchPendingProposals(orgId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("proposals")
      .select(this.selectQuery)
      .eq("org_id", orgId)
      .in("status", [
        ProposalStatus.PENDING_MANAGER,
        ProposalStatus.PENDING_ADMIN,
      ])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ProposalsService] fetchPendingProposals error:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create a new proposal
   */
  async createProposal(dto: CreateProposalDTO): Promise<TaskProposal> {
    const { data, error } = await supabase
      .from("proposals")
      .insert({
        ...dto,
        status: dto.status || ProposalStatus.PENDING_MANAGER,
      })
      .select()
      .single();

    if (error || !data) {
      throw new ProposalCreationError(error);
    }

    return data as TaskProposal;
  }

  /**
   * Update a proposal
   */
  async updateProposal(
    proposalId: string,
    updates: UpdateProposalDTO,
  ): Promise<TaskProposal> {
    const { data, error } = await supabase
      .from("proposals")
      .update(updates)
      .eq("id", proposalId)
      .select()
      .single();

    if (error || !data) {
      throw error;
    }

    return data as TaskProposal;
  }

  /**
   * Approve a proposal (by manager)
   */
  async approveProposal(
    proposalId: string,
    price?: number,
  ): Promise<TaskProposal> {
    const updates: UpdateProposalDTO = {
      status: ProposalStatus.PENDING_CUSTOMER,
    };

    if (price !== undefined) {
      updates.price = price;
    }

    return this.updateProposal(proposalId, updates);
  }

  /**
   * Reject a proposal
   */
  async rejectProposal(proposalId: string): Promise<TaskProposal> {
    return this.updateProposal(proposalId, {
      status: ProposalStatus.REJECTED,
    });
  }

  /**
   * Customer approves a proposal
   */
  async customerApproveProposal(proposalId: string): Promise<TaskProposal> {
    return this.updateProposal(proposalId, {
      status: ProposalStatus.APPROVED,
    });
  }
}

// Export singleton instance
export const proposalsService = new ProposalsService();
