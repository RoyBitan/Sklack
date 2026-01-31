export type {
  ProposalData,
  Task,
  TaskMetadata,
  TaskMetadataType,
  TaskProposal,
} from "@/types";

export { Priority, ProposalStatus, TaskStatus } from "@/types";

/**
 * Task creation input data
 */
export interface CreateTaskFormData {
  title: string;
  description: string;
  customerName: string;
  phone: string;
  plate: string;
  model: string;
  year: string;
  color: string;
  immobilizer: string;
  isUrgent: boolean;
  vin: string;
  fuelType: string;
  engineModel: string;
  registrationValidUntil: string;
  assignedTo: string[];
  price: string;
  showPrice: boolean;
  dueIn: string;
  customMinutes: string;
  showAssignment: boolean;
}
