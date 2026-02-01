import {
  MembershipStatus,
  Priority,
  Profile,
  Task,
  TaskStatus,
  UserRole,
  Vehicle,
} from "@/types";

export const mockProfile: Profile = {
  id: "user-123",
  full_name: "John Doe",
  role: UserRole.SUPER_MANAGER,
  org_id: "org-123",
  phone: "0501234567",
  membership_status: MembershipStatus.APPROVED,
  created_at: new Date().toISOString(),
};

export const mockVehicle: Vehicle = {
  id: "veh-123",
  org_id: "org-123",
  plate: "1234567",
  model: "Toyota Corolla",
  year: "2020",
  created_at: new Date().toISOString(),
  owner_id: "user-123",
  color: "White",
};

export const mockTask: Task = {
  id: "task-123",
  org_id: "org-123",
  created_by: "user-123",
  title: "Oil Change",
  description: "Regular maintenance",
  status: TaskStatus.WAITING,
  priority: Priority.NORMAL,
  created_at: new Date().toISOString(),
  vehicle_id: "veh-123",
  assigned_to: [],
  price: 150,
  allotted_time: 45,
  started_at: null,
  completed_at: null,
  vehicle_year: "2020",
  immobilizer_code: null,
  metadata: {
    type: "MANUAL",
    ownerName: "John Doe",
    ownerPhone: "0501234567",
  },
};
