import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task, Appointment, Notification as AppNotification, Vehicle, UserRole, TaskStatus, PreCheckInData } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface DataContextType {
    tasks: Task[];
    appointments: Appointment[];
    vehicles: Vehicle[];
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    refreshData: () => Promise<void>;
    addVehicle: (vehicle: Partial<Vehicle>) => Promise<void>;
    removeVehicle: (plate: string) => Promise<void>;
    updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
    claimTask: (taskId: string) => Promise<void>;
    releaseTask: (taskId: string) => Promise<void>;
    updateUser: (userId: string, data: any) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    addProposal: (taskId: string, proposal: any) => Promise<void>;
    updateProposal: (taskId: string, proposalId: string, data: any) => Promise<void>;
    submitCheckIn: (data: PreCheckInData) => Promise<void>;
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshData = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        try {
            if (profile.role === UserRole.CUSTOMER) {
                const { data: vParams } = await supabase.from('vehicles').select('*').eq('owner_id', profile.id);
                if (vParams) setVehicles(vParams as Vehicle[]);
            }

            let taskQuery = supabase.from('tasks').select('*, vehicle:vehicles(*, owner:profiles(full_name))').order('created_at', { ascending: false });
            let apptQuery = supabase.from('appointments').select('*').order('appointment_date', { ascending: false });

            if (profile.org_id && profile.role !== UserRole.CUSTOMER) {
                taskQuery = taskQuery.eq('org_id', profile.org_id);
                apptQuery = apptQuery.eq('org_id', profile.org_id);
            }

            const [tasksRes, appsRes, notifsRes] = await Promise.all([
                taskQuery.limit(100),
                apptQuery.limit(100),
                supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20)
            ]);

            if (tasksRes.data) setTasks(tasksRes.data as Task[]);
            if (appsRes.data) setAppointments(appsRes.data as Appointment[]);
            if (notifsRes.data) {
                setNotifications(notifsRes.data as AppNotification[]);
                setUnreadCount(notifsRes.data.filter((n: any) => !n.is_read).length);
            }
        } catch (err) {
            console.error('Data refresh failed:', err);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    // Real-time State Patching
    useEffect(() => {
        if (!profile) return;
        refreshData();

        const channel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: profile.org_id ? `org_id=eq.${profile.org_id}` : undefined }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTasks(prev => [payload.new as Task, ...prev.slice(0, 99)]);
                } else if (payload.eventType === 'UPDATE') {
                    setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(t => t.id === payload.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: profile.org_id ? `org_id=eq.${profile.org_id}` : undefined }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setAppointments(prev => [...prev, payload.new as Appointment].sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)).slice(0, 99));
                } else if (payload.eventType === 'UPDATE') {
                    setAppointments(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
                setNotifications(prev => [payload.new as AppNotification, ...prev.slice(0, 19)]);
                setUnreadCount(prev => prev + 1);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile, refreshData]);

    const addVehicle = async (vehicleData: Partial<Vehicle>) => {
        if (!profile) return;
        try {
            const { error } = await supabase.from('vehicles').upsert({
                ...vehicleData,
                owner_id: profile.id,
                org_id: profile.org_id,
            }, { onConflict: 'plate, org_id' });
            if (error) throw error;
            await refreshData();
        } catch (e) { console.error(e); }
    };

    const removeVehicle = async (plate: string) => {
        try {
            const { error } = await supabase.from('vehicles').update({ owner_id: null }).eq('plate', plate).eq('owner_id', profile?.id);
            if (error) throw error;
            await refreshData();
        } catch (e) { console.error(e); }
    };

    const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
        if (!profile) return;
        try {
            await supabase.from('tasks').update({ status }).eq('id', taskId);
        } catch (e) { console.error(e); }
    };

    const claimTask = async (taskId: string) => {
        if (!profile) return;
        try {
            const { data: currentTask } = await supabase.from('tasks').select('assigned_to').eq('id', taskId).single();
            let assigned_to = currentTask?.assigned_to || [];
            if (!assigned_to.includes(profile.id)) {
                assigned_to = [...assigned_to, profile.id];
            }
            await supabase.from('tasks').update({
                assigned_to,
                status: TaskStatus.IN_PROGRESS
            }).eq('id', taskId);
        } catch (e) { console.error(e); }
    };

    const releaseTask = async (taskId: string) => {
        if (!profile) return;
        try {
            const { data: currentTask } = await supabase.from('tasks').select('assigned_to').eq('id', taskId).single();
            let assigned_to = currentTask?.assigned_to || [];
            assigned_to = assigned_to.filter((id: string) => id !== profile.id);

            // If no one is assigned, return to WAITING
            const newStatus = assigned_to.length === 0 ? TaskStatus.WAITING : undefined;

            const updateData: any = { assigned_to };
            if (newStatus) updateData.status = newStatus;

            await supabase.from('tasks').update(updateData).eq('id', taskId);
        } catch (e) { console.error(e); }
    };

    const deleteTask = async (taskId: string) => {
        await supabase.from('tasks').delete().eq('id', taskId);
    };

    const updateUser = async (userId: string, data: any) => {
        const { error } = await supabase.from('profiles').update(data).eq('id', userId);
        if (error) throw error;
    };

    const addProposal = async (taskId: string, proposal: any) => {
        console.log('Adding proposal placeholder:', taskId, proposal);
    };

    const updateProposal = async (taskId: string, proposalId: string, data: any) => {
        console.log('Updating proposal placeholder:', taskId, proposalId, data);
    };

    const submitCheckIn = async (data: PreCheckInData) => {
        if (!profile?.org_id) return;
        const { data: v } = await supabase.from('vehicles').select('id').eq('plate', data.vehiclePlate).eq('org_id', profile.org_id).single();
        if (!v) return;
        await supabase.from('tasks').insert({
            org_id: profile.org_id,
            title: `Check-In: ${data.faultDescription}`,
            vehicle_id: v.id,
            customer_id: profile.id,
            created_by: profile.id,
            status: TaskStatus.WAITING,
            description: data.faultDescription,
        });
    };

    const markNotificationRead = async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllNotificationsRead = async () => {
        if (!profile?.id) return;
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    return (
        <DataContext.Provider value={{
            tasks, appointments, notifications, unreadCount, vehicles, loading, refreshData,
            addVehicle, removeVehicle, updateTaskStatus, claimTask, releaseTask, updateUser, deleteTask, addProposal, updateProposal, submitCheckIn,
            markNotificationRead, markAllNotificationsRead
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within DataProvider");
    return context;
};
