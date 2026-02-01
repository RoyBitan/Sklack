import React, { createContext, useContext } from "react";
import { toast } from "sonner";
import { useAuth } from "@/src/features/auth";
import { useNotifications } from "@/src/features/notifications";
import {
  CreateProposalDTO,
  proposalsService,
  UpdateProposalDTO,
} from "../services/proposals.service";
import { ProposalStatus } from "@/types";

/** Typed input for creating a proposal */
interface ProposalInput {
  description: string;
  price?: number | null;
  photo_url?: string | null;
  audio_url?: string | null;
}

interface ProposalsContextType {
  addProposal: (taskId: string, proposal: ProposalInput) => Promise<void>;
  updateProposal: (
    taskId: string,
    proposalId: string,
    data: UpdateProposalDTO,
  ) => Promise<void>;
  approveProposal: (proposalId: string, price?: number) => Promise<void>;
  rejectProposal: (proposalId: string) => Promise<void>;
}

const ProposalsContext = createContext<ProposalsContextType | undefined>(
  undefined,
);

export const ProposalsProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();
  const { sendSystemNotification } = useNotifications();

  const addProposal = async (taskId: string, proposal: ProposalInput) => {
    if (!profile?.org_id) return;

    try {
      const dto: CreateProposalDTO = {
        task_id: taskId,
        org_id: profile.org_id,
        created_by: profile.id,
        description: proposal.description,
        price: proposal.price,
        photo_url: proposal.photo_url,
        audio_url: proposal.audio_url,
        status: ProposalStatus.PENDING_MANAGER,
      };

      await proposalsService.createProposal(dto);
      toast.success("הצעה נשלחה");
    } catch (e) {
      const message = e instanceof Error ? e.message : "שגיאה בשליחת הצעה";
      console.error("addProposal error:", e);
      toast.error(message);
    }
  };

  const updateProposal = async (
    taskId: string,
    proposalId: string,
    data: UpdateProposalDTO,
  ) => {
    try {
      await proposalsService.updateProposal(proposalId, data);
      toast.success("עודכן בהצלחה");
    } catch (e) {
      console.error("updateProposal error:", e);
      toast.error("שגיאה בעדכון");
    }
  };

  const approveProposal = async (proposalId: string, price?: number) => {
    try {
      await proposalsService.approveProposal(proposalId, price);
      toast.success("הצעה אושרה ונשלחה ללקוח");
    } catch (e) {
      console.error("approveProposal error:", e);
      toast.error("שגיאה באישור הצעה");
    }
  };

  const rejectProposal = async (proposalId: string) => {
    try {
      await proposalsService.rejectProposal(proposalId);
      toast.success("הצעה נדחתה");
    } catch (e) {
      console.error("rejectProposal error:", e);
      toast.error("שגיאה בדחיית הצעה");
    }
  };

  return (
    <ProposalsContext.Provider
      value={{
        addProposal,
        updateProposal,
        approveProposal,
        rejectProposal,
      }}
    >
      {children}
    </ProposalsContext.Provider>
  );
};

export const useProposals = () => {
  const context = useContext(ProposalsContext);
  if (!context) throw new Error("useProposals error");
  return context;
};
