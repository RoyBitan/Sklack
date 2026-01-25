export enum UserRole {
  SUPER_MANAGER = 'SUPER_MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export enum MembershipStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum Language {
  HEBREW = 'he',
  ENGLISH = 'en',
  ARABIC = 'ar',
  RUSSIAN = 'ru',
  CHINESE = 'zh',
  THAI = 'th',
  HINDI = 'hi'
}

export enum TaskStatus {
  WAITING = 'WAITING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CUSTOMER_APPROVAL = 'CUSTOMER_APPROVAL',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  WAITING_FOR_APPROVAL = 'WAITING_FOR_APPROVAL',
  SCHEDULED = 'SCHEDULED'
}

export enum Priority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL'
}

export enum ProposalStatus {
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  garage_code: string;
  created_at: string;
  subscription_tier?: string;
  subscription_status?: string;
  settings?: Record<string, any>;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string;
  phone: string | null;
  secondary_phone?: string | null;
  address?: string | null;
  national_id?: string | null;
  role: UserRole;
  membership_status: MembershipStatus;
  notification_settings?: {
    vibrate: boolean;
    sound: string;
    events: string[];
  };
  avatar_url?: string;
  created_at: string;
  organization?: Organization;
  documents?: Record<string, string>;
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
  metadata: Record<string, any>;
  scheduled_reminder_at?: string | null;
  reminder_sent?: boolean;

  // Virtual joins for UI convenience
  vehicle?: Vehicle;
  creator?: Profile;
  proposals?: TaskProposal[];
}

export interface TaskProposal {
  id: string;
  task_id: string;
  org_id: string;
  created_by: string;
  description: string;
  price: number | null;
  status: ProposalStatus;
  photo_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  org_id: string;
  customer_id: string | null;
  service_type: string;
  description: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, any>;
  created_at: string;
}

export type AppView = 'DASHBOARD' | 'TASKS' | 'VEHICLES' | 'ORGANIZATION' | 'NOTIFICATIONS' | 'APPOINTMENTS' | 'SETTINGS' | 'TASK_DETAIL' | 'REQUEST_DETAIL' | 'GARAGE';

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
  metadata?: Record<string, any>;
  created_at: string;
}

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
  serviceTypes?: string[]; // e.g. ['Annual Service', 'Test']
  faultDescription: string;
  paymentMethod?: 'CREDIT_CARD' | 'CASH' | 'OTHER';

  // Appointment Request
  appointmentDate?: string;
  appointmentTime?: string;

  submittedAt?: number;
  hasInsurance?: boolean;
}