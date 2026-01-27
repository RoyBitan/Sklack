import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Appointment,
  AppointmentStatus,
  Notification as AppNotification,
  PreCheckInData,
  Task,
  TaskStatus,
  UserRole,
  Vehicle,
} from "../types";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { formatLicensePlate } from "../utils/formatters";
import { normalizePhone } from "../utils/phoneUtils";
import { toast } from "sonner";

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
  updateProposal: (
    taskId: string,
    proposalId: string,
    data: any,
  ) => Promise<void>;
  submitCheckIn: (data: PreCheckInData) => Promise<void>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  updateOrganization: (data: any) => Promise<void>;
  approveTask: (
    taskId: string,
    sendToTeamNow: boolean,
    reminderAt?: string | null,
  ) => Promise<void>;
  approveAppointment: (
    appointmentId: string,
    createTaskNow: boolean,
  ) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  lookupCustomerByPhone: (
    phone: string,
  ) => Promise<{ customer: any; vehicles: any[] } | null>;
  sendSystemNotification: (
    userId: string,
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ) => Promise<void>;
  notifyMultiple: (
    userIds: string[],
    title: string,
    message: string,
    type: string,
    referenceId?: string,
  ) => Promise<void>;
  fetchTeamMembers: () => Promise<any[]>;
  loadMoreTasks: () => Promise<void>;
  hasMoreTasks: boolean;
  promoteToAdmin: (userId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
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
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshData = useCallback(async () => {
    if (!profileRef.current?.org_id) return;
    setDataState((prev) => ({ ...prev, loading: true }));
    try {
      const orgId = profileRef.current.org_id;
      const myUserId = profileRef.current.id;
      const currProfile = profileRef.current; // Keep for customer vehicle logic

      const results: any = {};

      if (currProfile.role === UserRole.CUSTOMER) {
        const { data: vParams } = await supabase.from("vehicles").select("*")
          .eq("owner_id", myUserId);
        results.vehicles = vParams || [];
      } else if (currProfile.org_id) {
        // For Staff/Managers, fetch all vehicles in org
        const { data: vParams } = await supabase.from("vehicles")
          .select("*")
          .eq("org_id", currProfile.org_id)
          .order("created_at", { ascending: false });
        results.vehicles = vParams || [];
      }

      // Tasks - Filter out CANCELLED
      let taskQuery = supabase.from("tasks")
        .select(
          `*, organization:organizations(name), vehicle:vehicles(*, owner:profiles(full_name)), creator:profiles!tasks_created_by_fkey(*), proposals:proposals(*)`,
        )
        .neq("status", "CANCELLED")
        .order("created_at", { ascending: false });

      let apptQuery = supabase.from("appointments")
        .select("*, customer:profiles(*), vehicle:vehicles(*)")
        .neq("status", "CANCELLED")
        .order("appointment_date", { ascending: false });

      if (currProfile.org_id && currProfile.role !== UserRole.CUSTOMER) {
        taskQuery = taskQuery.eq("org_id", currProfile.org_id);
        apptQuery = apptQuery.eq("org_id", currProfile.org_id);
      } else if (currProfile.role === UserRole.CUSTOMER) {
        // For customers, show tasks where they are the owner OR created by them
        // We need to fetch tasks for the user OR for any of their vehicles
        const vehicleIds = (results.vehicles || []).map((v: any) => v.id);

        let conditions = [
          `customer_id.eq.${myUserId}`,
          `created_by.eq.${myUserId}`,
        ];
        if (vehicleIds.length > 0) {
          conditions.push(`vehicle_id.in.(${vehicleIds.join(",")})`);
        }

        const orFilter = conditions.join(",");
        taskQuery = taskQuery.or(orFilter);
        apptQuery = apptQuery.or(orFilter);
      }

      const [tasksRes, appsRes, notifsRes] = await Promise.all([
        taskQuery.limit(20),
        apptQuery.limit(20),
        supabase.from("notifications").select("*").eq("user_id", currProfile.id)
          .order("created_at", { ascending: false }).limit(20),
      ]);

      setDataState((prev) => ({
        ...prev,
        tasks: (tasksRes.data || []) as Task[],
        appointments: (appsRes.data || []) as Appointment[],
        notifications: (notifsRes.data || []) as AppNotification[],
        unreadCount: (notifsRes.data || []).filter((n: any) =>
          !n.is_read
        ).length,
        vehicles: results.vehicles !== undefined
          ? results.vehicles
          : prev.vehicles,
        loading: false,
        hasMoreTasks: (tasksRes.data || []).length === 20, // If we got 20, there might be more
      }));
    } catch (err: any) {
      console.error("Data refresh failed:", err);
      if (err.message === "Failed to fetch" || !navigator.onLine) {
        toast.error("אין חיבור לאינטרנט. מציג נתונים שמורים.");
      } else {
        toast.error("שגיאה בסנכרון הנתונים");
      }
      setDataState((prev) => ({ ...prev, loading: false }));
    }
  }, []); // Stable refreshData

  const sendSystemNotification = useCallback(
    async (
      userId: string,
      title: string,
      message: string,
      type: string,
      referenceId?: string,
    ) => {
      const currProfile = profileRef.current;
      if (!currProfile?.org_id) return;

      await supabase.from("notifications").insert({
        org_id: currProfile.org_id,
        user_id: userId,
        actor_id: currProfile.id,
        title,
        message,
        type,
        reference_id: referenceId,
      });
    },
    [],
  );

  const loadMoreTasks = useCallback(async () => {
    const currProfile = profileRef.current;
    if (!currProfile?.org_id || dataState.loading || !dataState.hasMoreTasks) {
      return;
    }

    const lastTask = dataState.tasks[dataState.tasks.length - 1];
    if (!lastTask) return;

    setDataState((prev) => ({ ...prev, loading: true }));
    try {
      let taskQuery = supabase.from("tasks")
        .select(
          `*, vehicle:vehicles(*, owner:profiles(full_name)), creator:profiles!tasks_created_by_fkey(*), proposals:proposals(*)`,
        )
        .neq("status", "CANCELLED")
        .lt("created_at", lastTask.created_at)
        .order("created_at", { ascending: false })
        .limit(20);

      if (currProfile.role !== UserRole.CUSTOMER) {
        taskQuery = taskQuery.eq("org_id", currProfile.org_id);
      } else {
        const { data: vParams } = await supabase.from("vehicles").select("id")
          .eq("owner_id", currProfile.id);
        const vehicleIds = (vParams || []).map((v: any) => v.id);
        let conditions = [
          `customer_id.eq.${currProfile.id}`,
          `created_by.eq.${currProfile.id}`,
        ];
        if (vehicleIds.length > 0) {
          conditions.push(`vehicle_id.in.(${vehicleIds.join(",")})`);
        }
        taskQuery = taskQuery.or(conditions.join(","));
      }

      const { data, error } = await taskQuery;
      if (error) throw error;

      setDataState((prev) => ({
        ...prev,
        tasks: [...prev.tasks, ...(data || [])] as Task[],
        loading: false,
        hasMoreTasks: (data || []).length === 20,
      }));
    } catch (err) {
      console.error("Load more tasks failed:", err);
      setDataState((prev) => ({ ...prev, loading: false }));
    }
  }, [dataState.tasks, dataState.loading, dataState.hasMoreTasks]);

  // Real-time State Patching
  useEffect(() => {
    if (!profile?.id) return;
    refreshData();

    const channel = supabase.channel(`db-changes-${profile.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: profile.org_id ? `org_id=eq.${profile.org_id}` : undefined,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setDataState((prev) => ({
            ...prev,
            tasks: [payload.new as Task, ...prev.tasks.slice(0, 99)],
          }));
        } else if (payload.eventType === "UPDATE") {
          console.log(
            "[Realtime] Task Update:",
            payload.new.id,
            payload.new.status,
          );
          setDataState((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === payload.new.id ? { ...t, ...payload.new } : t
            ),
          }));
        } else if (payload.eventType === "DELETE") {
          console.log("[Realtime] Task Delete:", payload.old.id);
          setDataState((prev) => ({
            ...prev,
            tasks: prev.tasks.filter((t) => t.id !== payload.old.id),
          }));
        }
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: profile.org_id ? `org_id=eq.${profile.org_id}` : undefined,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setDataState((prev) => ({
            ...prev,
            appointments: [...prev.appointments, payload.new as Appointment]
              .sort((a, b) =>
                b.appointment_date.localeCompare(a.appointment_date)
              ).slice(0, 99),
          }));
        } else if (payload.eventType === "UPDATE") {
          setDataState((prev) => ({
            ...prev,
            appointments: prev.appointments.map((a) =>
              a.id === payload.new.id ? { ...a, ...payload.new } : a
            ),
          }));
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        const newNotif = payload.new as AppNotification;
        // Frontend guard: Don't show notification if the current user caused it
        if (
          newNotif.actor_id === profile.id ||
          newNotif.metadata?.actor_id === profile.id
        ) return;

        setDataState((prev) => ({
          ...prev,
          notifications: [newNotif, ...prev.notifications.slice(0, 19)],
          unreadCount: prev.unreadCount + 1,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.org_id, refreshData]);

  const addVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
    const currProfile = profileRef.current;
    if (!currProfile?.org_id) return;
    try {
      // 1. Check if vehicle already exists
      const { data: existing } = await supabase
        .from("vehicles")
        .select("id, owner_id")
        .eq("plate", vehicleData.plate)
        .maybeSingle();

      if (existing) {
        // If the vehicle exists but has no owner, allow the current user to claim it
        // OR if the vehicle exists and the current user is an Admin/Staff, let them manage it
        // OR if the owner is the same as current user
        if (existing.owner_id && existing.owner_id !== currProfile.id) {
          // Check if the current user's phone matches the phone in the most recent task for this vehicle
          const { data: recentTask } = await supabase
            .from("tasks")
            .select("metadata")
            .eq("vehicle_id", existing.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const recentPhone = recentTask?.metadata?.ownerPhone ||
            recentTask?.metadata?.phone;
          const userPhone = normalizePhone(currProfile.phone || "");

          if (!recentPhone || normalizePhone(recentPhone) !== userPhone) {
            toast.error("הרכב כבר רשום ללקוח אחר במערכת");
            return;
          }
        }

        // Update existing (Claim or Refresh)
        const { error } = await supabase.from("vehicles").update({
          ...vehicleData,
          owner_id: currProfile.id,
          org_id: currProfile.org_id,
        }).eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("vehicles").insert({
          ...vehicleData,
          owner_id: currProfile.id,
          org_id: currProfile.org_id,
        });
        if (error) throw error;
      }

      toast.success("הרכב נוסף בהצלחה");
      await refreshData();
    } catch (e) {
      console.error(e);
      toast.error("נכשל בהוספת הרכב");
    }
  }, [refreshData]);

  const removeVehicle = useCallback(async (plate: string) => {
    const currProfile = profileRef.current;
    try {
      const { error } = await supabase.from("vehicles").delete().eq(
        "plate",
        plate,
      ).eq("owner_id", currProfile?.id);
      if (error) throw error;
      toast.success("הרכב הוסר בהצלחה");
      await refreshData();
    } catch (e) {
      console.error(e);
      toast.error("נכשל בהסרת הרכב");
    }
  }, [refreshData]);

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        // Optimistic update
        setDataState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => t.id === taskId ? { ...t, status } : t),
        }));
        const { data: taskData } = await supabase.from("tasks").select(
          "customer_id, title",
        ).eq("id", taskId).single();
        const { data: updatedData, error } = await supabase.from("tasks")
          .update({ status }).eq("id", taskId).select();
        if (error) {
          throw error;
        }
        if (!updatedData || updatedData.length === 0) {
          throw new Error(
            "Permission denied: Unable to update task status.",
          );
        }

        // Notify customer on completion
        if (status === TaskStatus.COMPLETED && taskData?.customer_id) {
          await sendSystemNotification(
            taskData.customer_id,
            "הטיפול הושלם! ✅",
            `הטיפול ב"${taskData.title}" הושלם. הרכב מוכן לאיסוף.`,
            "TASK_COMPLETED",
            taskId,
          );
        }
        toast.success("סטטוס המשימה עודכן");
      } catch (e) {
        console.error("Update status failed", e);
        toast.error("נכשל בעדכון הסטטוס");
        refreshData();
      }
    },
    [refreshData],
  );

  const claimTask = useCallback(async (taskId: string) => {
    const currProfile = profileRef.current;
    if (!currProfile || !currProfile.org_id) return;

    try {
      console.log("[DataContext] Claiming task:", taskId);

      // Optimistic update for immediate UI reflection
      setDataState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
              ...t,
              assigned_to: [...(t.assigned_to || []), currProfile.id],
              status: TaskStatus.IN_PROGRESS,
            }
            : t
        ),
      }));

      // 1. Fetch task details including vehicle plate and current state
      // @ts-ignore - vehicle is a join
      const { data: currentTask, error: fetchError } = await supabase
        .from("tasks")
        .select(`
                    id, 
                    title, 
                    assigned_to, 
                    customer_id, 
                    vehicle_id, 
                    metadata,
                    vehicle:vehicles(plate)
                `)
        .eq("id", taskId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Perform Lookup for correct recipient if customer_id is missing
      // Requirement: "The system must perform a lookup using the Vehicle License Plate or Customer Phone Number"
      let targetCustomerId = currentTask.customer_id;

      // If no customer_id, try to find the owner of the vehicle
      if (!targetCustomerId && currentTask.vehicle_id) {
        const { data: v } = await supabase.from("vehicles").select("owner_id")
          .eq("id", currentTask.vehicle_id).single();
        if (v?.owner_id) targetCustomerId = v.owner_id;
      }

      // If still no customer_id, try looking up by phone number in metadata
      if (!targetCustomerId) {
        const searchPhone = currentTask.metadata?.ownerPhone ||
          currentTask.metadata?.phone;
        if (searchPhone) {
          const { data: p } = await supabase.from("profiles").select("id").eq(
            "phone",
            searchPhone,
          ).limit(1).maybeSingle();
          if (p?.id) targetCustomerId = p.id;
        }
      }

      // 3. Update task status and assignment
      let assigned_to = currentTask.assigned_to || [];
      if (!assigned_to.includes(currProfile.id)) {
        assigned_to = [...assigned_to, currProfile.id];
      }

      const { data: updatedData, error: updateError } = await supabase.from(
        "tasks",
      ).update({
        assigned_to,
        status: TaskStatus.IN_PROGRESS,
        started_at: new Date().toISOString(),
      }).eq("id", taskId).select();

      if (updateError) throw updateError;
      // Catch Silent RLS Failure: If no rows returned, the user didn't have permission to update THIS row
      if (!updatedData || updatedData.length === 0) {
        console.error(
          "[DataContext] Update returned 0 rows. Likely RLS policy mismatch.",
        );
        throw new Error("Permission denied: Unable to update task status.");
      }

      // 4. Notify Admins
      // Requirement: "Worker [Name] has started working on [Vehicle License Plate / Task ID]"
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", currProfile.org_id)
        .eq("role", UserRole.SUPER_MANAGER); // Only super managers get notifications

      const vehicle: any = Array.isArray(currentTask.vehicle)
        ? currentTask.vehicle[0]
        : currentTask.vehicle;
      const plate = vehicle?.plate ? formatLicensePlate(vehicle.plate) : "---";
      if (admins) {
        for (const admin of admins) {
          await sendSystemNotification(
            admin.id,
            "משימה החלה 🔧",
            `העובד ${currProfile.full_name} התחיל לעבוד על ${plate}`,
            "TASK_STARTED_ADMIN",
            taskId,
          );
        }
      }

      // 5. Notify Customer
      // Requirement: "Hello, your vehicle [License Plate] is now being serviced."
      if (targetCustomerId) {
        await sendSystemNotification(
          targetCustomerId,
          "החל הטיפול ברכבך 🔧",
          `שלום, הרכב שלך ${plate} נמצא כעת בטיפול.`,
          "TASK_CLAIMED",
          taskId,
        );
      }

      toast.success("המשימה נלקחה בצלחה");
      await refreshData();
    } catch (e: any) {
      console.error("Claim failed:", e);
      toast.error(
        e.message === "Permission denied: Unable to update task status."
          ? "אין לך הרשאה לבצע פעולה זו"
          : "נכשל בלקיחת המשימה",
      );
      refreshData(); // Rollback on error
    }
  }, [refreshData, sendSystemNotification]);

  const releaseTask = useCallback(async (taskId: string) => {
    const currProfile = profileRef.current;
    if (!currProfile) return;
    try {
      console.log("[DataContext] Releasing task:", taskId);
      // Optimistic update
      setDataState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
              ...t,
              assigned_to: (t.assigned_to || []).filter((id) =>
                id !== currProfile.id
              ),
              status: (t.assigned_to || []).length <= 1
                ? TaskStatus.WAITING
                : t.status,
            }
            : t
        ),
      }));

      const { data: currentTask } = await supabase.from("tasks").select(
        "assigned_to",
      ).eq("id", taskId).single();
      let assigned_to = currentTask?.assigned_to || [];
      assigned_to = assigned_to.filter((id: string) => id !== currProfile.id);

      const updateData: any = {
        assigned_to: assigned_to.length > 0 ? assigned_to : [],
        status: assigned_to.length === 0 ? TaskStatus.WAITING : undefined,
      };

      const { data: updatedData, error } = await supabase.from("tasks").update(
        updateData,
      ).eq("id", taskId).select();
      if (error) throw error;
      if (!updatedData || updatedData.length === 0) {
        throw new Error("Permission denied: Unable to release task.");
      }
      toast.success("המשימה שוחררה");
    } catch (e) {
      console.error("Release failed", e);
      toast.error("נכשל בשחרור המשימה");
      refreshData();
    }
  }, [refreshData]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      // Optimistic update
      setDataState((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
      }));
      // Soft Delete: Update status to CANCELLED instead of hard delete
      const { error } = await supabase.from("tasks").update({
        status: TaskStatus.CANCELLED,
      }).eq("id", taskId);
      if (error) throw error;
      toast.success("המשימה בוטלה");
    } catch (e) {
      console.error("Delete failed:", e);
      toast.error("נכשל בביטול המשימה");
      refreshData(); // Rollback
    }
  }, [refreshData]);

  const updateUser = useCallback(async (userId: string, data: any) => {
    const { error } = await supabase.from("profiles").update(data).eq(
      "id",
      userId,
    );
    if (error) {
      toast.error("נכשל בעדכון הפרופיל");
      throw error;
    }
    toast.success("הפרופיל עודכן בהצלחה");
  }, []);

  const addProposal = useCallback(async (taskId: string, proposal: any) => {
    const currProfile = profileRef.current;
    if (!currProfile?.org_id) return;

    try {
      // Resolve customer_id from task if not provided
      let customerId = proposal.customer_id;
      if (!customerId) {
        const { data: task } = await supabase.from("tasks").select(
          "customer_id",
        ).eq("id", taskId).single();
        customerId = task?.customer_id;
      }

      const { error } = await supabase.from("proposals").insert({
        org_id: currProfile.org_id,
        task_id: taskId,
        customer_id: customerId ||
          (currProfile.role === UserRole.CUSTOMER ? currProfile.id : null),
        description: proposal.description,
        price: proposal.price || null,
        status: proposal.status || "PENDING_MANAGER",
        created_by: currProfile.id,
        photo_url: proposal.photo_url || null,
        audio_url: proposal.audio_url || null,
      });
      if (error) throw error;
      toast.success("הבקשה נשלחה בהצלחה");
      refreshData();
    } catch (e) {
      console.error("Add proposal failed:", e);
      toast.error("נכשל בשליחת הבקשה");
    }
  }, [refreshData]);

  const updateProposal = useCallback(
    async (taskId: string, proposalId: string, data: any) => {
      try {
        const { error } = await supabase
          .from("proposals")
          .update(data)
          .eq("id", proposalId);

        if (error) throw error;
        toast.success("ההצעה עודכנה");

        // Notify if status changed to PENDING_CUSTOMER (Sent to customer)
        if (data.status === "PENDING_CUSTOMER") {
          // Fetch task directly to get customer ID since we might not have it in the partial data
          const { data: task } = await supabase.from("tasks").select(
            "customer_id, title",
          ).eq("id", taskId).single();
          if (task?.customer_id) {
            await sendSystemNotification(
              task.customer_id,
              "הצעת תיקון חדשה 🛠️",
              `המוסך שלח הצעת מחיר לתיקון נוסף עבור ${task.title}. אנא אשר או דחה.`,
              "PROPOSAL_RECEIVED",
              taskId,
            );
          }
        }

        // Notify if customer Approved/Rejected (Sent to Staff/Admin)
        if (data.status === "APPROVED" || data.status === "REJECTED") {
          const { data: task } = await supabase.from("tasks").select(
            "org_id, title, assigned_to, price",
          ).eq("id", taskId).single();

          if (task) {
            // Update total task price if approved
            if (data.status === "APPROVED") {
              const { data: proposal } = await supabase.from("proposals")
                .select("price").eq("id", proposalId).single();
              if (proposal?.price) {
                const newPrice = (task.price || 0) + proposal.price;
                await supabase.from("tasks").update({ price: newPrice }).eq(
                  "id",
                  taskId,
                );
              }
            }

            // Notify admins AND assigned staff
            const recipients = new Set<string>();
            const { data: admins } = await supabase
              .from("profiles")
              .select("id")
              .eq("org_id", task.org_id)
              .eq("role", UserRole.SUPER_MANAGER);

            if (admins) admins.forEach((a) => recipients.add(a.id));
            if (task.assigned_to) {
              task.assigned_to.forEach((id: string) => recipients.add(id));
            }

            const titleText = data.status === "APPROVED"
              ? "תיקון אושר! Proceed with work ✅"
              : "הצעה נדחתה ❌";
            const msgText = data.status === "APPROVED"
              ? `הלקוח אישר את התיקון הנוסף עבור: ${task.title}`
              : `הלקוח דחה את התיקון הנוסף עבור: ${task.title}`;

            for (const recipientId of Array.from(recipients)) {
              await sendSystemNotification(
                recipientId,
                titleText,
                msgText,
                "PROPOSAL_UPDATE",
                taskId,
              );
            }
          }
        }

        refreshData();
      } catch (e) {
        console.error("Update proposal failed:", e);
        toast.error("נכשל בעדכון ההצעה");
      }
    },
    [refreshData, sendSystemNotification],
  );

  const submitCheckIn = useCallback(async (data: PreCheckInData) => {
    const currProfile = profileRef.current;
    if (!currProfile?.id) return;

    // Ensure we have an org_id (either from profile or fallback to a default if user is just joining)
    const orgId = currProfile.org_id;
    if (!orgId) {
      console.error("No organization ID found for user");
      return;
    }

    const { data: v } = await supabase.from("vehicles").select("id").eq(
      "plate",
      data.vehiclePlate,
    ).eq("org_id", orgId).single();
    if (!v) {
      console.error("Vehicle not found for plate:", data.vehiclePlate);
      return;
    }

    const isAppointment = !!data.appointmentDate;
    const { error } = await supabase.from("appointments").insert({
      org_id: orgId,
      vehicle_id: v.id,
      customer_id: currProfile.id,
      service_type: data.serviceTypes?.join(", ") || "General",
      description: data.faultDescription,
      appointment_date: data.appointmentDate ||
        new Date().toISOString().split("T")[0],
      appointment_time: data.appointmentTime ||
        new Date().toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      mileage: data.currentMileage ? parseInt(data.currentMileage) : null,
      status: AppointmentStatus.PENDING,
      metadata: {
        customerPhone: data.ownerPhone,
        customerEmail: data.ownerEmail,
        customerAddress: data.ownerAddress,
        paymentMethod: data.paymentMethod,
        submittedAt: Date.now(),
      },
    });

    if (error) {
      console.error("Submit Appointment/Check-In failed:", error);
      toast.error("נכשל בשליחת הבקשה");
      throw error;
    }

    toast.success(isAppointment ? "התור נקבע בהצלחה" : "הצ׳ק-אין בוצע בהצלחה");

    // Notify admins about new request
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("org_id", orgId)
      .eq("role", UserRole.SUPER_MANAGER); // Only super managers get notifications

    if (admins) {
      for (const admin of admins) {
        await sendSystemNotification(
          admin.id,
          "בקשת טיפול חדשה 📝",
          `התקבלה בקשה חדשה מ${currProfile.full_name || "לקוח"}`,
          "NEW_CHECKIN",
          undefined,
        );
      }
    }

    await refreshData();
  }, [refreshData, sendSystemNotification]);

  const approveTask = useCallback(
    async (
      taskId: string,
      sendToTeamNow: boolean,
      reminderAt?: string | null,
    ) => {
      const currProfile = profileRef.current;
      if (!currProfile) return;

      try {
        const newStatus = sendToTeamNow
          ? TaskStatus.WAITING
          : TaskStatus.SCHEDULED;
        const { data: taskData } = await supabase.from("tasks").select(
          "customer_id, title",
        ).eq("id", taskId).single();

        const { error } = await supabase.from("tasks").update({
          status: newStatus,
          scheduled_reminder_at: reminderAt,
        }).eq("id", taskId);

        if (error) throw error;

        // Notify customer
        if (taskData?.customer_id) {
          await sendSystemNotification(
            taskData.customer_id,
            "הטיפול אושר! ✅",
            `הבקשה שלך ל"${taskData.title}" אושרה. ${
              sendToTeamNow ? "אנחנו מחכים לך." : "נקבע לך תור."
            }`,
            "TASK_APPROVED",
            taskId,
          );
        }

        toast.success("המשימה אושרה");
        await refreshData();
      } catch (e) {
        console.error("Approve task failed:", e);
        toast.error("נכשל באישור המשימה");
        throw e;
      }
    },
    [refreshData, sendSystemNotification],
  );

  const approveAppointment = useCallback(
    async (appointmentId: string, createTaskNow: boolean) => {
      const currProfile = profileRef.current;
      if (!currProfile) return;

      try {
        // 1. Fetch appointment details with customer and vehicle data
        const { data: appt, error: apptError } = await supabase
          .from("appointments")
          .select("*, customer:profiles(*), vehicle:vehicles(*)")
          .eq("id", appointmentId)
          .single();

        if (apptError || !appt) {
          throw apptError || new Error("Appointment not found");
        }

        const today = new Date().toISOString().split("T")[0];
        const isToday = appt.appointment_date === today;

        // 2. Determine new status
        const newStatus = isToday
          ? AppointmentStatus.APPROVED
          : AppointmentStatus.SCHEDULED;

        let createdTaskId: string | null = null;

        // 3. Create Task if requested (user chose to open task now)
        if (createTaskNow) {
          const { data: newTask, error: taskError } = await supabase
            .from("tasks")
            .insert({
              org_id: appt.org_id,
              vehicle_id: appt.vehicle_id,
              customer_id: appt.customer_id,
              created_by: currProfile.id,
              title: `טיפול: ${appt.service_type}`,
              description: appt.description,
              status: TaskStatus.WAITING,
              priority: "NORMAL",
              metadata: {
                appointment_id: appt.id,
                appointmentDate: appt.appointment_date,
                appointmentTime: appt.appointment_time,
                mileage: appt.mileage,
                // Auto-map customer profile data to task metadata
                customerPhone: appt.customer?.phone ||
                  appt.customer_phone ||
                  appt.metadata?.customerPhone,
                customerEmail: appt.customer_email ||
                  appt.metadata?.customerEmail,
                customerAddress: appt.customer?.metadata?.address ||
                  appt.customer_address ||
                  appt.metadata?.customerAddress,
                customerName: appt.customer?.full_name || appt.customer_name,
                source: "APPOINTMENT",
              },
            })
            .select()
            .single();

          if (taskError) throw taskError;
          createdTaskId = newTask?.id || null;
        }

        // 4. Update appointment with new status and task_id linkage
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            status: newStatus,
            task_id: createdTaskId, // Link the created task
          })
          .eq("id", appointmentId);

        if (updateError) throw updateError;

        // 5. Notify customer about approval
        if (appt.customer_id) {
          await sendSystemNotification(
            appt.customer_id,
            isToday ? "התור שלך אושר! ✅" : "התור שלך נקבע! 📅",
            isToday
              ? `הבקשה שלך ל"${appt.service_type}" אושרה. אנחנו מחכים לך היום בשעה ${appt.appointment_time}.`
              : `נקבע לך תור למועד: ${appt.appointment_date} בשעה ${appt.appointment_time}.`,
            "APPOINTMENT_APPROVED",
            appt.id,
          );
        }

        const successMessage = createTaskNow
          ? "התור אושר ומשימה נפתחה לצוות"
          : isToday
          ? "התור אושר"
          : "התור תוזמן בהצלחה";

        toast.success(successMessage);
        await refreshData();
      } catch (e: any) {
        console.error("Approve appointment failed:", e);
        toast.error("נכשל באישור התור: " + e.message);
        throw e;
      }
    },
    [refreshData, sendSystemNotification],
  );

  const updateOrganization = useCallback(async (updates: any) => {
    const currProfile = profileRef.current;
    const { refreshProfile } = useAuth(); // Note: This might cause hook rules warning if not handled, better pass it or use a callback
    if (!currProfile?.org_id) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", currProfile.org_id);

      if (error) throw error;
      toast.success("פרטי המוסך עודכנו בהצלחה");
      // Hard refresh profile to update global organization state
      window.location.reload();
    } catch (e) {
      console.error("Update organization failed:", e);
      toast.error("נכשל בעדכון פרטי המוסך");
      throw e;
    }
  }, []);

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      try {
        const { data: updatedData, error } = await supabase.from("tasks")
          .update(updates).eq("id", taskId).select();
        if (error) {
          throw error;
        }
        if (!updatedData || updatedData.length === 0) {
          throw new Error(
            "Permission denied: Unable to update task.",
          );
        }
        await refreshData();
      } catch (e) {
        console.error("Update task failed:", e);
        throw e;
      }
    },
    [refreshData],
  );

  const markNotificationRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setDataState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const currProfile = profileRef.current;
    if (!currProfile) return;
    try {
      const { error } = await supabase.from("notifications").update({
        is_read: true,
      }).eq("user_id", currProfile.id).eq("is_read", false);
      if (error) throw error;
      setDataState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    const currProfile = profileRef.current;
    if (!currProfile?.org_id) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("org_id", currProfile.org_id)
      .in("role", ["STAFF", "SUPER_MANAGER"])
      .eq("membership_status", "APPROVED");

    if (error) {
      console.error("[DataContext] fetchTeamMembers failed:", error);
      return [];
    }
    return data || [];
  }, []);

  const notifyMultiple = useCallback(
    async (
      userIds: string[],
      title: string,
      message: string,
      type: string,
      referenceId?: string,
    ) => {
      const currProfile = profileRef.current;
      if (!currProfile?.org_id || userIds.length === 0) return;

      const notifications = userIds.map((uid) => ({
        org_id: currProfile.org_id,
        user_id: uid,
        actor_id: currProfile.id,
        title,
        message,
        type,
        reference_id: referenceId,
      }));

      await supabase.from("notifications").insert(notifications);
    },
    [],
  );

  const lookupCustomerByPhone = useCallback(async (phone: string) => {
    if (!phone) return null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) return null;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", profileData.id);

      if (vehiclesError) throw vehiclesError;

      return {
        customer: profileData,
        vehicles: vehiclesData || [],
      };
    } catch (e) {
      console.error("[DataContext] lookupCustomerByPhone failed:", e);
      return null;
    }
  }, []);

  const promoteToAdmin = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: UserRole.SUPER_MANAGER })
        .eq("id", userId);
      if (error) throw error;
      toast.success("Staff promoted to Admin successfully");
      refreshData();
    } catch (e) {
      console.error("Promotion failed:", e);
      toast.error("Failed to promote user");
    }
  }, [refreshData]);

  const sendMessage = useCallback(
    async (taskId: string, content: string, isInternal: boolean = false) => {
      const currProfile = profileRef.current;
      if (!currProfile?.org_id) return;

      try {
        const { data: currentTask } = await supabase
          .from("tasks")
          .select("customer_id")
          .eq("id", taskId)
          .single();

        const { error } = await supabase.from("task_messages").insert({
          task_id: taskId,
          org_id: currProfile.org_id,
          sender_id: currProfile.id,
          content,
          is_internal: isInternal,
        });

        if (error) throw error;

        // Notify the other side
        if (currProfile.role === UserRole.CUSTOMER) {
          // Notify managers/staff
          const { data: staff } = await supabase
            .from("profiles")
            .select("id")
            .eq("org_id", currProfile.org_id)
            .in("role", [UserRole.SUPER_MANAGER, UserRole.STAFF]);

          if (staff) {
            staff.map((s) =>
              sendSystemNotification(
                s.id,
                "הודעה חדשה מהלקוח 💬",
                content.substring(0, 50) + (content.length > 50 ? "..." : ""),
                "CHAT_MESSAGE",
                taskId,
              )
            );
          }
        } else {
          // Notify customer
          if (currentTask?.customer_id) {
            sendSystemNotification(
              currentTask.customer_id,
              "הודעה חדשה מהמוסך 💬",
              content.substring(0, 50) + (content.length > 50 ? "..." : ""),
              "CHAT_MESSAGE",
              taskId,
            );
          }
        }
      } catch (e) {
        console.error("Failed to send message:", e);
        toast.error("שליחת הודעה נכשלה");
      }
    },
    [sendSystemNotification],
  );

  const getTaskMessages = useCallback(async (taskId: string) => {
    const { data, error } = await supabase
      .from("task_messages")
      .select("*, sender:profiles(id, full_name, role, avatar_url)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch messages:", error);
      return [];
    }
    return data;
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
    updateOrganization,
    approveTask,
    approveAppointment,
    markNotificationRead,
    markAllNotificationsRead,
    promoteToAdmin,
    sendMessage,
    getTaskMessages,
    lookupCustomerByPhone,
    fetchTeamMembers,
    notifyMultiple,
    sendSystemNotification,
    loadMoreTasks,
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
    updateOrganization,
    approveTask,
    approveAppointment,
    markNotificationRead,
    markAllNotificationsRead,
    lookupCustomerByPhone,
    sendSystemNotification,
    loadMoreTasks,
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
