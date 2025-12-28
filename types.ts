export type Role = 'admin' | 'staff' | 'client';

export type JobStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  garageId?: string; // The garage they are associated with
}

export interface Garage {
  id: string; // The unique code used to join
  name: string;
  ownerId: string;
}

export interface Vehicle {
  plate: string;
  model: string;
  ownerId: string;
  garageId: string;
}

export interface Job {
  id: string;
  garageId: string;
  vehiclePlate: string;
  description: string;
  status: JobStatus;
  createdAt: number;
  assignedTo?: string; // Staff ID
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}