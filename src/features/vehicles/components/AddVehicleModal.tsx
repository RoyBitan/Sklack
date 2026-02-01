import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader,
  Palette,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/src/features/auth";
import { useData } from "@/contexts/DataContext";
import {
  cleanLicensePlate,
  formatLicensePlate,
} from "@/src/shared/utils/formatters";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "@/src/shared/utils/vehicleApi";
import {
  playClickSound,
  scrollToFormStart,
  scrollToTop,
} from "@/src/shared/utils/uiUtils";
import { Button, Card, Input, Modal } from "@/src/shared/components/ui";

interface AddVehicleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = (
  { onClose, onSuccess },
) => {
  const { profile } = useAuth();
  const { refreshData } = useData();
  const [loading, setLoading] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [engineModel, setEngineModel] = useState("");
  const [registrationValidUntil, setRegistrationValidUntil] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [kodanit, setKodanit] = useState("");
  const [error, setError] = useState("");
  const [apiSuccess, setApiSuccess] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollToFormStart(scrollRef.current);
    }
  }, []);

  const handleAutoFill = async () => {
    const cleanedPlate = cleanLicensePlate(plate);
    if (!cleanedPlate || !isValidIsraeliPlate(cleanedPlate)) {
      setError("אנא הזן מספר רישוי תקין");
      return;
    }

    setLoadingApi(true);
    setError("");
    setApiSuccess(false);

    try {
      const data = await fetchVehicleDataFromGov(cleanedPlate);
      if (!data) {
        setError("לא נמצאו נתונים למספר רישוי זה. אנא הזן את הפרטים ידנית.");
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
      setApiSuccess(true);
      setTimeout(() => setApiSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error
        ? err.message
        : "שגיאה בטעינת נתוני הרכב";
      setError(message);
    } finally {
      setLoadingApi(false);
    }
  };

  const handlePhoneSearch = async () => {
    if (!ownerPhone.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("phone", ownerPhone)
        .maybeSingle();

      if (profiles) {
        setOwnerName(profiles.full_name);
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("*")
          .eq("owner_id", profiles.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (vehicle) {
          setPlate(formatLicensePlate(vehicle.plate));
          setModel(vehicle.model);
          setYear(vehicle.year || "");
          setColor(vehicle.color || "");
          setVin(vehicle.vin || "");
          setFuelType(vehicle.fuel_type || "");
          setEngineModel(vehicle.engine_model || "");
          setRegistrationValidUntil(vehicle.registration_valid_until || "");
          setKodanit(vehicle.kodanit || "");
        }
      } else {
        setError("לא נמצא לקוח עם מספר טלפון זה");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!profile?.org_id) throw new Error("No organization ID found");
      const cleanedPlate = cleanLicensePlate(plate);
      if (cleanedPlate.length < 7) throw new Error("מספר רישוי לא תקין");

      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("plate", cleanedPlate)
        .eq("org_id", profile.org_id)
        .maybeSingle();

      if (existingVehicle) {
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({
            model,
            year,
            color,
            vin,
            fuel_type: fuelType,
            engine_model: engineModel,
            registration_valid_until: registrationValidUntil || null,
            kodanit,
            owner_name: ownerName,
          })
          .eq("id", existingVehicle.id);

        if (updateError) throw updateError;
        if (refreshData) await refreshData();
        onClose();
        onSuccess();
        return;
      }

      let ownerId = null;
      if (ownerPhone) {
        const { data: user } = await supabase.from("profiles").select("id").eq(
          "phone",
          ownerPhone,
        ).maybeSingle();
        ownerId = user?.id;
      }

      const { error: insertError } = await supabase.from("vehicles").insert({
        org_id: profile.org_id,
        plate: cleanedPlate,
        model,
        year,
        color,
        vin,
        fuel_type: fuelType,
        engine_model: engineModel,
        registration_valid_until: registrationValidUntil || null,
        kodanit,
        owner_id: ownerId,
        owner_name: ownerName,
      });

      if (insertError) {
        if (
          insertError.code === "23505" ||
          insertError.message.includes("unique constraint") ||
          insertError.message.includes("unique_violation")
        ) {
          throw new Error("הרכב כבר קיים במערכת");
        }
        throw insertError;
      }

      if (refreshData) await refreshData();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "שגיאה בהוספת הרכב";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="הוספת רכב חדש"
      className="border-t-[8px] sm:border-t-[12px] border-blue-600"
    >
      <form
        id="add-vehicle-form"
        onSubmit={handleSubmit}
        className="space-y-6 text-start"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="מספר טלפון"
            placeholder="050-0000000"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            onBlur={handlePhoneSearch}
            type="tel"
          />
          <Input
            label="שם לקוח"
            placeholder="ישראל ישראלי"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-start">
            מספר רישוי
          </label>
          <div className="relative">
            <Input
              required
              className="font-mono tracking-widest text-center text-xl h-14 w-full pr-14"
              placeholder="12-345-67"
              dir="ltr"
              value={plate}
              onChange={(e) => setPlate(formatLicensePlate(e.target.value))}
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleAutoFill}
              loading={loadingApi}
              className="absolute right-2 top-2 bottom-2 w-10 h-10 p-0 rounded-xl"
              title="Magic Fetch from DataGov"
            >
              {apiSuccess ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
            </Button>
          </div>
        </div>

        <Card
          variant="flat"
          padding="md"
          className="flex items-center justify-between"
        >
          <div className="text-start">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              יצרן, דגם, שנה
            </div>
            <div className="text-lg sm:text-xl font-black text-black tracking-tight uppercase">
              {model || "---"} {year ? `(${year})` : ""}
            </div>
          </div>
          <CheckCircle2
            className={model ? "text-green-500" : "text-gray-200"}
            size={32}
          />
        </Card>

        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-between"
          onClick={() => setShowMoreDetails(!showMoreDetails)}
        >
          <span className="font-black text-xs">
            פרטים מזהים נוספים (שלדה, מנוע, קודנית)
          </span>
          <ChevronDown
            className={`transition-transform duration-300 ${
              showMoreDetails ? "rotate-180" : ""
            }`}
            size={20}
          />
        </Button>

        {showMoreDetails && (
          <div className="space-y-4 bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="קודנית"
                placeholder="1234"
                value={kodanit}
                onChange={(e) => setKodanit(e.target.value)}
                className="font-mono tracking-widest"
              />
              <Input
                label="דגם מנוע"
                placeholder="G4FC"
                value={engineModel}
                onChange={(e) => setEngineModel(e.target.value)}
                className="font-mono uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="צבע"
                placeholder="לבן"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <Input
                label="תוקף טסט"
                placeholder="YYYY-MM-DD"
                value={registrationValidUntil}
                onChange={(e) => setRegistrationValidUntil(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="מספר שלדה"
                placeholder="VMF1..."
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="font-mono text-xs uppercase"
              />
              <Input
                label="סוג דלק"
                placeholder="בנזין"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[11px] font-black text-center border border-red-100 animate-shake">
            {error}
          </div>
        )}

        <div className="pt-4">
          <Button
            type="submit"
            loading={loading}
            onClick={playClickSound}
            size="lg"
            className="w-full h-16 sm:h-20 gap-4 text-lg sm:text-xl shadow-xl"
          >
            <CheckCircle2 size={24} /> <span>שמור רכב במערכת</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddVehicleModal;
