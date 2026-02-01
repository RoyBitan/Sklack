import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/src/features/auth";
import { UserRole, Vehicle } from "@/types";
import {
  CreateVehicleDTO,
  vehiclesService,
} from "../services/vehicles.service";

interface VehiclesContextType {
  vehicles: Vehicle[];
  loading: boolean;
  refreshVehicles: () => Promise<void>;
  addVehicle: (vehicle: Partial<Vehicle>) => Promise<void>;
  removeVehicle: (plate: string) => Promise<void>;
}

const VehiclesContext = createContext<VehiclesContextType | undefined>(
  undefined,
);

export const VehiclesProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshVehicles = useCallback(async () => {
    const curr = profileRef.current;
    if (!curr?.org_id && curr?.role !== UserRole.CUSTOMER) return;

    setLoading(true);
    try {
      const data = await vehiclesService.fetchVehicles({
        orgId: curr.org_id || undefined,
        ownerId: curr.id,
        userRole: curr.role,
      });
      setVehicles(data);
    } catch (err) {
      console.error("Failed to fetch vehicles", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
    const curr = profileRef.current;
    if (!curr?.org_id) return;

    try {
      const dto: CreateVehicleDTO = {
        org_id: curr.org_id,
        plate: vehicleData.plate || "",
        model: vehicleData.model || "",
        owner_id: curr.role === UserRole.CUSTOMER
          ? curr.id
          : vehicleData.owner_id,
        owner_name: vehicleData.owner_name,
        year: vehicleData.year,
        color: vehicleData.color,
        vin: vehicleData.vin,
        fuel_type: vehicleData.fuel_type,
        engine_model: vehicleData.engine_model,
        registration_valid_until: vehicleData.registration_valid_until,
        kodanit: vehicleData.kodanit,
      };

      await vehiclesService.createVehicle(dto);
      toast.success("רכב נוסף בהצלחה");
      await refreshVehicles();
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "נכשל בהוספת רכב";
      toast.error(message);
      throw e;
    }
  }, [refreshVehicles]);

  const removeVehicle = useCallback(async (plate: string) => {
    try {
      await vehiclesService.deleteVehicleByPlate(plate);
      toast.success("רכב הוסר בהצלחה");
      await refreshVehicles();
    } catch (e) {
      console.error(e);
      toast.error("נכשל בהסרת רכב");
    }
  }, [refreshVehicles]);

  // Initial Fetch & Realtime
  useEffect(() => {
    if (!profile) return;
    refreshVehicles();

    // Realtime subscription for vehicles
    const channel = supabase.channel(`vehicles-${profile.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "vehicles",
        filter: profile.role === UserRole.CUSTOMER
          ? `owner_id=eq.${profile.id}`
          : `org_id=eq.${profile.org_id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setVehicles((prev) => [payload.new as Vehicle, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === payload.new.id ? { ...v, ...payload.new } : v
            )
          );
        } else if (payload.eventType === "DELETE") {
          setVehicles((prev) => prev.filter((v) => v.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.org_id, profile?.role, refreshVehicles]);

  const value = {
    vehicles,
    loading,
    refreshVehicles,
    addVehicle,
    removeVehicle,
  };

  return (
    <VehiclesContext.Provider value={value}>
      {children}
    </VehiclesContext.Provider>
  );
};

export const useVehicles = () => {
  const context = useContext(VehiclesContext);
  if (context === undefined) {
    throw new Error("useVehicles must be used within a VehiclesProvider");
  }
  return context;
};
