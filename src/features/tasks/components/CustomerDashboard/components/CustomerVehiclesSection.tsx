import React, { memo, useCallback } from "react";
import { Car, Plus, PlusCircle } from "lucide-react";
import { Vehicle } from "@/types";
import { VehicleCard } from "@/src/features/vehicles";
import { Button, Card } from "@/src/shared/components/ui";

interface CustomerVehiclesSectionProps {
  vehicles: Vehicle[];
  t: (key: string) => string;
  onAddVehicle: () => void;
  onRemoveVehicle: (plate: string) => void;
  onCheckIn: (vehicle: Vehicle) => void;
}

const CustomerVehiclesSection: React.FC<CustomerVehiclesSectionProps> = memo(({
  vehicles,
  t,
  onAddVehicle,
  onRemoveVehicle,
  onCheckIn,
}) => {
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
        <Button
          onClick={onAddVehicle}
          variant="primary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus size={18} /> הוסף רכב נוסף
        </Button>
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

const MemoizedVehicleCard = memo(VehicleCard);

const EmptyVehiclesState = memo<{ onAddVehicle: () => void }>((
  { onAddVehicle },
) => (
  <Card
    variant="flat"
    padding="lg"
    className="text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center shadow-inner"
  >
    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
      <Car size={40} />
    </div>
    <p className="text-gray-500 font-black text-lg">
      טרם רשמת רכבים בחשבונך.
    </p>
    <Button
      onClick={onAddVehicle}
      variant="primary"
      size="lg"
      className="mt-6 flex items-center gap-2"
    >
      <PlusCircle size={20} /> רשום רכב ראשון
    </Button>
  </Card>
));

EmptyVehiclesState.displayName = "EmptyVehiclesState";

export default CustomerVehiclesSection;
