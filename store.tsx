import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Garage, Job, Vehicle, Role, JobStatus } from './types';

// Mock Initial Data
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'ישראל מנהל', phone: '0501111111', role: 'admin', garageId: 'G-101' },
  { id: 'u2', name: 'דני עובד', phone: '0502222222', role: 'staff', garageId: 'G-101' },
  { id: 'u3', name: 'רונית לקוחה', phone: '0503333333', role: 'client', garageId: 'G-101' },
];

const INITIAL_GARAGES: Garage[] = [
  { id: 'G-101', name: 'מוסך הצפון', ownerId: 'u1' }
];

const INITIAL_VEHICLES: Vehicle[] = [
  { plate: '12-345-67', model: 'Toyota Corolla', ownerId: 'u3', garageId: 'G-101' }
];

const INITIAL_JOBS: Job[] = [
  { id: 'j1', garageId: 'G-101', vehiclePlate: '12-345-67', description: 'טיפול 10,000', status: 'in_progress', createdAt: Date.now(), assignedTo: 'u2' },
  { id: 'j2', garageId: 'G-101', vehiclePlate: '88-888-88', description: 'החלפת בלמים', status: 'pending', createdAt: Date.now() - 100000 },
];

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  garages: Garage[];
  jobs: Job[];
  vehicles: Vehicle[];
  
  // Actions
  login: (phone: string, pass: string) => Promise<boolean>; // Pass ignored for demo
  register: (name: string, phone: string, pass: string, role: Role) => Promise<void>;
  logout: () => void;
  
  createGarage: (name: string, customId: string) => void;
  joinGarage: (garageId: string) => boolean;
  
  addJob: (plate: string, description: string) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  assignJob: (jobId: string) => void;
  
  addVehicle: (plate: string, model: string) => void;
  
  // Dev Helpers
  devSwitchUser: (userId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [garages, setGarages] = useState<Garage[]>(INITIAL_GARAGES);
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);

  const isAuthenticated = !!currentUser;

  const login = async (phone: string, pass: string) => {
    // Simulated delay
    await new Promise(r => setTimeout(r, 600));
    const user = users.find(u => u.phone === phone);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const register = async (name: string, phone: string, pass: string, role: Role) => {
    await new Promise(r => setTimeout(r, 600));
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      phone,
      role,
    };
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
  };

  const logout = () => setCurrentUser(null);

  const createGarage = (name: string, customId: string) => {
    if (!currentUser) return;
    const newGarage: Garage = {
      id: customId,
      name,
      ownerId: currentUser.id
    };
    setGarages([...garages, newGarage]);
    // Assign creator to garage
    const updatedUser = { ...currentUser, garageId: customId };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
  };

  const joinGarage = (garageId: string) => {
    const exists = garages.find(g => g.id === garageId);
    if (!exists || !currentUser) return false;
    
    const updatedUser = { ...currentUser, garageId };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    return true;
  };

  const addJob = (plate: string, description: string) => {
    if (!currentUser?.garageId) return;
    const newJob: Job = {
      id: `j${Date.now()}`,
      garageId: currentUser.garageId,
      vehiclePlate: plate,
      description,
      status: 'pending',
      createdAt: Date.now()
    };
    setJobs(prev => [newJob, ...prev]);
  };

  const updateJobStatus = (jobId: string, status: JobStatus) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j));
  };

  const assignJob = (jobId: string) => {
    if (!currentUser) return;
    setJobs(jobs.map(j => j.id === jobId ? { ...j, assignedTo: currentUser.id, status: 'in_progress' } : j));
  };

  const addVehicle = (plate: string, model: string) => {
    if (!currentUser?.garageId) return;
    const newVehicle: Vehicle = {
      plate,
      model,
      garageId: currentUser.garageId,
      ownerId: currentUser.id
    };
    setVehicles([...vehicles, newVehicle]);
  };

  const devSwitchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) setCurrentUser(user);
  };

  return (
    <AppContext.Provider value={{
      currentUser, isAuthenticated, users, garages, jobs, vehicles,
      login, register, logout, createGarage, joinGarage,
      addJob, updateJobStatus, assignJob, addVehicle, devSwitchUser
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useStore must be used within AppProvider');
  return context;
};