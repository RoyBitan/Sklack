import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Car, Check, Save, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { useData } from "../contexts/DataContext";
import { Priority, TaskStatus } from "../types";
import {
  cleanLicensePlate,
  formatLicensePlate,
  sanitize,
} from "../utils/formatters";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "../utils/vehicleApi";
import { isValidPhone, normalizePhone } from "../utils/phoneUtils";
import {
  ChevronDown,
  Database,
  Download,
  Loader,
  RefreshCcw,
} from "lucide-react";

interface CreateTaskModalProps {
  onClose: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const { refreshData, lookupCustomerByPhone } = useData();
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [immobilizer, setImmobilizer] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [foundVehicles, setFoundVehicles] = useState<any[]>([]);
  const [showVehicleSelect, setShowVehicleSelect] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);
  const [isFetchingPhone, setIsFetchingPhone] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<
    "none" | "loading" | "match" | "partial" | "new"
  >("none");
  const [originalData, setOriginalData] = useState<any>(null);
  const [vin, setVin] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [engineModel, setEngineModel] = useState("");
  const [registrationValidUntil, setRegistrationValidUntil] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAssignment, setShowAssignment] = useState(false);
  const { fetchTeamMembers, notifyMultiple } = useData();

  React.useEffect(() => {
    if (showAssignment && teamMembers.length === 0) {
      fetchTeamMembers().then(setTeamMembers);
    }
  }, [showAssignment, fetchTeamMembers]);

  React.useEffect(() => {
    const normalized = normalizePhone(phone);
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
        setCustomerName(customer.full_name);
        setOriginalData({ name: customer.full_name });

        if (vehicles.length === 1) {
          setLookupStatus("match");
          setPlate(formatLicensePlate(vehicles[0].plate));
          setModel(vehicles[0].model);
          setYear(vehicles[0].year || "");
          setColor(vehicles[0].color || "");
          // Auto-fill additional fields
          setVin(vehicles[0].vin || "");
          setFuelType(vehicles[0].fuel_type || "");
          setEngineModel(vehicles[0].engine_model || "");
          setRegistrationValidUntil(vehicles[0].registration_valid_until || "");
          setImmobilizer(vehicles[0].kodanit || "");
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
  }, [phone, lookupCustomerByPhone]);

  const resetAutofill = () => {
    if (originalData) {
      setCustomerName(originalData.name);
    }
  };

  const handlePlateBlur = async () => {
    const cleanedPlate = cleanLicensePlate(plate);
    if (!cleanedPlate || !profile?.org_id) return;

    try {
      const { data: existing } = await supabase
        .from("vehicles")
        .select("*")
        .eq("plate", cleanedPlate)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (existing) {
        setModel(existing.model);
        setYear(existing.year || "");
        setColor(existing.color || "");
        // Auto-fill additional fields from existing vehicle
        setImmobilizer(existing.kodanit || "");
        setVin(existing.vin || "");
        setFuelType(existing.fuel_type || "");
        setEngineModel(existing.engine_model || "");
        setRegistrationValidUntil(existing.registration_valid_until || "");
      }
    } catch (e) {
      console.error("Vehicle lookup failed", e);
    }
  };

  const handleAutoFill = async () => {
    const cleanedPlate = cleanLicensePlate(plate);

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

      setModel(data.model || model);
      setYear(data.year || year);
      setColor(data.color || color);
      setVin(data.vin || vin);
      setFuelType(data.fuelType || fuelType);
      setEngineModel(data.engineModel || engineModel);
      setRegistrationValidUntil(
        data.registrationValidUntil || registrationValidUntil,
      );
    } catch (err: any) {
      setError(err.message || "שגיאה בטעינת נתוני הרכב");
    } finally {
      setLoadingApi(false);
    }
  };

  const handlePhoneBlur = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_vehicles_by_phone", {
        phone_text: phone,
      });
      if (error) throw error;

      if (data && data.length > 0) {
        setFoundVehicles(data);
        setShowVehicleSelect(true);
      } else {
        setFoundVehicles([]);
      }
    } catch (e) {
      console.error("Magic fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const selectVehicle = (v: any) => {
    setPlate(formatLicensePlate(v.plate));
    setModel(v.model);
    setYear(v.year || "");
    setColor(v.color || "");
    // Auto-fill additional fields on selection
    setVin(v.vin || "");
    setFuelType(v.fuel_type || "");
    setEngineModel(v.engine_model || "");
    setRegistrationValidUntil(v.registration_valid_until || "");
    setImmobilizer(v.kodanit || "");

    setFoundVehicles([]);
    setShowVehicleSelect(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return;

    setLoading(true);
    setError("");

    // Basic Validation
    if (!title.trim()) {
      setError("אנא הזן כותרת למשימה");
      setLoading(false);
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (phone && !isValidPhone(normalizedPhone)) {
      setError("מספר טלפון לא תקין (דרושות 10 ספרות)");
      setLoading(false);
      return;
    }

    const cleanedPlate = cleanLicensePlate(plate);
    if (plate && cleanedPlate.length < 7) {
      setError("מספר רישוי קצר מדי");
      setLoading(false);
      return;
    }

    try {
      // 1. Create or Find Vehicle
      let vehicleId = null;
      if (plate) {
        const cleanedPlate = cleanLicensePlate(plate);
        // Check if exists
        const { data: existingVehicle } = await supabase
          .from("vehicles")
          .select("id")
          .eq("plate", cleanedPlate)
          .eq("org_id", profile.org_id)
          .maybeSingle();

        if (existingVehicle) {
          vehicleId = existingVehicle.id;
          // Update existing with current form data (which might have been fetched from API)
          await supabase
            .from("vehicles")
            .update({
              model: sanitize(model) || "Unknown",
              year: sanitize(year) || null,
              color: sanitize(color) || null,
              vin: sanitize(vin) || null,
              fuel_type: sanitize(fuelType) || null,
              engine_model: sanitize(engineModel) || null,
              registration_valid_until: registrationValidUntil || null,
              kodanit: sanitize(immobilizer) || null,
            })
            .eq("id", vehicleId);
        } else {
          // Create new
          const { data: newVehicle, error: vError } = await supabase
            .from("vehicles")
            .insert({
              org_id: profile.org_id,
              plate: cleanedPlate,
              model: sanitize(model) || "Unknown",
              year: sanitize(year) || null,
              color: sanitize(color) || null,
              vin: sanitize(vin) || null,
              fuel_type: sanitize(fuelType) || null,
              engine_model: sanitize(engineModel) || null,
              registration_valid_until: registrationValidUntil || null,
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
          title: sanitize(title),
          description: sanitize(description),
          priority: isUrgent ? Priority.URGENT : Priority.NORMAL,
          status: TaskStatus.WAITING,
          vehicle_id: vehicleId,
          vehicle_year: sanitize(year),
          immobilizer_code: sanitize(immobilizer),
          assigned_to: assignedTo,
          metadata: {
            ...(foundCustomer
              ? {
                ownerPhone: foundCustomer.phone,
                ownerName: foundCustomer.full_name,
              }
              : {
                ownerPhone: normalizePhone(phone),
                ownerName: sanitize(customerName),
              }),
            type: "MANUAL_ENTRY",
          },
        })
        .select()
        .single();

      if (tError) throw tError;

      // 3. Send Notifications
      if (data) {
        const notificationTitle = "משימה חדשה 🔧";
        const notificationMessage = `משימה חדשה נוצרה: ${title}`;

        if (assignedTo.length > 0) {
          // Targeted notification
          await notifyMultiple(
            assignedTo,
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
    } catch (err: any) {
      console.error(err);
      setError(err.message || "שגיאה ביצירת המשימה");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up">
      <div className="bg-white w-full h-full sm:h-auto sm:w-full sm:max-w-2xl sm:rounded-[2rem] shadow-2xl flex flex-col transition-all duration-300">
        {/* Header */}
        <div className="px-6 py-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-white sm:rounded-t-[2rem] sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tighter">
              משימה חדשה
            </h2>
            <p className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mt-1">
              פתיחת כרטיס עבודה לרכב
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all active:scale-90 touch-target"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-8">
          <form
            id="create-task-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                כותרת הטיפול
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-premium"
                placeholder="מה צריך לעשות ברכב?"
              />
            </div>

            <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 relative group/magic">
              <div className="absolute -top-3 right-8 bg-black text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                <RefreshCcw
                  size={10}
                  className={isFetchingPhone ? "animate-spin" : ""}
                />
                Magic Fetch
              </div>

              {/* Phone Lookup */}
              <div className="space-y-4 pt-2">
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">
                    נייד לקוח
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-premium pr-12 text-left ltr"
                      placeholder="050-0000000"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isFetchingPhone
                        ? (
                          <Loader
                            size={18}
                            className="animate-spin text-blue-500"
                          />
                        )
                        : lookupStatus === "match"
                        ? (
                          <div className="bg-emerald-500 text-white p-1 rounded-full animate-bounce-subtle">
                            <Check size={14} strokeWidth={4} />
                          </div>
                        )
                        : lookupStatus === "partial" || lookupStatus === "new"
                        ? (
                          <div className="bg-amber-500 text-white p-1 rounded-full">
                            <AlertCircle size={14} strokeWidth={4} />
                          </div>
                        )
                        : null}
                    </div>
                  </div>
                  {lookupStatus === "new" && (
                    <p className="text-[10px] font-bold text-amber-600 mt-2 px-2">
                      לקוח חדש - לא נמצאו רישומים במערכת
                    </p>
                  )}
                  {lookupStatus === "match" && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-2 px-2">
                      לקוח ורכב זוהו בהצלחה!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">
                    שם הלקוח
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="input-premium"
                      placeholder="ישראל ישראלי"
                    />
                    {originalData && customerName !== originalData.name && (
                      <button
                        type="button"
                        onClick={resetAutofill}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-500 underline"
                      >
                        אפס למקור
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown for multiple vehicles */}
                {showVehicleSelect && foundVehicles.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-2 space-y-2 animate-fade-in-up">
                    <div className="text-[10px] font-bold text-blue-400 px-3 py-1 uppercase tracking-widest flex items-center gap-2">
                      <Car size={12} />
                      נמצאו {foundVehicles.length} רכבים - בחר רכב לטיפול:
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                      {foundVehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => selectVehicle(v)}
                          className="w-full text-right p-3 hover:bg-blue-50 rounded-xl flex items-center justify-between group transition-colors border border-transparent hover:border-blue-100"
                        >
                          <div>
                            <div className="font-black text-gray-900 font-mono tracking-widest">
                              {formatLicensePlate(v.plate)}
                            </div>
                            <div className="text-xs text-gray-500 font-bold">
                              {v.model} {v.year && `(${v.year})`}
                            </div>
                          </div>
                          <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            בחר רכב
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Car size={24} className="text-gray-400" />
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                פרטי רכב
              </span>
            </div>

            <div className="space-y-6">
              <div className="w-full">
                <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">
                  מספר רישוי
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) =>
                      setPlate(formatLicensePlate(e.target.value))}
                    onBlur={handlePlateBlur}
                    className="input-premium font-mono tracking-widest text-center flex-1"
                    placeholder="12-345-67"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={loadingApi}
                    className="bg-black text-white px-6 rounded-xl hover:bg-gray-800 disabled:bg-gray-400 transition-colors shadow-lg active:scale-95"
                    title="משוך נתונים"
                  >
                    {loadingApi
                      ? <Loader size={20} className="animate-spin" />
                      : <Download size={20} />}
                  </button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                <div className="text-start">
                  <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                    יצרן, דגם ושנה
                  </div>
                  <div className="text-sm font-black text-black">
                    {model || "---"} {year ? `(${year})` : ""}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVehicleSelect(!showVehicleSelect)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <span className="font-black text-[10px] text-gray-500 uppercase tracking-widest">
                  פרטי רכב נוספים
                </span>
                <ChevronDown
                  className={`transition-transform ${
                    showVehicleSelect ? "rotate-180" : ""
                  }`}
                  size={16}
                />
              </button>

              {showVehicleSelect && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 animate-fade-in-up">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                      קודנית
                    </label>
                    <input
                      type="text"
                      value={immobilizer}
                      onChange={(e) => setImmobilizer(e.target.value)}
                      className="input-premium font-mono tracking-widest text-start"
                      placeholder="1234"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                      שנתון
                    </label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="input-premium"
                      placeholder="2026"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                      צבע
                    </label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="input-premium"
                      placeholder="לבן"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                      מספר שלדה
                    </label>
                    <input
                      type="text"
                      value={vin}
                      onChange={(e) => setVin(e.target.value)}
                      className="input-premium font-mono"
                      placeholder="VM1F..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                      סוג דלק
                    </label>
                    <input
                      type="text"
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="input-premium"
                      placeholder="בנזין"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                      דגם מנוע
                    </label>
                    <input
                      type="text"
                      value={engineModel}
                      onChange={(e) => setEngineModel(e.target.value)}
                      className="input-premium"
                      placeholder="G4FC"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                      תוקף טסט
                    </label>
                    <input
                      type="text"
                      value={registrationValidUntil}
                      onChange={(e) =>
                        setRegistrationValidUntil(e.target.value)}
                      className="input-premium text-start font-mono"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">
                תיאור והערות
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-premium h-32 py-4 resize-none"
                placeholder="בקשות ספציפיות של הלקוח..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">
                דחיפות
              </label>
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isUrgent
                    ? "border-red-500 bg-red-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isUrgent
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isUrgent && <Check size={14} strokeWidth={4} />}
                </div>
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="hidden"
                />
                <span
                  className={`font-black ${
                    isUrgent ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {isUrgent ? "דחוף מאוד" : "רגיל"}
                </span>
              </label>
            </div>

            {/* TASK ASSIGNMENT SECTION */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAssignment(!showAssignment)}
                className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${
                  showAssignment
                    ? "border-black bg-black text-white"
                    : "border-gray-100 bg-gray-50 text-gray-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      showAssignment ? "bg-white/20" : "bg-white"
                    }`}
                  >
                    <Check
                      size={18}
                      className={showAssignment
                        ? "text-white"
                        : "text-gray-300"}
                    />
                  </div>
                  <span className="font-black text-sm">סקלאק ספציפי</span>
                </div>
                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    showAssignment ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showAssignment && (
                <div className="mt-4 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setAssignedTo((prev) =>
                            prev.includes(member.id)
                              ? prev.filter((id) => id !== member.id)
                              : [...prev, member.id]
                          );
                        }}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                          assignedTo.includes(member.id)
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-white bg-white text-gray-500 hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-xs">
                            {member.full_name[0]}
                          </div>
                          <div className="text-start">
                            <div className="text-xs font-black">
                              {member.full_name}
                            </div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase">
                              {member.role}
                            </div>
                          </div>
                        </div>
                        {assignedTo.includes(member.id) && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {assignedTo.length === 0 && (
                    <div className="mt-4 text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                        משימה גלובלית - כל הצוות יוכל לראות ולקחת את המשימה
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-6 rounded-[1.5rem] flex items-center gap-4 border border-red-100 animate-shake">
                <AlertCircle size={24} />
                <p className="text-sm font-black">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 border-t border-gray-100 bg-white sticky bottom-0 z-10 shrink-0 mb-safe">
          <button
            form="create-task-form"
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-3 touch-target"
          >
            {loading
              ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin">
                </div>
              )
              : (
                <>
                  <Save size={20} />
                  <span className="font-black text-lg">פתח כרטיס עבודה</span>
                </>
              )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CreateTaskModal;
