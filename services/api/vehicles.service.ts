/**
 * Vehicles Service
 * Centralizes all vehicle-related database operations
 */

import { supabase } from "../../lib/supabase";
import { UserRole, Vehicle } from "../../types";
import { VehicleCreationError, VehicleNotFoundError } from "../errors";

// DTOs
export interface CreateVehicleDTO {
  org_id: string;
  plate: string;
  model: string;
  owner_id?: string | null;
  owner_name?: string | null;
  year?: string | null;
  color?: string | null;
  vin?: string | null;
  fuel_type?: string | null;
  engine_model?: string | null;
  registration_valid_until?: string | null;
  kodanit?: string | null;
}

export interface UpdateVehicleDTO {
  plate?: string;
  model?: string;
  owner_id?: string | null;
  owner_name?: string | null;
  year?: string | null;
  color?: string | null;
  vin?: string | null;
  fuel_type?: string | null;
  engine_model?: string | null;
  registration_valid_until?: string | null;
  kodanit?: string | null;
}

export interface FetchVehiclesOptions {
  orgId?: string;
  ownerId?: string;
  userRole?: UserRole;
}

class VehiclesService {
  /**
   * Fetch vehicles based on user context
   */
  async fetchVehicles(options: FetchVehiclesOptions): Promise<Vehicle[]> {
    const { orgId, ownerId, userRole } = options;

    let query = supabase
      .from("vehicles")
      .select("*, owner:profiles(full_name)")
      .order("created_at", { ascending: false });

    if (userRole === UserRole.CUSTOMER && ownerId) {
      query = query.eq("owner_id", ownerId);
    } else if (orgId) {
      query = query.eq("org_id", orgId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[VehiclesService] fetchVehicles error:", error);
      throw error;
    }

    return (data || []) as Vehicle[];
  }

  /**
   * Get vehicle by ID
   */
  async getVehicle(vehicleId: string): Promise<Vehicle> {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, owner:profiles(full_name)")
      .eq("id", vehicleId)
      .single();

    if (error || !data) {
      throw new VehicleNotFoundError(vehicleId);
    }

    return data as Vehicle;
  }

  /**
   * Get vehicle by plate number
   */
  async getVehicleByPlate(
    plate: string,
    orgId: string,
  ): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, owner:profiles(full_name)")
      .eq("plate", plate)
      .eq("org_id", orgId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data as Vehicle;
  }

  /**
   * Get vehicle IDs for a specific owner
   */
  async getVehicleIdsByOwner(ownerId: string): Promise<string[]> {
    const { data } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", ownerId);

    return (data || []).map((v: { id: string }) => v.id);
  }

  /**
   * Create a new vehicle
   */
  async createVehicle(dto: CreateVehicleDTO): Promise<Vehicle> {
    const { data, error } = await supabase
      .from("vehicles")
      .insert(dto)
      .select("*, owner:profiles(full_name)")
      .single();

    if (error || !data) {
      throw new VehicleCreationError(error);
    }

    return data as Vehicle;
  }

  /**
   * Update an existing vehicle
   */
  async updateVehicle(
    vehicleId: string,
    updates: UpdateVehicleDTO,
  ): Promise<Vehicle> {
    const { data, error } = await supabase
      .from("vehicles")
      .update(updates)
      .eq("id", vehicleId)
      .select("*, owner:profiles(full_name)")
      .single();

    if (error || !data) {
      throw new VehicleNotFoundError(vehicleId);
    }

    return data as Vehicle;
  }

  /**
   * Delete a vehicle by plate
   */
  async deleteVehicleByPlate(plate: string): Promise<void> {
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("plate", plate);

    if (error) {
      throw error;
    }
  }

  /**
   * Delete a vehicle by ID
   */
  async deleteVehicle(vehicleId: string): Promise<void> {
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);

    if (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const vehiclesService = new VehiclesService();
