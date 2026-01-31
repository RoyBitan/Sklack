import React from "react";
import { AlertCircle, Car, Check, Loader, RefreshCcw } from "lucide-react";
import { formatPhoneNumberInput } from "@/utils/phoneUtils";
import { formatLicensePlate } from "@/utils/formatters";
import { CreateTaskFormData } from "../../types/task.types";

interface CustomerInfoSectionProps {
  formData: CreateTaskFormData;
  updateField: <K extends keyof CreateTaskFormData>(
    field: K,
    value: CreateTaskFormData[K],
  ) => void;
  isFetchingPhone: boolean;
  lookupStatus: "none" | "loading" | "match" | "partial" | "new";
  originalData: { name: string } | null;
  resetAutofill: () => void;
  foundVehicles: import("@/types").Vehicle[];
  showVehicleSelect: boolean;
  setShowVehicleSelect: (show: boolean) => void;
  selectVehicle: (v: import("@/types").Vehicle) => void;
}

const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({
  formData,
  updateField,
  isFetchingPhone,
  lookupStatus,
  originalData,
  resetAutofill,
  foundVehicles,
  showVehicleSelect,
  // setShowVehicleSelect, // not used directly here? Ah wait, used for visibility? Actually used in dropdown logic
  selectVehicle,
}) => {
  return (
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
              value={formData.phone}
              onChange={(e) =>
                updateField("phone", formatPhoneNumberInput(e.target.value))}
              className="input-premium pr-12 text-left ltr"
              placeholder="050-0000000"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isFetchingPhone
                ? <Loader size={18} className="animate-spin text-blue-500" />
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
            <p className="text-[10px] font-bold text-amber-600 mt-2 px-2 flex items-center gap-2">
              <AlertCircle size={10} />{" "}
              No vehicles found - Please enter manually
            </p>
          )}
          {lookupStatus === "match" && (
            <p className="text-[10px] font-bold text-emerald-600 mt-2 px-2 flex items-center gap-2">
              <Check size={10} /> Vehicle linked successfully
            </p>
          )}
          {lookupStatus === "partial" && (
            <p className="text-[10px] font-bold text-blue-600 mt-2 px-2 flex items-center gap-2">
              <Car size={10} /> Multiple vehicles - please select
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
              value={formData.customerName}
              onChange={(e) => updateField("customerName", e.target.value)}
              className="input-premium"
              placeholder="ישראל ישראלי"
            />
            {originalData && formData.customerName !== originalData.name && (
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
  );
};

export default CustomerInfoSection;
