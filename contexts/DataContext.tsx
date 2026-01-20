import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Task, Appointment, Notification as AppNotification, Vehicle, UserRole, TaskStatus, PreCheckInData } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { formatLicensePlate } from '../utils/formatters';
import { toast } from 'sonner';

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
    updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
    approveTask: (taskId: string, sendToTeamNow: boolean, reminderAt?: string | null) => Promise<void>;
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    lookupCustomerByPhone: (phone: string) => Promise<{ customer: any; vehicles: any[] } | null>;
    loadMoreTasks: () => Promise<void>;
    hasMoreTasks: boolean;
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
        hasMoreTasks: boolean;
    }>({
        tasks: [],
        appointments: [],
        notifications: [],
        unreadCount: 0,
        vehicles: [],
        loading: false,
        hasMoreTasks: true,
    });

    // Stability Refs
    const profileRef = useRef(profile);
    useEffect(() => { profileRef.current = profile; }, [profile]);

    const refreshData = useCallback(async () => {
        if (!profileRef.current?.org_id) return;
        setDataState(prev => ({ ...prev, loading: true }));
        try {
            const orgId = profileRef.current.org_id;
            const myUserId = profileRef.current.id;
            const currProfile = profileRef.current; // Keep for customer vehicle logic

            const results: any = {};

            if (currProfile.role === UserRole.CUSTOMER) {
                const { data: vParams } = await supabase.from('vehicles').select('*').eq('owner_id', myUserId);
                results.vehicles = vParams || [];
            }

            // Tasks - Filter out CANCELLED
            let taskQuery = supabase.from('tasks')
                .select(`*, vehicle:vehicles(*, owner:profiles(full_name)), creator:profiles!tasks_created_by_fkey(*), proposals:proposals(*)`)
                .neq('status', 'CANCELLED')
                .order('created_at', { ascending: false });

            let apptQuery = supabase.from('appointments')
                .select('*')
                .neq('status', 'CANCELLED')
                .order('appointment_date', { ascending: false });

            if (currProfile.org_id && currProfile.role !== UserRole.CUSTOMER) {
                taskQuery = taskQuery.eq('org_id', currProfile.org_id);
                apptQuery = apptQuery.eq('org_id', currProfile.org_id);
            } else if (currProfile.role === UserRole.CUSTOMER) {
                // For customers, show tasks where they are the owner OR created by them
                // We need to fetch tasks for the user OR for any of their vehicles
                const vehicleIds = (results.vehicles || []).map((v: any) => v.id);

                let conditions = [`customer_id.eq.${myUserId}`, `created_by.eq.${myUserId}`];
                if (vehicleIds.length > 0) {
                    conditions.push(`vehicle_id.in.(${vehicleIds.join(',')})`);
                }

                const orFilter = conditions.join(',');
                taskQuery = taskQuery.or(orFilter);
                apptQuery = apptQuery.or(orFilter);
            }

            const [tasksRes, appsRes, notifsRes] = await Promise.all([
                taskQuery.limit(20),
                apptQuery.limit(20),
                supabase.from('notifications').select('*').eq('user_id', currProfile.id).order('created_at', { ascending: false }).limit(20)
            ]);

            setDataState(prev => ({
                ...prev,
                tasks: (tasksRes.data || []) as Task[],
                appointments: (appsRes.data || []) as Appointment[],
                notifications: (notifsRes.data || []) as AppNotification[],
                unreadCount: (notifsRes.data || []).filter((n: any) => !n.is_read).length,
                vehicles: results.vehicles !== undefined ? results.vehicles : prev.vehicles,
                loading: false,
                hasMoreTasks: (tasksRes.data || []).length === 20 // If we got 20, there might be more
            }));
        } catch (err) {
            console.error('Data refresh failed:', err);
            toast.error('נכשל בעדכון הנתונים');
            setDataState(prev => ({ ...prev, loading: false }));
        }
    }, []); // Stable refreshData

    const sendSystemNotification = useCallback(async (userId: string, title: string, message: string, type: string, referenceId?: string) => {
        const currProfile = profileRef.current;
        if (!currProfile?.org_id) return;

        await supabase.from('notifications').insert({
            org_id: currProfile.org_id,
            user_id: userId,
            actor_id: currProfile.id,
            title,
            message,
            type,
            reference_id: referenceId
        });
    }, []);

    const loadMoreTasks = useCallback(async () => {
        const currProfile = profileRef.current;
        if (!currProfile?.org_id || dataState.loading || !dataState.hasMoreTasks) return;

        const lastTask = dataState.tasks[dataState.tasks.length - 1];
        if (!lastTask) return;

        setDataState(prev => ({ ...prev, loading: true }));
        try {
            let taskQuery = supabase.from('tasks')
                .select(`*, vehicle:vehicles(*, owner:profiles(full_name)), creator:profiles!tasks_created_by_fkey(*), proposals:proposals(*)`)
                .neq('status', 'CANCELLED')
                .lt('created_at', lastTask.created_at)
                .order('created_at', { ascending: false })
                .limit(20);

            if (currProfile.role !== UserRole.CUSTOMER) {
                taskQuery = taskQuery.eq('org_id', currProfile.org_id);
            } else {
                const { data: vParams } = await supabase.from('vehicles').select('id').eq('owner_id', currProfile.id);
                const vehicleIds = (vParams || []).map((v: any) => v.id);
                let conditions = [`customer_id.eq.${currProfile.id}`, `created_by.eq.${currProfile.id}`];
                if (vehicleIds.length > 0) conditions.push(`vehicle_id.in.(${vehicleIds.join(',')})`);
                taskQuery = taskQuery.or(conditions.join(','));
            }

            const { data, error } = await taskQuery;
            if (error) throw error;

            setDataState(prev => ({
                ...prev,
                tasks: [...prev.tasks, ...(data || [])] as Task[],
                loading: false,
                hasMoreTasks: (data || []).length === 20
            }));
        } catch (err) {
            console.error('Load more tasks failed:', err);
            setDataState(prev => ({ ...prev, loading: false }));
        }
    }, [dataState.tasks, dataState.loading, dataState.hasMoreTasks]);

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
                const newNotif = payload.new as AppNotification;
                // Frontend guard: Don't show notification if the current user caused it
                if (newNotif.actor_id === profile.id || newNotif.metadata?.actor_id === profile.id) return;

                setDataState(prev => ({
                    ...prev,
                    notifications: [newNotif, ...prev.notifications.slice(0, 19)],
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
            toast.success('הרכב נוסף בהצלחה');
            await refreshData();
        } catch (e) {
            console.error(e);
            toast.error('נכשל בהוספת הרכב');
        }
    }, [refreshData]);

    const removeVehicle = useCallback(async (plate: string) => {
        const currProfile = profileRef.current;
        try {
            const { error } = await supabase.from('vehicles').delete().eq('plate', plate).eq('owner_id', currProfile?.id);
            if (error) throw error;
            toast.success('הרכב הוסר בהצלחה');
            await refreshData();
        } catch (e) {
            console.error(e);
            toast.error('נכשל בהסרת הרכב');
        }
    }, [refreshData]);

    const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
        try {
            // Optimistic update
            setDataState(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status } : t)
            }));
            const { data: taskData } = await supabase.from('tasks').select('customer_id, title').eq('id', taskId).single();
            const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
            if (error) throw error;

            // Notify customer on completion
            if (status === TaskStatus.COMPLETED && taskData?.customer_id) {
                await sendSystemNotification(
                    taskData.customer_id,
                    'הטיפול הושלם! ✅',
                    `הטיפול ב"${taskData.title}" הושלם. הרכב מוכן לאיסוף.`,
                    'TASK_COMPLETED',
                    taskId
                );
            }
            toast.success('סטטוס המשימה עודכן');
        } catch (e) {
            console.error('Update status failed', e);
            toast.error('נכשל בעדכון הסטטוס');
            refreshData();
        }
    }, [refreshData]);

    const claimTask = useCallback(async (taskId: string) => {
        const currProfile = profileRef.current;
        if (!currProfile || !currProfile.org_id) return;

        try {
            console.log('[DataContext] Claiming task:', taskId);

            // Optimistic update for immediate UI reflection
            setDataState(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? {
                    ...t,
                    assigned_to: [...(t.assigned_to || []), currProfile.id],
                    status: TaskStatus.IN_PROGRESS
                } : t)
            }));

            // 1. Fetch task details including vehicle plate and current state
            // @ts-ignore - vehicle is a join
            const { data: currentTask, error: fetchError } = await supabase
                .from('tasks')
                .select(`
                    id, 
                    title, 
                    assigned_to, 
                    customer_id, 
                    vehicle_id, 
                    metadata,
                    vehicle:vehicles(plate)
                `)
                .eq('id', taskId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Perform Lookup for correct recipient if customer_id is missing
            // Requirement: "The system must perform a lookup using the Vehicle License Plate or Customer Phone Number"
            let targetCustomerId = currentTask.customer_id;

            // If no customer_id, try to find the owner of the vehicle
            if (!targetCustomerId && currentTask.vehicle_id) {
                const { data: v } = await supabase.from('vehicles').select('owner_id').eq('id', currentTask.vehicle_id).single();
                if (v?.owner_id) targetCustomerId = v.owner_id;
            }

            // If still no customer_id, try looking up by phone number in metadata
            if (!targetCustomerId) {
                const searchPhone = currentTask.metadata?.ownerPhone || currentTask.metadata?.phone;
                if (searchPhone) {
                    const { data: p } = await supabase.from('profiles').select('id').eq('phone', searchPhone).limit(1).maybeSingle();
                    if (p?.id) targetCustomerId = p.id;
                }
            }

            // 3. Update task status and assignment
            let assigned_to = currentTask.assigned_to || [];
            if (!assigned_to.includes(currProfile.id)) {
                assigned_to = [...assigned_to, currProfile.id];
            }

            const { error: updateError } = await supabase.from('tasks').update({
                assigned_to,
                status: TaskStatus.IN_PROGRESS,
                started_at: new Date().toISOString()
            }).eq('id', taskId);

            if (updateError) throw updateError;

            // 4. Notify Admins
            // Requirement: "Worker [Name] has started working on [Vehicle License Plate / Task ID]"
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('org_id', currProfile.org_id)
                .in('role', [UserRole.SUPER_MANAGER, UserRole.DEPUTY_MANAGER]);

            // @ts-ignore
            const plate = currentTask.vehicle?.plate ? formatLicensePlate(currentTask.vehicle.plate) : '---';
            if (admins) {
                for (const admin of admins) {
                    await sendSystemNotification(
                        admin.id,
                        'משימה החלה 🔧',
                        `העובד ${currProfile.full_name} התחיל לעבוד על ${plate}`,
                        'TASK_STARTED_ADMIN',
                        taskId
                    );
                }
            }

            // 5. Notify Customer
            // Requirement: "Hello, your vehicle [License Plate] is now being serviced."
            if (targetCustomerId) {
                await sendSystemNotification(
                    targetCustomerId,
                    'החל הטיפול ברכבך 🔧',
                    `שלום, הרכב שלך ${plate} נמצא כעת בטיפול.`,
                    'TASK_CLAIMED',
                    taskId
                );
            }

            toast.success('המשימה נלקחה בצלחה');
            await refreshData();
        } catch (e) {
            console.error('Claim failed:', e);
            toast.error('נכשל בלקיחת המשימה');
            refreshData(); // Rollback on error
        }
    }, [refreshData, sendSystemNotification]);

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
            toast.success('המשימה שוחררה');
        } catch (e) {
            console.error('Release failed', e);
            toast.error('נכשל בשחרור המשימה');
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
            // Soft Delete: Update status to CANCELLED instead of hard delete
            const { error } = await supabase.from('tasks').update({ status: TaskStatus.CANCELLED }).eq('id', taskId);
            if (error) throw error;
            toast.success('המשימה בוטלה');
        } catch (e) {
            console.error('Delete failed:', e);
            toast.error('נכשל בביטול המשימה');
            refreshData(); // Rollback
        }
    }, [refreshData]);

    const updateUser = useCallback(async (userId: string, data: any) => {
        const { error } = await supabase.from('profiles').update(data).eq('id', userId);
        if (error) {
            toast.error('נכשל בעדכון הפרופיל');
            throw error;
        }
        toast.success('הפרופיל עודכן בהצלחה');
    }, []);

    const addProposal = useCallback(async (taskId: string, proposal: any) => {
        const currProfile = profileRef.current;
        if (!currProfile?.org_id) return;

        try {
            const { error } = await supabase.from('proposals').insert({
                org_id: currProfile.org_id,
                task_id: taskId,
                customer_id: proposal.customer_id || currProfile.id,
                description: proposal.description,
                price: proposal.price || null,
                status: 'PENDING',
                created_by: currProfile.id,
                photo_url: proposal.photo_url || null
            });
            if (error) throw error;
            toast.success('הבקשה נשלחה בהצלחה');
            refreshData();
        } catch (e) {
            console.error('Add proposal failed:', e);
            toast.error('נכשל בשליחת הבקשה');
        }
    }, [refreshData]);

    const updateProposal = useCallback(async (taskId: string, proposalId: string, data: any) => {
        console.log('Updating proposal placeholder:', taskId, proposalId, data);
    }, []);

    const submitCheckIn = useCallback(async (data: PreCheckInData) => {
        const currProfile = profileRef.current;
        if (!currProfile?.id) return;

        // Ensure we have an org_id (either from profile or fallback to a default if user is just joining)
        const orgId = currProfile.org_id;
        if (!orgId) {
            console.error('No organization ID found for user');
            return;
        }

        const { data: v } = await supabase.from('vehicles').select('id').eq('plate', data.vehiclePlate).eq('org_id', orgId).single();
        if (!v) {
            console.error('Vehicle not found for plate:', data.vehiclePlate);
            return;
        }

        const isAppointment = !!data.appointmentDate;
        const title = isAppointment
            ? `Appointment Request: ${data.serviceTypes?.join(', ') || 'General'}`
            : `Check-In: ${data.faultDescription || 'General Checkup'}`;

        const { error } = await supabase.from('tasks').insert({
            org_id: orgId,
            vehicle_id: v.id,
            customer_id: currProfile.id,
            created_by: currProfile.id,
            title: title,
            description: data.faultDescription,
            status: TaskStatus.WAITING_FOR_APPROVAL,
            metadata: {
                ...data,
                type: isAppointment ? 'APPOINTMENT_REQUEST' : 'CHECK_IN',
                paymentMethod: data.paymentMethod,
                submittedAt: Date.now()
            }
        });

        if (error) {
            console.error('Submit Check-In failed:', error);
            toast.error('נכשל בשליחת הבקשה');
            throw error;
        }

        toast.success(isAppointment ? 'התור נקבע בהצלחה' : 'הצ׳ק-אין בוצע בהצלחה');

        // Notify admins about new request
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('org_id', orgId)
            .in('role', [UserRole.SUPER_MANAGER, UserRole.DEPUTY_MANAGER]);

        if (admins) {
            for (const admin of admins) {
                await sendSystemNotification(
                    admin.id,
                    'בקשת טיפול חדשה 📝',
                    `התקבלה בקשה חדשה מ${currProfile.full_name || 'לקוח'}`,
                    'NEW_CHECKIN',
                    undefined
                );
            }
        }

        await refreshData();
    }, [refreshData, sendSystemNotification]);

    const approveTask = useCallback(async (taskId: string, sendToTeamNow: boolean, reminderAt?: string | null) => {
        const currProfile = profileRef.current;
        if (!currProfile) return;

        try {
            const newStatus = sendToTeamNow ? TaskStatus.WAITING : TaskStatus.SCHEDULED;
            const { data: taskData } = await supabase.from('tasks').select('customer_id, title').eq('id', taskId).single();

            const { error } = await supabase.from('tasks').update({
                status: newStatus,
                scheduled_reminder_at: reminderAt
            }).eq('id', taskId);

            if (error) throw error;

            // Notify customer
            if (taskData?.customer_id) {
                await sendSystemNotification(
                    taskData.customer_id,
                    'הטיפול אושר! ✅',
                    `הבקשה שלך ל"${taskData.title}" אושרה. ${sendToTeamNow ? 'אנחנו מחכים לך.' : 'נקבע לך תור.'}`,
                    'TASK_APPROVED',
                    taskId
                );
            }

            toast.success('המשימה אושרה');
            await refreshData();
        } catch (e) {
            console.error('Approve task failed:', e);
            toast.error('נכשל באישור המשימה');
            throw e;
        }
    }, [refreshData, sendSystemNotification]);

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        try {
            const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
            if (error) throw error;
            await refreshData();
        } catch (e) {
            console.error('Update task failed:', e);
            throw e;
        }
    }, [refreshData]);

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
        if (!currProfile) return;
        try {
            const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', currProfile.id).eq('is_read', false);
            if (error) throw error;
            setDataState(prev => ({ ...prev, notifications: prev.notifications.map(n => ({ ...n, is_read: true })), unreadCount: 0 }));
        } catch (e) { console.error(e); }
    }, []);

    const lookupCustomerByPhone = useCallback(async (phone: string) => {
        if (!phone) return null;
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('phone', phone)
                .maybeSingle();

            if (profileError) throw profileError;
            if (!profileData) return null;

            const { data: vehiclesData, error: vehiclesError } = await supabase
                .from('vehicles')
                .select('*')
                .eq('owner_id', profileData.id);

            if (vehiclesError) throw vehiclesError;

            return {
                customer: profileData,
                vehicles: vehiclesData || []
            };
        } catch (e) {
            console.error('[DataContext] lookupCustomerByPhone failed:', e);
            return null;
        }
    }, []);

    const value = useMemo(() => ({
        ...dataState,
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
        updateTask,
        approveTask,
        markNotificationRead,
        markAllNotificationsRead,
        lookupCustomerByPhone,
        loadMoreTasks
    }), [
        dataState,
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
        updateTask,
        approveTask,
        markNotificationRead,
        markAllNotificationsRead,
        lookupCustomerByPhone,
        loadMoreTasks
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
