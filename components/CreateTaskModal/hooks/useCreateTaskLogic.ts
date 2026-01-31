import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useData } from "../../../contexts/DataContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useSubscription } from "../../../hooks/useSubscription";
import { supabase } from "../../../lib/supabase";
import { Priority, TaskStatus } from "../../../types";
import {
  cleanLicensePlate,
  formatLicensePlate,
  sanitize,
} from "../../../utils/formatters";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "../../../utils/vehicleApi";
import { isValidPhone, normalizePhone } from "../../../utils/phoneUtils";
import { scrollToFormStart } from "../../../utils/uiUtils";

export interface CreateTaskFormData {
  title: string;
  description: string;
  customerName: string;
  phone: string;
  plate: string;
  model: string;
  year: string;
  color: string;
  immobilizer: string;
  isUrgent: boolean;
  vin: string;
  fuelType: string;
  engineModel: string;
  registrationValidUntil: string;
  assignedTo: string[];
  price: string;
  showPrice: boolean;
  dueIn: string;
  customMinutes: string;
  showAssignment: boolean;
}

export const useCreateTaskLogic = (onClose: () => void) => {
  const { profile } = useAuth();
  const {
    refreshData,
    lookupCustomerByPhone,
    fetchTeamMembers,
    notifyMultiple,
  } = useData();
  const { canAddMoreTasks, activeTasksCount } = useSubscription();

  const formRef = useRef<HTMLDivElement>(null);

  // State
  const [formData, setFormData] = useState<CreateTaskFormData>({
    title: "",
    description: "",
    customerName: "",
    phone: "",
    plate: "",
    model: "",
    year: "",
    color: "",
    immobilizer: "",
    isUrgent: false,
    vin: "",
    fuelType: "",
    engineModel: "",
    registrationValidUntil: "",
    assignedTo: [],
    price: "",
    showPrice: false,
    dueIn: "2h",
    customMinutes: "",
    showAssignment: false,
  });

  const [loading, setLoading] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false); // Vehicle Gov API
  const [error, setError] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<
    import("../../../types").Profile | null
  >(null);
  const [foundVehicles, setFoundVehicles] = useState<
    import("../../../types").Vehicle[]
  >([]);
  const [showVehicleSelect, setShowVehicleSelect] = useState(false);
  const [isFetchingPhone, setIsFetchingPhone] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<
    "none" | "loading" | "match" | "partial" | "new"
  >("none");
  const [originalData, setOriginalData] = useState<{ name: string } | null>(
    null,
  );
  const [teamMembers, setTeamMembers] = useState<
    import("../../../types").Profile[]
  >([]);

  // Helpers
  const updateField = <K extends keyof CreateTaskFormData>(
    field: K,
    value: CreateTaskFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Effects
  useEffect(() => {
    scrollToFormStart(formRef);
  }, []);

  useEffect(() => {
    if (formData.showAssignment && teamMembers.length === 0) {
      fetchTeamMembers().then(setTeamMembers);
    }
  }, [formData.showAssignment, fetchTeamMembers, teamMembers.length]);

  // Magic Phone Lookup Logic
  useEffect(() => {
    const normalized = normalizePhone(formData.phone);
    if (normalized.length < 9) {
      setLookupStatus("none");
      setFoundCustomer(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingPhone(true);
      setLookupStatus("loading");

      const result = await lookupCustomerByPhone(normalized);

      if (result) {
        const { customer, vehicles } = result;
        setFoundCustomer(customer);
        updateField("customerName", customer.full_name);
        setOriginalData({ name: customer.full_name });

        if (vehicles.length === 1) {
          setLookupStatus("match");
          setFormData((prev) => ({
            ...prev,
            plate: formatLicensePlate(vehicles[0].plate),
            model: vehicles[0].model,
            year: vehicles[0].year || "",
            color: vehicles[0].color || "",
            vin: vehicles[0].vin || "",
            fuelType: vehicles[0].fuel_type || "",
            engineModel: vehicles[0].engine_model || "",
            registrationValidUntil: vehicles[0].registration_valid_until || "",
            immobilizer: vehicles[0].kodanit || "",
          }));
        } else if (vehicles.length > 1) {
          setLookupStatus("partial");
          setFoundVehicles(vehicles);
          setShowVehicleSelect(true);
        } else {
          setLookupStatus("partial");
          setError("לקוח נמצא, אך לא רשומים רכבים בבעלותו.");
        }
      } else {
        setLookupStatus("new");
      }
      setIsFetchingPhone(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.phone, lookupCustomerByPhone]);

  // Actions
  const resetAutofill = () => {
    if (originalData) {
      updateField("customerName", originalData.name);
    }
  };

  const handlePlateBlur = async () => {
    const cleanedPlate = cleanLicensePlate(formData.plate);
    if (!cleanedPlate || !profile?.org_id) return;

    try {
      const { data: existing } = await supabase
        .from("vehicles")
        .select("*")
        .eq("plate", cleanedPlate)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (existing) {
        setFormData((prev) => ({
          ...prev,
          model: existing.model,
          year: existing.year || "",
          color: existing.color || "",
          immobilizer: existing.kodanit || "",
          vin: existing.vin || "",
          fuelType: existing.fuel_type || "",
          engineModel: existing.engine_model || "",
          registrationValidUntil: existing.registration_valid_until || "",
        }));
      }
    } catch (e) {
      console.error("Vehicle lookup failed", e);
    }
  };

  const handleAutoFill = async () => {
    const cleanedPlate = cleanLicensePlate(formData.plate);

    if (!cleanedPlate || !isValidIsraeliPlate(cleanedPlate)) {
      setError("אנא הזן מספר רישוי תקין");
      return;
    }

    setLoadingApi(true);
    setError("");

    try {
      const data = await fetchVehicleDataFromGov(cleanedPlate);

      if (!data) {
        setError("לא נמצאו נתונים למספר רישוי זה");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        model: data.model || prev.model,
        year: data.year || prev.year,
        color: data.color || prev.color,
        vin: data.vin || prev.vin,
        fuelType: data.fuelType || prev.fuelType,
        engineModel: data.engineModel || prev.engineModel,
        registrationValidUntil: data.registrationValidUntil ||
          prev.registrationValidUntil,
      }));
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "שגיאה בטעינת נתוני הרכב";
      setError(message);
    } finally {
      setLoadingApi(false);
    }
  };

  const selectVehicle = (v: import("../../../types").Vehicle) => {
    setFormData((prev) => ({
      ...prev,
      plate: formatLicensePlate(v.plate),
      model: v.model,
      year: v.year || "",
      color: v.color || "",
      vin: v.vin || "",
      fuelType: v.fuel_type || "",
      engineModel: v.engine_model || "",
      registrationValidUntil: v.registration_valid_until || "",
      immobilizer: v.kodanit || "",
    }));

    setFoundVehicles([]);
    setShowVehicleSelect(false);
  };

  // Submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return;

    setLoading(true);
    setError("");

    // Basic Validation
    if (!formData.title.trim()) {
      setError("אנא הזן כותרת למשימה");
      setLoading(false);
      return;
    }

    const normalizedPhone = normalizePhone(formData.phone);
    if (formData.phone && !isValidPhone(normalizedPhone)) {
      setError("מספר טלפון לא תקין (דרושות 10 ספרות)");
      setLoading(false);
      return;
    }

    const cleanedPlate = cleanLicensePlate(formData.plate);
    if (formData.plate && cleanedPlate.length < 7) {
      setError("מספר רישוי קצר מדי");
      setLoading(false);
      return;
    }

    try {
      // 1. Create or Find Vehicle
      let vehicleId = null;
      if (formData.plate) {
        const cleanedPlate = cleanLicensePlate(formData.plate);
        // Check if exists
        const { data: existingVehicle } = await supabase
          .from("vehicles")
          .select("id")
          .eq("plate", cleanedPlate)
          .eq("org_id", profile.org_id)
          .maybeSingle();

        if (existingVehicle) {
          vehicleId = existingVehicle.id;
          // Update existing with current form data
          await supabase
            .from("vehicles")
            .update({
              model: sanitize(formData.model) || "Unknown",
              year: sanitize(formData.year) || null,
              color: sanitize(formData.color) || null,
              vin: sanitize(formData.vin) || null,
              fuel_type: sanitize(formData.fuelType) || null,
              engine_model: sanitize(formData.engineModel) || null,
              registration_valid_until: formData.registrationValidUntil || null,
              kodanit: sanitize(formData.immobilizer) || null,
              // Link owner if not already set
              owner_id: foundCustomer?.id || null,
              owner_name: foundCustomer?.full_name ||
                sanitize(formData.customerName) || null,
            })
            .eq("id", vehicleId);
        } else {
          // Create new
          const { data: newVehicle, error: vError } = await supabase
            .from("vehicles")
            .insert({
              org_id: profile.org_id,
              plate: cleanedPlate,
              model: sanitize(formData.model) || "Unknown",
              year: sanitize(formData.year) || null,
              color: sanitize(formData.color) || null,
              vin: sanitize(formData.vin) || null,
              fuel_type: sanitize(formData.fuelType) || null,
              engine_model: sanitize(formData.engineModel) || null,
              registration_valid_until: formData.registrationValidUntil || null,
              owner_id: foundCustomer?.id || null,
              owner_name: foundCustomer?.full_name ||
                sanitize(formData.customerName) || null,
            })
            .select()
            .single();

          if (vError) throw vError;
          vehicleId = newVehicle.id;
        }
      }

      // 2. Create Task
      const { data, error: tError } = await supabase
        .from("tasks")
        .insert({
          org_id: profile.org_id,
          created_by: profile.id,
          customer_id: foundCustomer?.id || null,
          title: sanitize(formData.title),
          description: sanitize(formData.description),
          priority: formData.isUrgent ? Priority.URGENT : Priority.NORMAL,
          status: TaskStatus.WAITING,
          vehicle_id: vehicleId,
          vehicle_year: sanitize(formData.year),
          immobilizer_code: sanitize(formData.immobilizer),
          assigned_to: formData.assignedTo,
          price: formData.showPrice ? parseFloat(formData.price) : null,
          allotted_time: formData.dueIn === "30m"
            ? 30
            : formData.dueIn === "1h"
            ? 60
            : formData.dueIn === "2h"
            ? 120
            : formData.dueIn === "4h"
            ? 240
            : formData.dueIn === "custom"
            ? (parseInt(formData.customMinutes) || 0)
            : 0,
          metadata: {
            ...(foundCustomer
              ? {
                ownerPhone: foundCustomer.phone,
                ownerName: foundCustomer.full_name,
              }
              : {
                ownerPhone: normalizePhone(formData.phone),
                ownerName: sanitize(formData.customerName),
              }),
            type: "MANUAL_ENTRY",
            dueIn: formData.dueIn,
          },
        })
        .select()
        .single();

      if (tError) throw tError;

      // 3. Send Notifications
      if (data) {
        const notificationTitle = "משימה חדשה 🔧";
        const notificationMessage = `משימה חדשה נוצרה: ${formData.title}`;

        if (formData.assignedTo.length > 0) {
          await notifyMultiple(
            formData.assignedTo,
            notificationTitle,
            notificationMessage,
            "TASK_CREATED",
            data.id,
          );
        } else {
          // Global notification (send to all staff)
          const allStaff = teamMembers.length > 0
            ? teamMembers
            : await fetchTeamMembers();
          const allStaffIds = allStaff.map((s) => s.id).filter((id) =>
            id !== profile.id
          );
          await notifyMultiple(
            allStaffIds,
            notificationTitle,
            notificationMessage,
            "TASK_CREATED",
            data.id,
          );
        }
      }

      await refreshData();
      onClose();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error
        ? err.message
        : "שגיאה ביצירת המשימה";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    formData,
    updateField,
    loading,
    loadingApi,
    error,
    setError,
    foundCustomer,
    foundVehicles,
    showVehicleSelect,
    setShowVehicleSelect,
    isFetchingPhone,
    lookupStatus,
    originalData,
    teamMembers,
    formRef,
    activeTasksCount,
    canAddMoreTasks,

    // Actions
    resetAutofill,
    handlePlateBlur,
    handleAutoFill,
    selectVehicle,
    handleSubmit,
  };
};
