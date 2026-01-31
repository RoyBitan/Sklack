import { Priority, Profile, Task, TaskStatus, Vehicle } from "@/types";

export const mockProfile: Profile = {
  id: "user-123",
  full_name: "John Doe",
  email: "john@example.com",
  role: "SUPER_MANAGER",
  org_id: "org-123",
  phone: "0501234567",
  created_at: new Date().toISOString(),
};

export const mockVehicle: Vehicle = {
  id: "veh-123",
  org_id: "org-123",
  plate: "1234567",
  model: "Toyota Corolla",
  year: "2020",
  created_at: new Date().toISOString(),
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
  metadata: {
    ownerName: "John Doe",
    ownerPhone: "0501234567",
    type: "MANUAL_ENTRY",
  },
};
