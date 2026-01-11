import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    const [dataState, setDataState] = useState<{
        tasks: Task[];
        appointments: Appointment[];
        notifications: AppNotification[];
        unreadCount: number;
        vehicles: Vehicle[];
        loading: boolean;
    }>({
        tasks: [],
        appointments: [],
        notifications: [],
        unreadCount: 0,
        vehicles: [],
        loading: false,
    });

    // Stability Refs
    const profileRef = useRef(profile);
    useEffect(() => { profileRef.current = profile; }, [profile]);

    const refreshData = useCallback(async () => {
        const currProfile = profileRef.current;
        if (!currProfile?.id) return;

        setDataState(prev => ({ ...prev, loading: true }));
        try {
            const results: any = {};

            if (currProfile.role === UserRole.CUSTOMER) {
                const { data: vParams } = await supabase.from('vehicles').select('*').eq('owner_id', currProfile.id);
                results.vehicles = vParams || [];
            }

            let taskQuery = supabase.from('tasks').select('*, vehicle:vehicles(*, owner:profiles(full_name))').order('created_at', { ascending: false });
            let apptQuery = supabase.from('appointments').select('*').order('appointment_date', { ascending: false });

            if (currProfile.org_id && currProfile.role !== UserRole.CUSTOMER) {
                taskQuery = taskQuery.eq('org_id', currProfile.org_id);
                apptQuery = apptQuery.eq('org_id', currProfile.org_id);
            }

            const [tasksRes, appsRes, notifsRes] = await Promise.all([
                taskQuery.limit(100),
                apptQuery.limit(100),
                supabase.from('notifications').select('*').eq('user_id', currProfile.id).order('created_at', { ascending: false }).limit(20)
            ]);

            setDataState(prev => ({
                ...prev,
                tasks: (tasksRes.data || []) as Task[],
                appointments: (appsRes.data || []) as Appointment[],
                notifications: (notifsRes.data || []) as AppNotification[],
                unreadCount: (notifsRes.data || []).filter((n: any) => !n.is_read).length,
                vehicles: results.vehicles || prev.vehicles,
                loading: false
            }));
        } catch (err) {
            console.error('Data refresh failed:', err);
            setDataState(prev => ({ ...prev, loading: false }));
        }
    }, []); // Stable refreshData

    // Real-time State Patching
    useEffect(() => {
        if (!profile?.id) return;
        refreshData();

        const channel = supabase.channel(`db-changes-${profile.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: profile.org_id ? `org_id=eq.${profile.org_id}` : undefined }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setDataState(prev => ({ ...prev, tasks: [payload.new as Task, ...prev.tasks.slice(0, 99)] }));
                } else if (payload.eventType === 'UPDATE') {
                    console.log('[Realtime] Task Update:', payload.new.id, payload.new.status);
                    setDataState(prev => ({
                        ...prev,
                        tasks: prev.tasks.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
                    }));
                } else if (payload.eventType === 'DELETE') {
                    console.log('[Realtime] Task Delete:', payload.old.id);
                    setDataState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== payload.old.id) }));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: profile.org_id ? `org_id=eq.${profile.org_id}` : undefined }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setDataState(prev => ({
                        ...prev,
                        appointments: [...prev.appointments, payload.new as Appointment].sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)).slice(0, 99)
                    }));
                } else if (payload.eventType === 'UPDATE') {
                    setDataState(prev => ({ ...prev, appointments: prev.appointments.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a) }));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
                setDataState(prev => ({
                    ...prev,
                    notifications: [payload.new as AppNotification, ...prev.notifications.slice(0, 19)],
                    unreadCount: prev.unreadCount + 1
                }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.id, profile?.org_id, refreshData]);

    const addVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
        const currProfile = profileRef.current;
        if (!currProfile) return;
        try {
            const { error } = await supabase.from('vehicles').upsert({
                ...vehicleData,
                owner_id: currProfile.id,
                org_id: currProfile.org_id,
            }, { onConflict: 'plate, org_id' });
            if (error) throw error;
            await refreshData();
        } catch (e) { console.error(e); }
    }, [refreshData]);

    const removeVehicle = useCallback(async (plate: string) => {
        const currProfile = profileRef.current;
        try {
            const { error } = await supabase.from('vehicles').update({ owner_id: null }).eq('plate', plate).eq('owner_id', currProfile?.id);
            if (error) throw error;
            await refreshData();
        } catch (e) { console.error(e); }
    }, [refreshData]);

    const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
        try {
            // Optimistic update
            setDataState(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status } : t)
            }));
            const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
            if (error) throw error;
        } catch (e) {
            console.error('Update status failed', e);
            refreshData();
        }
    }, [refreshData]);

    const claimTask = useCallback(async (taskId: string) => {
        const currProfile = profileRef.current;
        if (!currProfile) return;
        try {
            // Optimistic update for immediate UI reflection
            setDataState(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? {
                    ...t,
                    assigned_to: [...(t.assigned_to || []), currProfile.id],
                    status: TaskStatus.IN_PROGRESS
                } : t)
            }));

            const { data: currentTask } = await supabase.from('tasks').select('assigned_to').eq('id', taskId).single();
            let assigned_to = currentTask?.assigned_to || [];
            if (!assigned_to.includes(currProfile.id)) {
                assigned_to = [...assigned_to, currProfile.id];
            }
            await supabase.from('tasks').update({
                assigned_to,
                status: TaskStatus.IN_PROGRESS
            }).eq('id', taskId);
        } catch (e) {
            console.error('Claim failed:', e);
            refreshData(); // Rollback on error
        }
    }, [refreshData]);

    const releaseTask = useCallback(async (taskId: string) => {
        const currProfile = profileRef.current;
        if (!currProfile) return;
        try {
            console.log('[DataContext] Releasing task:', taskId);
            // Optimistic update
            setDataState(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? {
                    ...t,
                    assigned_to: (t.assigned_to || []).filter(id => id !== currProfile.id),
                    status: (t.assigned_to || []).length <= 1 ? TaskStatus.WAITING : t.status
                } : t)
            }));

            const { data: currentTask } = await supabase.from('tasks').select('assigned_to').eq('id', taskId).single();
            let assigned_to = currentTask?.assigned_to || [];
            assigned_to = assigned_to.filter((id: string) => id !== currProfile.id);

            const updateData: any = {
                assigned_to: assigned_to.length > 0 ? assigned_to : [],
                status: assigned_to.length === 0 ? TaskStatus.WAITING : undefined
            };

            const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
            if (error) throw error;
        } catch (e) {
            console.error('Release failed', e);
            refreshData();
        }
    }, [refreshData]);

    const deleteTask = useCallback(async (taskId: string) => {
        try {
            // Optimistic update
            setDataState(prev => ({
                ...prev,
                tasks: prev.tasks.filter(t => t.id !== taskId)
            }));
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;
        } catch (e) {
            console.error('Delete failed:', e);
            refreshData(); // Rollback
        }
    }, [refreshData]);

    const updateUser = useCallback(async (userId: string, data: any) => {
        const { error } = await supabase.from('profiles').update(data).eq('id', userId);
        if (error) throw error;
    }, []);

    const addProposal = useCallback(async (taskId: string, proposal: any) => {
        console.log('Adding proposal placeholder:', taskId, proposal);
    }, []);

    const updateProposal = useCallback(async (taskId: string, proposalId: string, data: any) => {
        console.log('Updating proposal placeholder:', taskId, proposalId, data);
    }, []);

    const submitCheckIn = useCallback(async (data: PreCheckInData) => {
        const currProfile = profileRef.current;
        if (!currProfile?.org_id) return;
        const { data: v } = await supabase.from('vehicles').select('id').eq('plate', data.vehiclePlate).eq('org_id', currProfile.org_id).single();
        if (!v) return;
        await supabase.from('tasks').insert({
            org_id: currProfile.org_id,
            title: `Check-In: ${data.faultDescription}`,
            vehicle_id: v.id,
            customer_id: currProfile.id,
            created_by: currProfile.id,
            status: TaskStatus.WAITING,
            description: data.faultDescription,
        });
    }, []);

    const markNotificationRead = useCallback(async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setDataState(prev => ({
            ...prev,
            notifications: prev.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
            unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
    }, []);

    const markAllNotificationsRead = useCallback(async () => {
        const currProfile = profileRef.current;
        if (!currProfile?.id) return;
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', currProfile.id).eq('is_read', false);
        setDataState(prev => ({
            ...prev,
            notifications: prev.notifications.map(n => ({ ...n, is_read: true })),
            unreadCount: 0
        }));
    }, []);

    const value = useMemo(() => ({
        tasks: dataState.tasks,
        appointments: dataState.appointments,
        notifications: dataState.notifications,
        unreadCount: dataState.unreadCount,
        vehicles: dataState.vehicles,
        loading: dataState.loading,
        refreshData,
        addVehicle,
        removeVehicle,
        updateTaskStatus,
        claimTask,
        releaseTask,
        updateUser,
        deleteTask,
        addProposal,
        updateProposal,
        submitCheckIn,
        markNotificationRead,
        markAllNotificationsRead
    }), [
        dataState.tasks, dataState.appointments, dataState.notifications, dataState.unreadCount,
        dataState.vehicles, dataState.loading, refreshData, addVehicle, removeVehicle,
        updateTaskStatus, claimTask, releaseTask, updateUser, deleteTask, addProposal,
        updateProposal, submitCheckIn, markNotificationRead, markAllNotificationsRead
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within DataProvider");
    return context;
};
