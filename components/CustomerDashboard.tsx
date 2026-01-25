import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  MembershipStatus,
  PreCheckInData,
  ProposalStatus,
  Task,
  TaskStatus,
  UserRole,
  Vehicle,
} from "../types";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Link,
  LogOut,
  Mail,
  MapPin,
  Mic,
  Phone,
  Plus,
  PlusCircle,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Square,
  Star,
  Trash2,
  Upload,
  UserCircle2,
  UserMinus,
  X,
} from "lucide-react";
import {
  cleanLicensePlate,
  formatLicensePlate,
  sanitize,
} from "../utils/formatters";
import { compressImage, deleteAsset, uploadAsset } from "../utils/assetUtils";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "../utils/vehicleApi";
import { isValidPhone, normalizePhone } from "../utils/phoneUtils";
import LoadingSpinner from "./LoadingSpinner";
import { toast } from "sonner";

import VehicleCard from "./VehicleCard";
import CustomerTaskCard from "./CustomerTaskCard";

const CustomerDashboard: React.FC = () => {
  const { user, t, navigateTo } = useApp();
  const { profile, user: authUser, refreshProfile } = useAuth();
  const {
    tasks,
    loading,
    deleteTask,
    refreshData,
    approveTask,
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
  const [isRecording, setIsRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
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

  // Fetch Garage Phone & Redirect Logic
  React.useEffect(() => {
    if (!user) return;

    // Redirect if not connected (optional guard, user might be on onboarding)
    if (!profile?.org_id) {
      // We won't force redirect here to avoid loops if they are just browsing,
      // but we will show the "Connect" button prominently.
    }

    const fetchPhone = async () => {
      if (profile?.org_id) {
        // Try to find a manager for this org
        const { data } = await supabase
          .from("profiles")
          .select("phone")
          .eq("org_id", profile.org_id)
          .eq("role", "SUPER_MANAGER") // Only super managers
          .limit(1)
          .single();
        if (data?.phone) setGaragePhone(data.phone);
      }
    };
    fetchPhone();
  }, [profile?.org_id, user]);

  // Auto-fill form when vehicle is selected (only if NOT editing)
  React.useEffect(() => {
    if (showCheckIn && user && !editingTaskId) {
      setCheckInForm({
        ownerName: user.full_name || "",
        ownerPhone: user.phone || "",
        ownerEmail: authUser?.email || "", // Auto-fill email from auth user
        ownerAddress: user.address || "", // Auto-fill address
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
    }
  }, [showCheckIn, user, authUser, editingTaskId]);

  if (loading || !user) {
    return <LoadingSpinner message="טוען לוח בקרה..." />;
  }

  // RLS ensures 'tasks' only contains records relevant to this customer (own tasks or vehicle tasks)
  const myTasks = tasks;
  // Use vehicles from DataContext which is refreshed after addVehicle
  const myVehicles = vehicles;

  const handleDisconnect = async () => {
    if (
      confirm(
        "האם אתה בטוח שברצונך להתנתק מהמוסך הנוכחי? הקשר שלך למוסך יבוטל ותצטרך להצטרף מחדש.",
      )
    ) {
      try {
        // Clear org_id and status to sever the link
        await updateUser(user.id, {
          org_id: null,
          membership_status: MembershipStatus.PENDING,
        });
        // Redirect to root/onboarding
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

    // Debugging info for physical device remote debugging
    console.log(`[DocUpload] Starting upload for ${type}:`, {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });

    if (file.size === 0) {
      toast.error("הקובץ ריק או שאינו זמין");
      return;
    }

    try {
      setUploadingDoc(type);
      setUploadProgress((prev) => ({ ...prev, [type]: 0 }));

      // Manage simulation while processing starts
      const startTime = Date.now();
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          const curr = prev[type] || 0;
          if (curr >= 80) return prev; // Limit simulation to 80%
          return { ...prev, [type]: curr + 5 };
        });
      }, 100);

      // 1. Prepare File
      let fileToUpload: File | Blob = file;
      const fileExt = file.name
        ? file.name.split(".").pop()?.toLowerCase() || "jpg"
        : "jpg";

      // If it's an image, process it (on mobile, this is often where it fails if memory isn't handled)
      if (file.type.startsWith("image/")) {
        console.log("[DocUpload] Compressing image...");
        try {
          fileToUpload = await compressImage(file, 1600, 1600, 0.75);
          console.log("[DocUpload] Compression successful", {
            size: `${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`,
          });
        } catch (compressErr) {
          console.error(
            "[DocUpload] Compression failed, using original:",
            compressErr,
          );
          // Fallback to original if compression fails
        }
      }

      const filePath = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      // 2. Upload to Storage
      console.log("[DocUpload] Initializing storage upload...");
      const publicUrl = await uploadAsset(fileToUpload, "documents", filePath);
      console.log("[DocUpload] Storage upload successful:", publicUrl);

      clearInterval(interval);
      setUploadProgress((prev) => ({ ...prev, [type]: 100 }));

      // 3. Update Database direct - Fetch latest to avoid overwriting other slots
      console.log("[DocUpload] Updating database record...");
      const { data: fetchResult, error: fetchError } = await supabase
        .from("profiles")
        .select("documents")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        console.warn(
          "[DocUpload] Profile fetch failed, using state:",
          fetchError,
        );
      }

      const latestDocs = fetchResult?.documents || profile?.documents || {};
      const updatedDocs = { ...latestDocs, [type]: publicUrl };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ documents: updatedDocs })
        .eq("id", user.id);

      if (updateError) {
        console.error("[DocUpload] Database update failed:", updateError);
        throw updateError;
      }

      // 4. Success & Refresh
      toast.success("המסמך הועלה בהצלחה");
      if (refreshProfile) await refreshProfile();
    } catch (error: any) {
      console.error("[DocUpload] CRITICAL FAILURE:", error);
      toast.error(`שגיאה בהעלאת המסמך: ${error.message || "שגיאה לא ידועה"}`);
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

      // 1. Get current docs - Fetch latest to avoid overwriting other slots
      const { data: fetchResult, error: fetchError } = await supabase
        .from("profiles")
        .select("documents")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        console.warn(
          "Could not fetch latest docs for delete, falling back to local state",
          fetchError,
        );
      }

      const latestDocs = fetchResult?.documents || profile?.documents || {};
      const docUrl = latestDocs[type];

      // 2. Permanent Deletion from Cloud Storage
      if (docUrl) {
        await deleteAsset("documents", docUrl);
      }

      // 3. Update Database
      const updatedDocs = { ...latestDocs };
      delete updatedDocs[type]; // Completely remove the key

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

    // Convert DD/MM/YYYY to YYYY-MM-DD for Supabase DATE column
    const formatForDb = (dateStr?: string) => {
      if (!dateStr) return null;
      // Check if it matches DD/MM/YYYY
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      return dateStr; // Fallback (might already be ISO or empty)
    };

    try {
      // Pre-check for duplicate vehicle
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", cleanedPlate)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (existingVehicle) {
        toast.error("הרכב כבר קיים במערכת");
        return;
      }

      const { error } = await supabase.from("vehicles").insert({
        org_id: profile.org_id,
        owner_id: user?.id,
        owner_name: sanitize(user?.full_name),
        plate: cleanedPlate,
        model: sanitize(newVehicle.model),
        year: sanitize(newVehicle.year),
        color: sanitize(newVehicle.color),
        vin: sanitize(newVehicle.vin),
        fuel_type: sanitize(newVehicle.fuel_type),
        engine_model: sanitize(newVehicle.engine_model),
        registration_valid_until: formatForDb(
          newVehicle.registration_valid_until,
        ),
        kodanit: sanitize(newVehicle.kodanit),
      });

      if (error) {
        if (
          error.code === "23505" || error.message.includes("unique constraint")
        ) {
          toast.error("הרכב כבר קיים במערכת");
          return;
        }
        throw error;
      }
      await refreshData();
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

    // Validation
    const normalizedPhone = normalizePhone(checkInForm.ownerPhone);
    if (!isValidPhone(normalizedPhone)) {
      toast.error("מספר טלפון לא תקין (דרושות 10 ספרות)");
      setIsSubmitting(false);
      return;
    }

    if (!checkInForm.ownerName.trim()) {
      toast.error("נא להזין שם מלא");
      setIsSubmitting(false);
      return;
    }

    try {
      const fullData: PreCheckInData = {
        ...checkInForm,
        ownerName: sanitize(checkInForm.ownerName),
        ownerPhone: normalizePhone(checkInForm.ownerPhone),
        faultDescription: sanitize(checkInForm.faultDescription),
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
    // Prepare form data from task metadata
    if (task.metadata) {
      setCheckInForm({
        ...checkInForm, // keep stable defaults
        ...task.metadata,
      });
    }
    setEditingTaskId(task.id);
    setShowCheckIn(task.vehicle || null);
  };

  return (
    <div className="pb-24 space-y-8 animate-fade-in">
      {/* Personalized Header */}
      <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl">
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              שלום, {user?.full_name?.split?.(" ")?.[0] || "לקוח"}
            </h1>
            <p className="text-gray-400 font-bold max-w-sm leading-relaxed text-base md:text-lg">
              כאן תוכל לנהל את רכביך, לעקוב אחר טיפולים ולבצע צ'ק-אין מהיר.
            </p>
          </div>
          <div className="flex gap-2">
            {profile?.organization?.name && (
              <div className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-xl">
                <Shield className="text-emerald-400" size={28} />
                <div className="text-start">
                  <div className="text-[10px] font-black uppercase text-emerald-300 tracking-widest mb-0.5">
                    מוסך פעיל
                  </div>
                  <div className="font-black text-lg">
                    {profile.organization.name}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleDisconnect}
              title="התנתק מהמוסך"
              className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all text-white shadow-xl"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </div>

      {(!user?.phone || !user?.address) &&
        !localStorage.getItem("dismissedProfileBanner") && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 flex justify-between items-center animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
              <UserCircle2 size={24} />
            </div>
            <div className="text-start">
              <div className="font-black text-gray-900 text-lg">
                הפרופיל שלך לא מלא
              </div>
              <div className="text-sm text-gray-500">
                השלם פרטים אישיים כדי לחסוך זמן בצ'ק-אין
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("dismissedProfileBanner", "true");
              navigateTo("SETTINGS");
            }}
            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-orange-600 transition-all shadow-lg active:scale-95"
          >
            השלם פרטים
          </button>
        </div>
      )}

      {/* MY VEHICLES SECTION - Prominent multiple car support */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="font-black text-2xl text-gray-900 tracking-tight flex items-center gap-3">
            <Car size={26} className="text-blue-600" />
            הרכבים שלי ({myVehicles.length})
          </h3>
          <button
            onClick={() => setShowAddVehicle(true)}
            className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} /> הוסף רכב נוסף
          </button>
        </div>

        {myVehicles.length > 0
          ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myVehicles.map((v) => (
                <VehicleCard
                  key={v.plate}
                  vehicle={v}
                  onDelete={() => {
                    if (
                      confirm(
                        t("deleteVehicleConfirm") ||
                          "Are you sure you want to delete this vehicle?",
                      )
                    ) {
                      removeVehicle(v.plate);
                    }
                  }}
                  onCheckIn={() => setShowCheckIn(v)}
                />
              ))}
            </div>
          )
          : (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center shadow-inner">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
                <Car size={40} />
              </div>
              <p className="text-gray-500 font-black text-lg">
                טרם רשמת רכבים בחשבונך.
              </p>
              <button
                onClick={() => setShowAddVehicle(true)}
                className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm mt-6 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <PlusCircle size={20} /> רשום רכב ראשון
              </button>
            </div>
          )}
      </section>

      {/* ADD VEHICLE MODAL */}
      {showAddVehicle && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white w-[95%] max-w-lg rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-gray-900 text-start">
                <Sparkles className="text-blue-600" size={24} />
                רישום רכב חדש
              </h2>
              <button
                onClick={() => setShowAddVehicle(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <form onSubmit={handleAddVehicleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1 text-start">
                    מספר רישוי
                  </label>
                  <div className="flex gap-2">
                    <input
                      required
                      className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 font-mono text-xl sm:text-2xl tracking-widest text-center focus:bg-white focus:border-black outline-none transition-all shadow-sm"
                      value={newVehicle.plate}
                      onChange={(e) =>
                        setNewVehicle({
                          ...newVehicle,
                          plate: formatLicensePlate(e.target.value),
                        })}
                      placeholder="00-000-00"
                    />
                    <button
                      type="button"
                      disabled={loadingApi}
                      onClick={async () => {
                        const plate = cleanLicensePlate(newVehicle.plate || "");
                        if (!isValidIsraeliPlate(plate)) {
                          return toast.error("מספר לא תקין");
                        }
                        setLoadingApi(true);
                        try {
                          const data = await fetchVehicleDataFromGov(plate);
                          if (data) {
                            const formatDate = (dateStr: string) => {
                              if (!dateStr) return "";
                              const date = new Date(dateStr);
                              if (isNaN(date.getTime())) return dateStr;
                              return date.toLocaleDateString("en-GB");
                            };
                            setNewVehicle({
                              ...newVehicle,
                              model: `${data.make} ${data.model}`,
                              year: data.year || "",
                              color: data.color || "",
                              vin: data.vin || "",
                              fuel_type: data.fuelType || "",
                              engine_model: data.engineModel || "",
                              registration_valid_until: formatDate(
                                data.registrationValidUntil,
                              ),
                            });
                          } else {
                            toast.error(
                              "לא נמצאו נתונים לרכב זה. אנא נסה שנית או הזן ידנית.",
                            );
                          }
                        } catch (e) {
                          toast.error("שגיאה בטעינת נתונים");
                        } finally {
                          setLoadingApi(false);
                        }
                      }}
                      className="bg-black text-white px-5 rounded-2xl hover:bg-gray-800 disabled:bg-gray-400 transition-all flex items-center justify-center shrink-0"
                    >
                      {loadingApi
                        ? <Sparkles size={18} className="animate-spin" />
                        : <Sparkles size={18} />}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                  <div className="text-start">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      יצרן, מודל, שנה
                    </div>
                    {newVehicle.model
                      ? (
                        <div className="text-lg sm:text-xl font-black text-black tracking-tight">
                          {newVehicle.model}{" "}
                          {newVehicle.year ? `(${newVehicle.year})` : ""}
                        </div>
                      )
                      : (
                        <div className="text-gray-400 text-sm italic">
                          לחץ על כפתור הקסם כדי לטעון פרטי רכב...
                        </div>
                      )}
                  </div>
                  <CheckCircle2
                    className={newVehicle.model
                      ? "text-green-500"
                      : "text-gray-200"}
                    size={32}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowVehicleSelect(!showVehicleSelect)}
                  className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <span className="font-black text-xs text-gray-700">
                    פרטים נוספים (קודנית, מנוע ועוד)
                  </span>
                  <ChevronRight
                    className={`transition-transform ${
                      showVehicleSelect ? "rotate-90" : ""
                    }`}
                    size={20}
                  />
                </button>

                {showVehicleSelect && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200 text-start">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">
                        אימובילייזר / קודנית
                      </label>
                      <input
                        className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 font-mono text-center shadow-sm"
                        value={newVehicle.kodanit || ""}
                        onChange={(e) =>
                          setNewVehicle({
                            ...newVehicle,
                            kodanit: e.target.value,
                          })}
                        placeholder="1234"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">
                        צבע חיצוני
                      </label>
                      <input
                        className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 shadow-sm"
                        value={newVehicle.color || ""}
                        onChange={(e) =>
                          setNewVehicle({
                            ...newVehicle,
                            color: e.target.value,
                          })}
                        placeholder="לבן"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">
                        סוג דלק
                      </label>
                      <input
                        className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 shadow-sm"
                        value={newVehicle.fuel_type || ""}
                        onChange={(e) =>
                          setNewVehicle({
                            ...newVehicle,
                            fuel_type: e.target.value,
                          })}
                        placeholder="בנזין / דיזל"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">
                        תוקף טסט
                      </label>
                      <input
                        className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 shadow-sm text-left font-mono"
                        style={{ direction: "ltr" }}
                        value={newVehicle.registration_valid_until || ""}
                        onChange={(e) =>
                          setNewVehicle({
                            ...newVehicle,
                            registration_valid_until: e.target.value,
                          })}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">
                        דגם מנוע
                      </label>
                      <input
                        className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 shadow-sm font-mono text-xs uppercase"
                        value={newVehicle.engine_model || ""}
                        onChange={(e) =>
                          setNewVehicle({
                            ...newVehicle,
                            engine_model: e.target.value,
                          })}
                        placeholder="G4FC"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[10px] font-black text-gray-400 px-1 uppercase tracking-widest">
                        VIN / שלדה
                      </label>
                      <input
                        className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 font-mono text-xs shadow-sm uppercase"
                        value={newVehicle.vin || ""}
                        onChange={(e) =>
                          setNewVehicle({ ...newVehicle, vin: e.target.value })}
                        placeholder="1G1FJ..."
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full h-16 sm:h-20 bg-black text-white py-5 rounded-[2rem] font-black text-lg sm:text-xl shadow-2xl hover:bg-gray-900 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} /> שמור רכב
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* CHECK-IN FORM MODAL */}
      {/* CHECK-IN FORM MODAL */}
      {showCheckIn && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white w-[95%] max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden border-t-[12px] border-blue-600">
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-50 bg-white">
              <div className="text-start">
                <h1 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-gray-900">
                  <Sparkles className="text-blue-600" size={24} />
                  {editingTaskId ? "עריכת פרטי תור" : "צ'ק-אין / הזמנת תור"}
                </h1>
                <p className="text-gray-400 font-bold text-[10px] sm:text-xs mt-1 uppercase tracking-widest">
                  {showCheckIn.model} | {formatLicensePlate(showCheckIn.plate)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCheckIn(null);
                  setEditingTaskId(null);
                }}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <form
                id="check-in-form"
                onSubmit={handleCheckInSubmit}
                className="space-y-8"
              >
                {/* Personal Details Section */}
                <div className="space-y-5">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                    פרטי בעל הרכב
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        required
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                        placeholder="שם מלא"
                        value={checkInForm.ownerName}
                        onChange={(e) =>
                          setCheckInForm({
                            ...checkInForm,
                            ownerName: e.target.value,
                          })}
                      />
                      <UserCircle2
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                    </div>
                    <div className="relative">
                      <input
                        required
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                        placeholder="טלפון"
                        value={checkInForm.ownerPhone}
                        onChange={(e) =>
                          setCheckInForm({
                            ...checkInForm,
                            ownerPhone: e.target.value,
                          })}
                      />
                      <Phone
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                    </div>
                    <div className="relative">
                      <input
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                        placeholder="דואר אלקטרוני"
                        type="email"
                        value={checkInForm.ownerEmail}
                        onChange={(e) =>
                          setCheckInForm({
                            ...checkInForm,
                            ownerEmail: e.target.value,
                          })}
                      />
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"
                        size={20}
                      />
                    </div>
                    <div className="relative">
                      <input
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                        placeholder="כתובת מגורים"
                        value={checkInForm.ownerAddress}
                        onChange={(e) =>
                          setCheckInForm({
                            ...checkInForm,
                            ownerAddress: e.target.value,
                          })}
                      />
                      <MapPin
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        size={20}
                      />
                    </div>
                  </div>
                  {(!checkInForm.ownerName || !checkInForm.ownerPhone) && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl text-[10px] font-bold">
                      <AlertCircle size={14} />
                      <span>
                        חסרים פרטים אישיים. וודא שהם מעודכנים בתיק הלקוח.
                      </span>
                    </div>
                  )}
                </div>

                {/* Vehicle Details Section */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                    קילומטראז' נוכחי
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                      placeholder="הזן קילומטראז'..."
                      value={checkInForm.currentMileage || ""}
                      onChange={(e) =>
                        setCheckInForm({
                          ...checkInForm,
                          currentMileage: e.target.value,
                        })}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">
                      KM
                    </div>
                  </div>
                </div>

                {/* Service Type Selection */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                    סוג שירות מבוקש
                  </div>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
                    <details className="group" open>
                      <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                        <span className="font-bold text-gray-700 text-sm">
                          {(checkInForm.serviceTypes?.length || 0) > 0
                            ? `נבחרו ${checkInForm.serviceTypes?.length} שירותים`
                            : "בחר שירותים לרכב..."}
                        </span>
                        <ChevronDown
                          className="transform transition-transform group-open:rotate-180 text-gray-400"
                          size={20}
                        />
                      </summary>
                      <div className="p-4 bg-white border-t border-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { id: "ROUTINE_SERVICE", label: "טיפול תקופתי" },
                          { id: "DIAGNOSTICS", label: "אבחון תקלה" },
                          { id: "BRAKES", label: "בלמים" },
                          { id: "TIRES", label: "צמיגים / פנצ'ר" },
                          { id: "BATTERY", label: "מצבר / חשמל" },
                          { id: "AIR_CONDITIONING", label: "מיזוג אוויר" },
                          { id: "TEST_PREP", label: "הכנה לטסט" },
                          { id: "OTHER", label: "אחר (פרט למטה)" },
                        ].map((service) => (
                          <label
                            key={service.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              (checkInForm.serviceTypes || []).includes(
                                  service.id,
                                )
                                ? "border-blue-500 bg-blue-50/50 text-blue-700"
                                : "border-transparent bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                (checkInForm.serviceTypes || []).includes(
                                    service.id,
                                  )
                                  ? "border-blue-500 bg-blue-500 text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {(checkInForm.serviceTypes || []).includes(
                                service.id,
                              ) && <Check size={12} strokeWidth={4} />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={(checkInForm.serviceTypes || [])
                                .includes(service.id)}
                              onChange={() => {
                                setCheckInForm((prev) => {
                                  const services =
                                    (prev.serviceTypes || []).includes(
                                        service.id,
                                      )
                                      ? (prev.serviceTypes || []).filter((s) =>
                                        s !== service.id
                                      )
                                      : [
                                        ...(prev.serviceTypes || []),
                                        service.id,
                                      ];
                                  return { ...prev, serviceTypes: services };
                                });
                              }}
                            />
                            <span className="font-black text-[11px]">
                              {service.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>
                  {(checkInForm.serviceTypes || []).includes("OTHER") && (
                    <div className="animate-fade-in">
                      <textarea
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition-all h-24 resize-none"
                        placeholder="פרט את הבעיה או הבקשה..."
                        value={checkInForm.faultDescription || ""}
                        onChange={(e) =>
                          setCheckInForm({
                            ...checkInForm,
                            faultDescription: e.target.value,
                          })}
                      />
                    </div>
                  )}
                </div>

                {/* Schedule Appointment Section */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                    מועד מבוקש (אופציונלי)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 px-2 uppercase tracking-widest">
                        תאריך
                      </label>
                      <input
                        type="date"
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none"
                        value={checkInForm.appointmentDate}
                        onChange={(e) =>
                          setCheckInForm({
                            ...checkInForm,
                            appointmentDate: e.target.value,
                          })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 px-2 uppercase tracking-widest">
                        שעה
                      </label>
                      <input
                        type="time"
                        className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none"
                        value={checkInForm.appointmentTime}
                        onChange={(e) =>
                          setCheckInForm({
                            ...checkInForm,
                            appointmentTime: e.target.value,
                          })}
                      />
                    </div>
                  </div>
                </div>

                {/* Preferred Payment Method */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                    צורת תשלום מועדפת
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCheckInForm({
                          ...checkInForm,
                          paymentMethod: "CREDIT_CARD",
                        })}
                      className={`p-4 rounded-xl border-2 font-black flex flex-col items-center gap-2 transition-all ${
                        checkInForm.paymentMethod === "CREDIT_CARD"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      <CreditCard size={20} />{" "}
                      <span className="text-[10px]">כרטיס אשראי</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCheckInForm({
                          ...checkInForm,
                          paymentMethod: "CASH",
                        })}
                      className={`p-4 rounded-xl border-2 font-black flex flex-col items-center gap-2 transition-all ${
                        checkInForm.paymentMethod === "CASH"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      <DollarSign size={20} />{" "}
                      <span className="text-[10px]">מזומן</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCheckInForm({
                          ...checkInForm,
                          paymentMethod: "OTHER",
                        })}
                      className={`p-4 rounded-xl border-2 font-black flex flex-col items-center gap-2 transition-all ${
                        checkInForm.paymentMethod === "OTHER"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                      } col-span-2 sm:col-span-1`}
                    >
                      <Sparkles size={20} />{" "}
                      <span className="text-[10px]">אמצעי אחר</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-gray-50/50 border-t border-gray-100">
              <button
                type="submit"
                form="check-in-form"
                disabled={isSubmitting}
                className={`w-full h-16 sm:h-20 ${
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-3xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3`}
              >
                <span>
                  {isSubmitting
                    ? "מעדכן..."
                    : (editingTaskId ? "עדכן פרטים" : "בצע צ'ק-אין עכשיו")}
                </span>
                {isSubmitting
                  ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  )
                  : <CheckCircle2 size={24} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <section className="space-y-6">
        <h3 className="font-black text-2xl text-gray-900 px-4 tracking-tight text-start flex items-center gap-3">
          <CheckCircle2 size={26} className="text-blue-600" />
          הטיפולים שלי
        </h3>
        {myTasks.length > 0
          ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTasks.map((task) => (
                  <CustomerTaskCard
                    key={task.id}
                    task={task}
                    garagePhone={garagePhone}
                    onShowRequest={setShowRequestForm}
                    onCancel={(id) => deleteTask(id)}
                    onEdit={(task) => handleEditTask(task)}
                  />
                ))}
              </div>

              {hasMoreTasks && (
                <div className="flex justify-center pt-8">
                  <button
                    onClick={loadMoreTasks}
                    disabled={loading}
                    className="w-full sm:w-auto px-12 py-4 bg-white border-2 border-black rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                  >
                    {loading ? "טוען..." : "טען טיפולים נוספים"}
                  </button>
                </div>
              )}
            </>
          )
          : (
            <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 shadow-inner flex flex-col items-center">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 text-gray-200">
                <Car size={48} />
              </div>
              <p className="text-gray-400 font-black text-lg">
                אין לך טיפולים פעילים כרגע.
              </p>
            </div>
          )}
      </section>

      {/* Documents Section */}
      <section className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl relative overflow-hidden group/docs">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2">
        </div>

        <div className="flex items-center gap-4 mb-10 px-1 text-start relative">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-black text-2xl tracking-tight text-gray-900">
              המסמכים שלי
            </h3>
            <p className="text-gray-400 text-xs font-bold mt-0.5">
              נהל את מסמכי הרכב והזיהוי שלך במקום אחד
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {[
            {
              id: "idCard",
              label: "תעודת זהות",
              icon: <UserCircle2 size={24} />,
            },
            { id: "carLicense", label: "רישיון רכב", icon: <Car size={24} /> },
            {
              id: "insurance",
              label: "ביטוח חובה",
              icon: <Shield size={24} />,
            },
          ].map((doc) => {
            const docUrl = user?.documents?.[doc.id];
            const isUploading = uploadingDoc === doc.id;
            const progress = uploadProgress[doc.id] || 0;

            return (
              <div
                key={doc.id}
                className="relative bg-white/60 backdrop-blur-md rounded-[2rem] p-8 border border-white flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1 group/card"
              >
                {/* Icon / Status Indicator */}
                <div
                  className={`w-20 h-20 rounded-[1.75rem] mb-6 flex items-center justify-center transition-all duration-500 relative ${
                    docUrl
                      ? "bg-emerald-100 text-emerald-600 shadow-emerald-100"
                      : "bg-gray-50 text-gray-300"
                  } shadow-xl`}
                >
                  {isUploading
                    ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-blue-100"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-blue-600"
                            style={{
                              strokeDasharray: "176",
                              strokeDashoffset: `${
                                176 - (progress / 100) * 176
                              }`,
                              transition: "stroke-dashoffset 0.3s ease",
                            }}
                          />
                        </svg>
                        <span className="absolute text-[10px] font-black text-blue-600">
                          {progress}%
                        </span>
                      </div>
                    )
                    : (
                      <>
                        {doc.icon}
                        {docUrl && (
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white border-4 border-white animate-bounce-in">
                            <Check size={14} strokeWidth={4} />
                          </div>
                        )}
                      </>
                    )}
                </div>

                <div className="text-base font-black text-gray-800 mb-6">
                  {doc.label}
                </div>

                {/* Progress Bar (Traditional) */}
                {isUploading && (
                  <div className="w-full h-1.5 bg-blue-50 rounded-full mb-6 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full">
                  {!docUrl
                    ? (
                      <label
                        className={`w-full py-4 rounded-2xl font-black text-sm cursor-pointer transition-all flex items-center justify-center gap-3 active:scale-95 ${
                          isUploading
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-black text-white hover:bg-gray-800 shadow-lg"
                        }`}
                      >
                        <Upload size={18} />
                        {isUploading ? "מעלה..." : "בחר תמונה או PDF"}
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocUpload(doc.id, file);
                          }}
                        />
                      </label>
                    )
                    : (
                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                        >
                          <Link size={16} />
                          צפייה
                        </a>
                        <button
                          onClick={() => handleDocDelete(doc.id)}
                          className="flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-2xl font-black text-xs hover:bg-red-100 transition-all active:scale-95"
                        >
                          <Trash2 size={16} />
                          מחיקה
                        </button>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm animate-scale-in">
            <h4 className="font-black text-lg mb-4">בקשה נוספת לטיפול</h4>
            <textarea
              className="w-full bg-gray-50 rounded-xl p-4 mb-4 h-32 border-2 border-transparent focus:border-blue-500 outline-none resize-none"
              placeholder="פרט את הבקשה שלך..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
            />
            <div className="flex items-center gap-4 mb-6">
              <label className="flex-1 flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-100 transition-all">
                <Camera size={20} className="text-blue-500" />
                <span className="text-xs font-black text-gray-500">
                  {requestPhoto ? "תמונה נבחרה" : "צרף תמונה"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setRequestPhoto(e.target.files?.[0] || null)}
                />
              </label>
              {requestPhoto && (
                <button
                  onClick={() => setRequestPhoto(null)}
                  className="p-4 bg-red-50 text-red-500 rounded-xl border-2 border-transparent hover:border-red-500 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRequestForm(null);
                  setRequestPhoto(null);
                }}
                className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() =>
                  showRequestForm &&
                  submitCustomerRequest(
                    showRequestForm,
                    requestPhoto || undefined,
                  )}
                disabled={isSubmitting}
                className={`flex-1 ${
                  isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                } text-white py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2`}
              >
                {isSubmitting && (
                  <RefreshCcw size={16} className="animate-spin" />
                )}
                {isSubmitting ? "שולח..." : "שלח"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col items-center text-center animate-bounce-in max-w-sm w-full">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Check size={48} strokeWidth={4} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              צ'ק-אין בוצע בהצלחה!
            </h3>
            <p className="text-gray-500 font-bold">פרטי הרכב נקלטו במערכת.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
