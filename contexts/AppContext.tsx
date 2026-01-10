import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, AppView, Task, Appointment, Notification as AppNotification, PreCheckInData, UserRole, TaskStatus, Vehicle } from '../types';
import { TRANSLATIONS } from '../constants';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface AppContextType {
  language: Language;
  activeView: AppView;
  navigateTo: (view: AppView) => void;
  switchLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;

  // Real-time Data
  tasks: Task[];
  appointments: Appointment[];
  notifications: AppNotification[];
  loading: boolean;
  user: any;

  // Data actions
  refreshData: () => Promise<void>;

  addVehicle: (vehicle: Partial<Vehicle>) => Promise<void>;
  removeVehicle: (plate: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateUser: (userId: string, data: any) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addProposal: (taskId: string, proposal: any) => Promise<void>;
  updateProposal: (taskId: string, proposalId: string, data: any) => Promise<void>;
  submitCheckIn: (data: PreCheckInData) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user: authUser } = useAuth();
  const [language, setLanguage] = useState<Language>(Language.HEBREW);
  const [activeView, setActiveView] = useState<AppView>('DASHBOARD');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const extendedUser = profile ? {
    ...profile,
    name: profile.full_name,
    vehicles: vehicles
  } : null;

  const isRTL = [Language.HEBREW].includes(language);
  const t = useCallback((key: string) => TRANSLATIONS[language]?.[key] || key, [language]);

  const refreshData = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // 1. Fetch User Vehicles (if customer)
      if (profile.role === UserRole.CUSTOMER) {
        const { data: vParams } = await supabase.from('vehicles').select('*').eq('owner_id', profile.id);
        if (vParams) setVehicles(vParams as Vehicle[]);
      }

      // 2. Fetch Tasks & Appointments
      // We rely on RLS policies to filter visibility safely
      let taskQuery = supabase.from('tasks').select('*, vehicle:vehicles(*, owner:profiles(full_name))').order('created_at', { ascending: false });
      let apptQuery = supabase.from('appointments').select('*').order('appointment_date', { ascending: false });

      if (profile.org_id && profile.role !== UserRole.CUSTOMER) {
        // For staff, explicit filter helps performance
        taskQuery = taskQuery.eq('org_id', profile.org_id);
        apptQuery = apptQuery.eq('org_id', profile.org_id);
      }
      // Customers rely on RLS logic: (customer_id = me OR vehicle_id IN my_vehicles)

      const [tasksRes, appsRes] = await Promise.all([
        taskQuery.limit(100),
        apptQuery.limit(100)
      ]);

      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
      if (appsRes.data) setAppointments(appsRes.data as Appointment[]);

    } catch (err) {
      console.error('Data refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      refreshData();

      const taskSubscription = supabase
        .channel('tasks-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          refreshData();
        })
        .subscribe();

      const vehicleSubscription = supabase
        .channel('vehicles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
          refreshData();
        })
        .subscribe();

      const apptSubscription = supabase
        .channel('appointments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
          refreshData();
        })
        .subscribe();

      const notifySubscription = supabase
        .channel('notifications-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          refreshData();
        })
        .subscribe();

      const registerPush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const publicKey = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;
        if (!publicKey) return;

        try {
          // Wait for service worker to be ready
          const registration = await navigator.serviceWorker.ready;

          // Request permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;

          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
          }

          if (subscription) {
            const subJson = subscription.toJSON();
            // Store directly in profiles table
            await supabase
              .from('profiles')
              .update({ push_subscription: subJson })
              .eq('id', profile.id);
            console.log('Push subscription saved to profile');
          }
        } catch (e) {
          console.error('Push registration failed', e);
        }
      };

      registerPush();

      return () => {
        supabase.removeChannel(taskSubscription);
        supabase.removeChannel(vehicleSubscription);
      };
    }
  }, [profile, refreshData]);

  // Helper for VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  const navigateTo = (view: AppView) => setActiveView(view);
  const switchLanguage = (lang: Language) => setLanguage(lang);

  // --- IMPLEMENTED METHODS ---

  const addVehicle = async (vehicleData: Partial<Vehicle>) => {
    if (!profile) return;
    try {
      // 1. Check if vehicle already exists in this org (e.g. created by Admin)
      let existingId = null;
      // We search specifically in the user's org if they have one, or generally if we want global uniqueness?
      // Since app is multi-tenant, uniqueness is usually per-org or the plate is global. 
      // Assuming License Plate is unique PER ORG for safety, or global.
      // Let's assume per-org for now to be safe with the 'vehicles_plate_org_id_key' constraint.

      if (profile.org_id && vehicleData.plate) {
        const { data: existing } = await supabase
          .from('vehicles')
          .select('id')
          .eq('plate', vehicleData.plate)
          .eq('org_id', profile.org_id)
          .maybeSingle();

        if (existing) existingId = existing.id;
      }

      if (existingId) {
        // 2. Claim the existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update({
            owner_id: profile.id,
            model: vehicleData.model || undefined,
            year: vehicleData.year || undefined,
            color: vehicleData.color || undefined
          })
          .eq('id', existingId);

        if (error) throw error;
      } else {
        // 3. Create new vehicle
        const { error } = await supabase.from('vehicles').insert({
          owner_id: profile.id,
          org_id: profile.org_id,
          plate: vehicleData.plate,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color
        });
        if (error) throw error;
      }

      await refreshData();
    } catch (e) {
      console.error('Add vehicle failed', e);
      alert('Failed to add vehicle');
    }
  };

  const removeVehicle = async (plate: string) => {
    try {
      const { error } = await supabase.from('vehicles').update({ owner_id: null }).eq('plate', plate).eq('owner_id', profile?.id);
      if (error) throw error;
      await refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      await refreshData();
    } catch (err) {
      console.error('Delete task failed:', err);
      throw err;
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const updateData: any = { status };

      // If employee starts task, assign to them
      if (status === TaskStatus.IN_PROGRESS && profile?.role === UserRole.EMPLOYEE) {
        // Fetch current assignment to properly append
        const { data: currentTask } = await supabase.from('tasks').select('assigned_to').eq('id', taskId).single();
        const currentAssigned = currentTask?.assigned_to || [];

        if (!currentAssigned.includes(profile.id)) {
          updateData.assigned_to = [...currentAssigned, profile.id];
        }
      }

      // Allow workers to "Return" a task (reset status to WAITING and unassign themselves)
      if (status === TaskStatus.WAITING && profile?.role === UserRole.EMPLOYEE) {
        const { data: currentTask } = await supabase.from('tasks').select('assigned_to').eq('id', taskId).single();
        const currentAssigned = currentTask?.assigned_to || [];
        updateData.assigned_to = currentAssigned.filter((id: string) => id !== profile.id);
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) throw error;
      await refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const updateUser = async (userId: string, data: any) => {
    try {
      const { error } = await supabase.from('profiles').update(data).eq('id', userId);
      if (error) throw error;

      // Update local user state if needed, or rely on AuthContext refresh?
      // Ideally trigger a refresh
      // await refreshData(); // refreshData updates tasks/vehicles, not profile directly usually
      // But we can trigger a profile refresh if we had access to it from AuthContext.
      // For now, we will assume the caller handles UI feedback or we add a callback.
    } catch (e) {
      console.error('Update user failed', e);
      throw e;
    }
  };

  const addProposal = async (taskId: string, proposal: any) => {
    console.log('Add proposal', taskId, proposal);
  };

  const updateProposal = async (taskId: string, proposalId: string, data: any) => {
    console.log('Update proposal', taskId, proposalId, data);
  };

  const submitCheckIn = async (data: PreCheckInData) => {
    if (!profile?.org_id) return;
    try {
      const { data: v } = await supabase
        .from('vehicles')
        .select('id')
        .eq('plate', data.vehiclePlate)
        .eq('org_id', profile.org_id)
        .single();
      if (!v) throw new Error('Vehicle not found for check-in');

      const { error } = await supabase.from('tasks').insert({
        org_id: profile.org_id,
        title: `Check-In: ${data.faultDescription}`,
        vehicle_id: v.id,
        customer_id: profile.id,
        created_by: profile.id,
        status: TaskStatus.WAITING,
        description: data.faultDescription,
        priority: 'NORMAL'
      });
      if (error) throw error;
      await refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider value={{
      language, activeView, navigateTo, switchLanguage, t, isRTL,
      tasks, appointments, notifications, loading, refreshData,
      user: extendedUser,
      addVehicle, removeVehicle, updateTaskStatus, updateUser, deleteTask, addProposal, updateProposal, submitCheckIn
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
