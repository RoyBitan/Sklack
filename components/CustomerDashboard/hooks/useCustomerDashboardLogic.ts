import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { supabase } from "../../lib/supabase";
import {
  MembershipStatus,
  PreCheckInData,
  ProposalStatus,
  Task,
  TaskStatus,
  Vehicle,
} from "../../types";
import {
  compressImage,
  deleteAsset,
  uploadAsset,
} from "../../utils/assetUtils";
import {
  cleanLicensePlate,
  formatLicensePlate,
  sanitize,
} from "../../utils/formatters";
import { isValidPhone, normalizePhone } from "../../utils/phoneUtils";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "../../utils/vehicleApi";
import { playClickSound, scrollToFormStart } from "../../utils/uiUtils";

export const useCustomerDashboardLogic = () => {
  const { user, t, navigateTo } = useApp();
  const { profile, user: authUser, refreshProfile } = useAuth();
  const {
    tasks,
    loading,
    deleteTask,
    refreshData,
    updateTask,
    submitCheckIn,
    hasMoreTasks,
    loadMoreTasks,
    vehicles,
    updateTaskStatus,
    updateProposal,
    addProposal,
    updateUser,
    addVehicle,
    removeVehicle,
  } = useData();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState<string | null>(null);
  const [requestText, setRequestText] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [requestPhoto, setRequestPhoto] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  // Vehicle Modal State
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);
  const [showVehicleSelect, setShowVehicleSelect] = useState(false);
  const [garagePhone, setGaragePhone] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    plate: "",
    model: "",
    year: "",
    color: "",
    vin: "",
    fuel_type: "",
    engine_model: "",
    registration_valid_until: "",
    kodanit: "",
  });

  // Check-In / Appointment Form State
  const [showCheckIn, setShowCheckIn] = useState<Vehicle | null>(null);
  const [checkInForm, setCheckInForm] = useState<Partial<PreCheckInData>>({
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    ownerAddress: "",
    currentMileage: "",
    serviceTypes: [],
    faultDescription: "",
    paymentMethod: "CREDIT_CARD",
    appointmentDate: "",
    appointmentTime: "",
  });

  const checkInRef = useRef<HTMLDivElement>(null);
  const addVehicleRef = useRef<HTMLDivElement>(null);
  const checkInScrollRef = useRef<HTMLDivElement>(null);
  const addVehicleScrollRef = useRef<HTMLDivElement>(null);

  // Fetch Garage Phone & Redirect Logic
  useEffect(() => {
    if (!user) return;

    const fetchPhone = async () => {
      if (profile?.org_id) {
        const { data } = await supabase
          .from("profiles")
          .select("phone")
          .eq("org_id", profile.org_id)
          .eq("role", "SUPER_MANAGER")
          .limit(1)
          .single();
        if (data?.phone) setGaragePhone(data.phone);
      }
    };
    fetchPhone();
  }, [profile?.org_id, user]);

  // Auto-fill form when vehicle is selected (only if NOT editing)
  useEffect(() => {
    if (showCheckIn && user && !editingTaskId) {
      setCheckInForm({
        ownerName: user.full_name || "",
        ownerPhone: user.phone || "",
        ownerEmail: authUser?.email || "",
        ownerAddress: user.address || "",
        currentMileage: "",
        serviceTypes: [],
        faultDescription: "",
        paymentMethod: "CREDIT_CARD",
        appointmentDate: "",
        appointmentTime: "",
        vehicleModel: showCheckIn.model,
        vehicleYear: showCheckIn.year || "",
        vehicleColor: showCheckIn.color || "",
      });

      scrollToFormStart(checkInScrollRef);
    }
  }, [showCheckIn, user, authUser, editingTaskId]);

  useEffect(() => {
    if (showAddVehicle) {
      scrollToFormStart(addVehicleScrollRef);
    }
  }, [showAddVehicle]);

  // Derived State - Memoized for performance
  const myTasks = useMemo(() => tasks, [tasks]);
  const myVehicles = useMemo(() => vehicles, [vehicles]);

  const activeTasks = useMemo(
    () => myTasks.filter((t) => t.status !== TaskStatus.COMPLETED),
    [myTasks],
  );

  const completedTasks = useMemo(
    () => myTasks.filter((t) => t.status === TaskStatus.COMPLETED),
    [myTasks],
  );

  // Handlers
  const handleDisconnect = async () => {
    if (
      confirm(
        "האם אתה בטוח שברצונך להתנתק מהמוסך הנוכחי? הקשר שלך למוסך יבוטל ותצטרך להצטרף מחדש.",
      )
    ) {
      try {
        await updateUser(user!.id, {
          org_id: null,
          membership_status: MembershipStatus.PENDING,
        });
        window.location.href = "/";
      } catch (e) {
        console.error(e);
        toast.error("שגיאה בתהליך ההתנתקות. נסה שנית.");
      }
    }
  };

  const handlePay = (taskId: string) => {
    setProcessingId(taskId);
    setTimeout(() => {
      setProcessingId(null);
      updateTaskStatus(taskId, TaskStatus.COMPLETED);
      toast.success(t("paymentSuccessful"));
    }, 1500);
  };

  const handleProposalResponse = (
    taskId: string,
    proposalId: string,
    accepted: boolean,
  ) => {
    updateProposal(taskId, proposalId, {
      status: accepted ? ProposalStatus.APPROVED : ProposalStatus.REJECTED,
    });
  };

  const submitCustomerRequest = async (taskId: string, photoFile?: File) => {
    if (!requestText) return;

    try {
      setIsSubmitting(true);
      let photoUrl = null;
      if (photoFile) {
        const compressed = await compressImage(photoFile, 1200, 1200, 0.6);
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        const filePath = `tasks/${taskId}/request-${Date.now()}.${fileExt}`;
        photoUrl = await uploadAsset(compressed, "tasks", filePath);
      }

      await addProposal(taskId, {
        description: requestText,
        photo_url: photoUrl,
      });

      setShowRequestForm(null);
      setRequestText("");
      setCapturedImage(null);
    } catch (err) {
      console.error("Request submission failed:", err);
      toast.error("שליחת הבקשה נכשלה");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocUpload = async (type: string, file: File) => {
    if (!user?.id) return;

    if (file.size === 0) {
      toast.error("הקובץ ריק או שאינו זמין");
      return;
    }

    try {
      setUploadingDoc(type);
      setUploadProgress((prev) => ({ ...prev, [type]: 0 }));

      let fileToUpload: File | Blob = file;
      const fileExt = file.name
        ? file.name.split(".").pop()?.toLowerCase() || "jpg"
        : "jpg";

      const oldDocUrl = profile?.documents?.[type];
      if (oldDocUrl) {
        await deleteAsset("documents", oldDocUrl);
      }

      if (file.type.startsWith("image/")) {
        try {
          fileToUpload = await compressImage(file, 1600, 1600, 0.75);
        } catch (compressErr) {
          console.error("Compression failed, using original:", compressErr);
        }
      }

      const filePath = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      const publicUrl = await uploadAsset(
        fileToUpload,
        "documents",
        filePath,
        (percent) => {
          setUploadProgress((prev) => ({ ...prev, [type]: percent }));
        },
      );

      const { data: fetchResult } = await supabase
        .from("profiles")
        .select("documents")
        .eq("id", user.id)
        .single();

      const latestDocs = fetchResult?.documents || profile?.documents || {};
      const updatedDocs = { ...latestDocs, [type]: publicUrl };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ documents: updatedDocs })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("המסמך הועלה בהצלחה");
      if (refreshProfile) await refreshProfile();
    } catch (error) {
      console.error("CRITICAL FAILURE:", error);
      const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
      toast.error(`שגיאה בהעלאת המסמך: ${message}`);
    } finally {
      setUploadingDoc(null);
      setTimeout(() => {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
      }, 1500);
    }
  };

  const handleDocDelete = async (type: string) => {
    if (!user?.id || !confirm("האם אתה בטוח שברצונך למחוק את המסמך?")) return;

    try {
      setIsSubmitting(true);
      const { data: fetchResult } = await supabase
        .from("profiles")
        .select("documents")
        .eq("id", user.id)
        .single();

      const latestDocs = fetchResult?.documents || profile?.documents || {};
      const docUrl = latestDocs[type];

      if (docUrl) {
        await deleteAsset("documents", docUrl);
      }

      const updatedDocs = { ...latestDocs };
      delete updatedDocs[type];

      const { error } = await supabase
        .from("profiles")
        .update({ documents: updatedDocs })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("המסמך נמחק בהצלחה");
      if (refreshProfile) await refreshProfile();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("מחיקת המסמך נכשלה");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate || !newVehicle.model) {
      toast.error(
        "אנא הזן מספר רישוי ולחץ על כפתור הקסם כדי לטעון את פרטי הרכב לפני השמירה",
      );
      return;
    }

    const cleanedPlate = cleanLicensePlate(newVehicle.plate);
    if (cleanedPlate.length < 7) {
      toast.error("מספר רישוי לא תקין (דרושות 7-8 ספרות)");
      return;
    }

    const formatForDb = (dateStr?: string) => {
      if (!dateStr) return null;
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    try {
      const vehicleData: Partial<Vehicle> = {
        ...newVehicle,
        plate: cleanedPlate,
        registration_valid_until: formatForDb(
          newVehicle.registration_valid_until,
        ),
      };

      await addVehicle(vehicleData);

      setNewVehicle({
        plate: "",
        model: "",
        year: "",
        color: "",
        vin: "",
        fuel_type: "",
        engine_model: "",
        registration_valid_until: "",
        kodanit: "",
      });
      setShowAddVehicle(false);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("שגיאה בשמירת הרכב. אנא בדוק את הנתונים ונסה שנית.");
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckIn || isSubmitting) return;

    setIsSubmitting(true);

    const normalized = normalizePhone(checkInForm.ownerPhone);
    if (!isValidPhone(normalized)) {
      toast.error("מספר טלפון לא תקין (דרושות 10 ספרות)");
      setIsSubmitting(false);
      return;
    }

    if (!checkInForm.ownerName?.trim()) {
      toast.error("נא להזין שם מלא");
      setIsSubmitting(false);
      return;
    }

    try {
      const fullData: PreCheckInData = {
        ...checkInForm,
        ownerName: sanitize(checkInForm.ownerName || ""),
        ownerPhone: normalizePhone(checkInForm.ownerPhone || ""),
        faultDescription: sanitize(checkInForm.faultDescription || ""),
        vehiclePlate: showCheckIn.plate,
        vehicleModel: showCheckIn.model,
        vehicleYear: showCheckIn.year || "",
        vehicleColor: showCheckIn.color || "",
        submittedAt: Date.now(),
        hasInsurance: true,
      } as PreCheckInData;

      if (editingTaskId) {
        const isAppointment = !!fullData.appointmentDate;
        const title = isAppointment
          ? `Appointment Request: ${
            fullData.serviceTypes?.join(", ") || "General"
          }`
          : `Check-In: ${fullData.faultDescription || "General Checkup"}`;

        await updateTask(editingTaskId, {
          title: title,
          description: fullData.faultDescription || null,
          metadata: {
            ...fullData,
            type: isAppointment ? "APPOINTMENT_REQUEST" : "CHECK_IN",
            paymentMethod: fullData.paymentMethod,
          },
        });
        setEditingTaskId(null);
      } else {
        await submitCheckIn(fullData);
      }

      setShowCheckIn(null);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
      await refreshData();
    } catch (err) {
      console.error("Submit failed:", err);
      toast.error("פעולה נכשלה. אנא נסה שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = (task: Task) => {
    if (task.metadata) {
      setCheckInForm({
        ...checkInForm,
        ...task.metadata,
      });
    }
    setEditingTaskId(task.id);
    setShowCheckIn(task.vehicle || null);
  };

  return {
    // State
    user,
    profile,
    loading,
    t,
    processingId,
    setProcessingId,
    editingTaskId,
    setEditingTaskId,
    isSubmitting,
    setIsSubmitting,
    showRequestForm,
    setShowRequestForm,
    requestText,
    setRequestText,
    capturedImage,
    setCapturedImage,
    requestPhoto,
    setRequestPhoto,
    uploadingDoc,
    setUploadingDoc,
    uploadProgress,
    setUploadProgress,
    showAddVehicle,
    setShowAddVehicle,
    loadingApi,
    setLoadingApi,
    showVehicleSelect,
    setShowVehicleSelect,
    garagePhone,
    showSuccessModal,
    setShowSuccessModal,
    activeTab,
    setActiveTab,
    newVehicle,
    setNewVehicle,
    showCheckIn,
    setShowCheckIn,
    checkInForm,
    setCheckInForm,

    // Refs
    checkInRef,
    addVehicleRef,
    checkInScrollRef,
    addVehicleScrollRef,

    // Data
    myTasks,
    myVehicles,
    activeTasks,
    completedTasks,
    hasMoreTasks,

    // Actions
    navigateTo,
    loadMoreTasks,
    deleteTask,
    removeVehicle,
    handleDisconnect,
    handlePay,
    handleProposalResponse,
    submitCustomerRequest,
    handleDocUpload,
    handleDocDelete,
    handleAddVehicleSubmit,
    handleCheckInSubmit,
    handleEditTask,
  };
};
