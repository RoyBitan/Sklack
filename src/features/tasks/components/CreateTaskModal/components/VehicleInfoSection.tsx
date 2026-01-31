import React from "react";
import { Car, ChevronDown, Download, Loader } from "lucide-react";
import { formatLicensePlate } from "@/utils/formatters";
import { CreateTaskFormData } from "../../types/task.types";

interface VehicleInfoSectionProps {
  formData: CreateTaskFormData;
  updateField: <K extends keyof CreateTaskFormData>(
    field: K,
    value: CreateTaskFormData[K],
  ) => void;
  handlePlateBlur: () => void;
  handleAutoFill: () => void;
  loadingApi: boolean;
  showVehicleSelect: boolean;
  setShowVehicleSelect: (show: boolean) => void;
}

const VehicleInfoSection: React.FC<VehicleInfoSectionProps> = ({
  formData,
  updateField,
  handlePlateBlur,
  handleAutoFill,
  loadingApi,
  showVehicleSelect,
  setShowVehicleSelect,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Car size={24} className="text-gray-400" />
        <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
          פרטי רכב
        </span>
      </div>

      <div className="w-full">
        <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">
          מספר רישוי
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.plate}
            onChange={(e) =>
              updateField("plate", formatLicensePlate(e.target.value))}
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
            {formData.model || "---"}{" "}
            {formData.year ? `(${formData.year})` : ""}
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
              value={formData.immobilizer}
              onChange={(e) => updateField("immobilizer", e.target.value)}
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
              value={formData.year}
              onChange={(e) => updateField("year", e.target.value)}
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
              value={formData.color}
              onChange={(e) => updateField("color", e.target.value)}
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
              value={formData.vin}
              onChange={(e) => updateField("vin", e.target.value)}
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
              value={formData.fuelType}
              onChange={(e) => updateField("fuelType", e.target.value)}
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
              value={formData.engineModel}
              onChange={(e) => updateField("engineModel", e.target.value)}
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
              value={formData.registrationValidUntil}
              onChange={(e) =>
                updateField("registrationValidUntil", e.target.value)}
              className="input-premium text-start font-mono"
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleInfoSection;
