import React, { memo, useCallback } from "react";
import { Car, Plus, PlusCircle } from "lucide-react";
import { Vehicle } from "../../../types";
import VehicleCard from "../../VehicleCard";

interface CustomerVehiclesSectionProps {
  vehicles: Vehicle[];
  t: (key: string) => string;
  onAddVehicle: () => void;
  onRemoveVehicle: (plate: string) => void;
  onCheckIn: (vehicle: Vehicle) => void;
}

/**
 * CustomerVehiclesSection - Memoized for performance
 * Only re-renders when vehicles array or callbacks change
 */
const CustomerVehiclesSection: React.FC<CustomerVehiclesSectionProps> = memo(({
  vehicles,
  t,
  onAddVehicle,
  onRemoveVehicle,
  onCheckIn,
}) => {
  // Memoize the delete handler factory to prevent new function on each render
  const handleDeleteVehicle = useCallback((plate: string) => {
    if (
      confirm(
        t("deleteVehicleConfirm") ||
          "Are you sure you want to delete this vehicle?",
      )
    ) {
      onRemoveVehicle(plate);
    }
  }, [t, onRemoveVehicle]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <h3 className="font-black text-2xl text-gray-900 tracking-tight flex items-center gap-3">
          <Car size={26} className="text-blue-600" />
          הרכבים שלי ({vehicles.length})
        </h3>
        <button
          onClick={onAddVehicle}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> הוסף רכב נוסף
        </button>
      </div>

      {vehicles.length > 0
        ? (
          <VehicleGrid
            vehicles={vehicles}
            onDelete={handleDeleteVehicle}
            onCheckIn={onCheckIn}
          />
        )
        : <EmptyVehiclesState onAddVehicle={onAddVehicle} />}
    </section>
  );
});

CustomerVehiclesSection.displayName = "CustomerVehiclesSection";

/**
 * VehicleGrid - Memoized grid of vehicle cards
 */
const VehicleGrid = memo<{
  vehicles: Vehicle[];
  onDelete: (plate: string) => void;
  onCheckIn: (vehicle: Vehicle) => void;
}>(({ vehicles, onDelete, onCheckIn }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {vehicles.map((v) => (
      <MemoizedVehicleCard
        key={v.plate}
        vehicle={v}
        onDelete={() => onDelete(v.plate)}
        onCheckIn={() => onCheckIn(v)}
      />
    ))}
  </div>
));

VehicleGrid.displayName = "VehicleGrid";

/**
 * MemoizedVehicleCard - Wrapped VehicleCard with memo
 */
const MemoizedVehicleCard = memo(VehicleCard);

/**
 * EmptyVehiclesState - Empty state component (memoized since it's static)
 */
const EmptyVehiclesState = memo<{ onAddVehicle: () => void }>((
  { onAddVehicle },
) => (
  <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center shadow-inner">
    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
      <Car size={40} />
    </div>
    <p className="text-gray-500 font-black text-lg">
      טרם רשמת רכבים בחשבונך.
    </p>
    <button
      onClick={onAddVehicle}
      className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm mt-6 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
    >
      <PlusCircle size={20} /> רשום רכב ראשון
    </button>
  </div>
));

EmptyVehiclesState.displayName = "EmptyVehiclesState";

export default CustomerVehiclesSection;
