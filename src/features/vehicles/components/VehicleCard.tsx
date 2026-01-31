import React, { memo, useCallback, useState } from "react";
import { Vehicle } from "@/types";
import { ChevronDown, ChevronUp, Sparkles, Trash2 } from "lucide-react";
import { formatLicensePlate } from "@/shared/utils/formatters";

interface VehicleCardProps {
  vehicle: Vehicle;
  onDelete: () => void;
  onCheckIn: () => void;
}

/**
 * VehicleCard - Memoized for performance
 * Only re-renders when vehicle data or callbacks change
 */
const VehicleCard: React.FC<VehicleCardProps> = memo(
  ({ vehicle, onDelete, onCheckIn }) => {
    const [showDetails, setShowDetails] = useState(false);

    // Memoize toggle handler
    const toggleDetails = useCallback(() => {
      setShowDetails((prev) => !prev);
    }, []);

    return (
      <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group h-full">
        <div>
          <VehicleCardHeader
            vehicle={vehicle}
            onDelete={onDelete}
          />

          {/* Quick Toggle for Details */}
          <button
            onClick={toggleDetails}
            className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors mb-4"
          >
            {showDetails ? "פחות פרטים" : "פרטים נוספים"}
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Expanded Details */}
          {showDetails && <VehicleDetails vehicle={vehicle} />}
        </div>

        <VehicleCardFooter onCheckIn={onCheckIn} />
      </div>
    );
  },
);

VehicleCard.displayName = "VehicleCard";

/**
 * VehicleCardHeader - Top section with plate, model, delete button
 */
const VehicleCardHeader = memo<{ vehicle: Vehicle; onDelete: () => void }>((
  { vehicle, onDelete },
) => (
  <div className="flex justify-between items-start mb-4">
    <div className="text-start">
      <div className="bg-yellow-400 border-2 border-black rounded-lg px-3 py-1.5 inline-block shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 group-hover:-translate-y-1 transition-transform">
        <span
          className="font-mono text-sm font-black tracking-widest text-black"
          dir="ltr"
        >
          {formatLicensePlate(vehicle.plate)}
        </span>
      </div>
      <h4 className="font-black text-xl text-gray-900">{vehicle.model}</h4>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
        {vehicle.year} • {vehicle.color}
      </p>
    </div>
    <button
      onClick={onDelete}
      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
      title="מחק רכב"
    >
      <Trash2 size={20} />
    </button>
  </div>
));

VehicleCardHeader.displayName = "VehicleCardHeader";

/**
 * VehicleDetails - Expanded details grid
 */
const VehicleDetails = memo<{ vehicle: Vehicle }>(({ vehicle }) => (
  <div className="bg-gray-50 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3 text-start animate-fade-in text-xs border border-gray-100">
    <DetailItem label="קודנית" value={vehicle.kodanit} />
    <DetailItem label="מנוע" value={vehicle.engine_model} />
    <DetailItem label="VIN" value={vehicle.vin} truncate />
    <DetailItem
      label="טסט עד"
      value={vehicle.registration_valid_until}
      dir="ltr"
    />
    <DetailItem label="דלק" value={vehicle.fuel_type} />
  </div>
));

VehicleDetails.displayName = "VehicleDetails";

/**
 * DetailItem - Single detail field
 */
const DetailItem = memo<{
  label: string;
  value?: string | null;
  truncate?: boolean;
  dir?: "ltr" | "rtl";
}>(({ label, value, truncate, dir }) => (
  <div>
    <span className="block text-gray-400 text-[10px] font-bold">{label}</span>
    <span
      className={`font-mono font-bold text-gray-700 ${
        truncate ? "truncate" : ""
      }`}
      title={truncate ? value || "" : undefined}
      dir={dir}
    >
      {value || "---"}
    </span>
  </div>
));

DetailItem.displayName = "DetailItem";

/**
 * VehicleCardFooter - Check-in button
 */
const VehicleCardFooter = memo<{ onCheckIn: () => void }>(({ onCheckIn }) => (
  <div className="pt-2">
    <button
      onClick={onCheckIn}
      className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95"
    >
      <Sparkles size={16} /> צ'ק-אין / הזמן תור
    </button>
  </div>
));

VehicleCardFooter.displayName = "VehicleCardFooter";

export default VehicleCard;
