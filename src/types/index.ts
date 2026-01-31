// ============================================================================
// Enums
// ============================================================================

export enum UserRole {
  SUPER_MANAGER = "SUPER_MANAGER",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
}

export enum MembershipStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum Language {
  HEBREW = "he",
  ENGLISH = "en",
  ARABIC = "ar",
  RUSSIAN = "ru",
  CHINESE = "zh",
  THAI = "th",
  HINDI = "hi",
}

export enum TaskStatus {
  WAITING = "WAITING",
  APPROVED = "APPROVED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CUSTOMER_APPROVAL = "CUSTOMER_APPROVAL",
  CANCELLED = "CANCELLED",
  PAUSED = "PAUSED",
  WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL",
  SCHEDULED = "SCHEDULED",
}

export enum Priority {
  NORMAL = "NORMAL",
  URGENT = "URGENT",
  CRITICAL = "CRITICAL",
}

export enum ProposalStatus {
  PENDING_MANAGER = "PENDING_MANAGER",
  PENDING_ADMIN = "PENDING_ADMIN",
  PENDING_CUSTOMER = "PENDING_CUSTOMER",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum AppointmentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  SCHEDULED = "SCHEDULED",
}

export enum SubscriptionTier {
  FREE = "FREE",
  BASIC = "BASIC",
  PREMIUM = "PREMIUM",
}

export enum SubscriptionStatus {
  TRIALING = "TRIALING",
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  CANCELED = "CANCELED",
}

// ============================================================================
// Settings Types (for Organization and User settings)
// ============================================================================

export interface NotificationSettings {
  vibrate: boolean;
  sound: string;
  events: string[];
  email_notifications?: boolean;
  sms_notifications?: boolean;
  push_notifications?: boolean;
}

export interface OrganizationSettings {
  workingHours?: {
    start: string;
    end: string;
    days: number[];
  };
  defaultTaskDuration?: number;
  autoAssign?: boolean;
  requireApproval?: boolean;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}

export interface UserSettings {
  language?: Language;
  theme?: "light" | "dark" | "system";
  notifications?: NotificationSettings;
  dashboardLayout?: string;
}

// ============================================================================
// Metadata Types - Strongly typed instead of Record<string, any>
// ============================================================================

/**
 * Payment methods available in the system
 */
export type PaymentMethod = "CREDIT_CARD" | "CASH" | "BANK_TRANSFER" | "OTHER";

/**
 * Task metadata types based on task type
 */
export type TaskMetadataType =
  | "CHECK_IN"
  | "APPOINTMENT_REQUEST"
  | "MANUAL"
  | "RECURRING";

/**
 * Hand-over notes when staff releases a task
 */
export interface HandOverNotes {
  completed: string;
  remaining: string;
  by: string;
  at: string;
}

/**
 * Complete Task Metadata interface - replaces Record<string, any>
 */
export interface TaskMetadata {
  // Task type identifier
  type?: TaskMetadataType;

  // Source tracking
  source_appointment_id?: string;

  // Appointment/scheduling info
  appointmentDate?: string;
  appointmentTime?: string;

  // Owner/customer info (when vehicle owner is not linked)
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerAddress?: string;

  // Vehicle info (when vehicle is not linked)
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  fuelType?: string;
  vin?: string;
  engineModel?: string;
  immobilizerCode?: string;

  // Service details
  currentMileage?: string;
  mileage?: string; // Legacy field
  serviceTypes?: string[];
  serviceType?: string; // Legacy single type
  faultDescription?: string;
  description?: string; // Legacy alias
  paymentMethod?: PaymentMethod;

  // Work tracking
  estimatedDuration?: number;
  partsRequired?: string[];
  notes?: string;
  handOverNotes?: HandOverNotes;

  // Timestamps
  submittedAt?: number;

  // Flags
  hasInsurance?: boolean;
}

/**
 * Appointment Metadata interface
 */
export interface AppointmentMetadata {
  // Pre-check-in data
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerAddress?: string;

  // Vehicle info
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  fuelType?: string;
  vin?: string;
  engineModel?: string;
  immobilizerCode?: string;

  // Service details
  currentMileage?: string;
  mileage?: string;
  serviceTypes?: string[];
  serviceType?: string;
  faultDescription?: string;
  paymentMethod?: PaymentMethod;

  // Appointment specifics
  appointmentDate?: string;
  appointmentTime?: string;
  submittedAt?: number;
  hasInsurance?: boolean;
}

/**
 * Notification Metadata interface
 */
export interface NotificationMetadata {
  taskId?: string;
  appointmentId?: string;
  proposalId?: string;
  vehicleId?: string;
  actionUrl?: string;
  priority?: Priority;
}

/**
 * Audit Log Payload - typed for common audit actions
 */
export interface AuditLogPayload {
  action_details?: string;
  old_value?: unknown;
  new_value?: unknown;
  affected_entity_id?: string;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// Main Entity Interfaces
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  garage_code: string;
  created_at: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at?: string;
  settings?: OrganizationSettings;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string;
  phone: string | null;
  secondary_phone?: string | null;
  address?: string | null;
  role: UserRole;
  membership_status: MembershipStatus;
  notification_settings?: NotificationSettings;
  avatar_url?: string;
  created_at: string;
  organization?: Organization;
  documents?: Record<string, string>;
  settings?: UserSettings;
}

export interface Vehicle {
  id: string;
  org_id: string;
  owner_id: string | null;
  owner_name?: string | null;
  plate: string;
  model: string;
  year: string | null;
  color: string | null;
  vin?: string | null;
  fuel_type?: string | null;
  engine_model?: string | null;
  registration_valid_until?: string | null;
  kodanit?: string | null;
  created_at: string;
  owner?: Profile;
}

export interface Task {
  id: string;
  org_id: string;
  vehicle_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigned_to: string[];
  price: number | null;
  allotted_time: number | null;
  started_at: string | null;
  completed_at: string | null;
  vehicle_year: string | null;
  customer_id?: string | null;
  immobilizer_code: string | null;
  created_at: string;
  updated_at?: string;
  metadata: TaskMetadata;
  scheduled_reminder_at?: string | null;
  reminder_sent?: boolean;

  // Virtual joins for UI convenience
  vehicle?: Vehicle;
  creator?: Profile;
  proposals?: TaskProposal[];
  organization?: Organization;
}

export interface TaskProposal {
  id: string;
  task_id: string;
  org_id: string;
  customer_id: string | null;
  created_by: string;
  description: string;
  price: number | null;
  status: ProposalStatus;
  photo_url: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Proposal data with joined entities (tasks, vehicles, profiles)
 * Used in AdminProposalInbox and other administrative views
 */
export interface ProposalData extends TaskProposal {
  task?: {
    id: string;
    title: string;
    vehicle_id: string | null;
    customer_id: string | null;
    customer?: {
      id: string;
      full_name: string;
      phone: string | null;
    };
  };
  creator?: {
    id: string;
    full_name: string;
  };
  vehicle?: {
    vehicle?: {
      plate: string;
      model: string;
    };
  };
  customer?: {
    id: string;
    full_name: string;
    phone: string | null;
  };
}

export interface TaskMessage {
  id: string;
  task_id: string;
  org_id: string;
  sender_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Appointment {
  id: string;
  org_id: string;
  customer_id: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  vehicle_id?: string | null;
  vehicle_plate?: string;
  service_type: string;
  description: string | null;
  appointment_date: string;
  appointment_time: string;
  duration?: string;
  mileage?: number;
  status: AppointmentStatus;
  task_id?: string | null;
  requested_at?: string;
  immobilizer_code?: string | null;
  metadata?: AppointmentMetadata;
  created_at: string;

  // Virtual joins
  customer?: Profile;
  vehicle?: Vehicle;
  task?: Task;
}

export interface AuditLog {
  id: string;
  org_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: AuditLogPayload;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  task_id?: string;
  url?: string;
  type: string;
  actor_id?: string;
  metadata?: NotificationMetadata;
  created_at: string;
}

export interface Invitation {
  id: string;
  org_id: string;
  phone: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  invited_by: string;
  created_at: string;
  organization?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// Pre-Check-In Data (existing interface, now uses shared types)
// ============================================================================

export interface PreCheckInData {
  vehiclePlate: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;

  // Owner Details
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerAddress?: string;

  // Check-In Details
  currentMileage?: string;
  serviceTypes?: string[];
  faultDescription: string;
  paymentMethod?: PaymentMethod;

  // Appointment Request
  appointmentDate?: string;
  appointmentTime?: string;

  submittedAt?: number;
  hasInsurance?: boolean;
}

// ============================================================================
// App View Types
// ============================================================================

export type AppView =
  | "DASHBOARD"
  | "TASKS"
  | "VEHICLES"
  | "ORGANIZATION"
  | "NOTIFICATIONS"
  | "APPOINTMENTS"
  | "SETTINGS"
  | "TASK_DETAIL"
  | "REQUEST_DETAIL"
  | "GARAGE";

// ============================================================================
// Type Guards - For runtime type checking
// ============================================================================

/**
 * Type guard to check if a value is a valid TaskMetadata
 */
export function isTaskMetadata(value: unknown): value is TaskMetadata {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard to check if a task has appointment metadata
 */
export function hasAppointmentData(task: Task): boolean {
  return !!(task.metadata?.appointmentDate ||
    task.metadata?.type === "APPOINTMENT_REQUEST");
}

/**
 * Type guard to check if a task has check-in metadata
 */
export function hasCheckInData(task: Task): boolean {
  return task.metadata?.type === "CHECK_IN";
}

/**
 * Type guard to check if a task has hand-over notes
 */
export function hasHandOverNotes(
  task: Task,
): task is Task & { metadata: { handOverNotes: HandOverNotes } } {
  return !!(task.metadata?.handOverNotes);
}

/**
 * Safely get owner name from task (from vehicle or metadata)
 */
export function getTaskOwnerName(task: Task): string {
  return task.vehicle?.owner?.full_name || task.metadata?.ownerName ||
    "לקוח מזדמן";
}

/**
 * Safely get owner phone from task (from vehicle or metadata)
 */
export function getTaskOwnerPhone(task: Task): string | null {
  return task.vehicle?.owner?.phone || task.metadata?.ownerPhone || null;
}

/**
 * Safely get fault description from task metadata
 */
export function getTaskFaultDescription(task: Task): string | null {
  return task.metadata?.faultDescription || task.metadata?.description ||
    task.description;
}

/**
 * Safely get appointment date from task metadata
 */
export function getTaskAppointmentDate(task: Task): string | null {
  return task.metadata?.appointmentDate || null;
}

/**
 * Safely get appointment time from task metadata
 */
export function getTaskAppointmentTime(task: Task): string | null {
  return task.metadata?.appointmentTime || null;
}

/**
 * Safely get mileage from task metadata
 */
export function getTaskMileage(task: Task): string | null {
  return task.metadata?.currentMileage || task.metadata?.mileage || null;
}

/**
 * Safely get service types from task metadata
 */
export function getTaskServiceTypes(task: Task): string[] {
  const types = task.metadata?.serviceTypes;
  if (Array.isArray(types)) return types;
  if (task.metadata?.serviceType) return [task.metadata.serviceType];
  return [];
}

/**
 * Safely get payment method label
 */
export function getPaymentMethodLabel(method?: PaymentMethod): string {
  switch (method) {
    case "CREDIT_CARD":
      return "אשראי";
    case "CASH":
      return "מזומן";
    case "BANK_TRANSFER":
      return "העברה בנקאית";
    case "OTHER":
      return "אחר";
    default:
      return "לא צוין";
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties of T required and non-nullable
 */
export type RequiredNonNull<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Pick only the required properties of T
 */
export type PickRequired<T, K extends keyof T> =
  & Required<Pick<T, K>>
  & Omit<T, K>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
