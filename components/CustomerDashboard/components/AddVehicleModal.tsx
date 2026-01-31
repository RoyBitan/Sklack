import React, { useRef } from "react";
import { CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import { Vehicle } from "../../../types";
import {
  cleanLicensePlate,
  formatLicensePlate,
} from "../../../utils/formatters";
import {
  fetchVehicleDataFromGov,
  isValidIsraeliPlate,
} from "../../../utils/vehicleApi";
import { toast } from "sonner";

interface AddVehicleModalProps {
  showAddVehicle: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  newVehicle: Partial<Vehicle>;
  setNewVehicle: (val: Partial<Vehicle>) => void;
  loadingApi: boolean;
  setLoadingApi: (val: boolean) => void;
  showVehicleSelect: boolean;
  setShowVehicleSelect: (val: boolean) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  showAddVehicle,
  onClose,
  onSubmit,
  newVehicle,
  setNewVehicle,
  loadingApi,
  setLoadingApi,
  showVehicleSelect,
  setShowVehicleSelect,
  scrollRef,
}) => {
  if (!showAddVehicle) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={scrollRef}
        className="bg-white w-[95%] max-w-lg rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-50">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-gray-900 text-start">
            <Sparkles className="text-blue-600" size={24} />
            רישום רכב חדש
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <form onSubmit={onSubmit} className="space-y-6">
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
  );
};

export default AddVehicleModal;
