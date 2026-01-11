export enum UserRole {
  SUPER_MANAGER = 'SUPER_MANAGER',
  DEPUTY_MANAGER = 'DEPUTY_MANAGER',
  TEAM = 'TEAM',
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
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CUSTOMER_APPROVAL = 'CUSTOMER_APPROVAL'
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
}

export interface Vehicle {
  id: string;
  org_id: string;
  customer_id: string | null;
  plate: string;
  model: string;
  year: string | null;
  color: string | null;
  created_at: string;
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
  immobilizer_code: string | null;
  created_at: string;
  metadata: Record<string, any>;

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

export type AppView = 'DASHBOARD' | 'TASKS' | 'VEHICLES' | 'ORGANIZATION' | 'NOTIFICATIONS' | 'APPOINTMENTS' | 'SETTINGS';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  task_id?: string;
  url?: string;
  type: string;
  created_at: string;
}

export interface PreCheckInData {
  vehiclePlate: string;
  faultDescription: string;
}