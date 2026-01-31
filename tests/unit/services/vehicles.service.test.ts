import { beforeEach, describe, expect, it, vi } from "vitest";
import { vehiclesService } from "@/services/api/vehicles.service";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types";

describe("VehiclesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchVehicles", () => {
    it("should fetch vehicles with filter for CUSTOMER role", async () => {
      const mockOwnerId = "owner-123";

      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnValue({ data: [], error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: mockOrder,
        eq: mockEq,
      } as any);

      // We need to handle the chain properly. Since mockReturnThis() returns the same object,
      // and we want the final call in the chain to return the data.
      const queryMock = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ id: "v1" }], error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(queryMock as any);

      const result = await vehiclesService.fetchVehicles({
        ownerId: mockOwnerId,
        userRole: UserRole.CUSTOMER,
      });

      expect(queryMock.eq).toHaveBeenCalledWith("owner_id", mockOwnerId);
      expect(result).toEqual([{ id: "v1" }]);
    });
  });

  describe("getVehicleByPlate", () => {
    it("should return vehicle when found", async () => {
      const mockVehicle = { id: "1", plate: "1234567" };

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVehicle, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(queryMock as any);

      const result = await vehiclesService.getVehicleByPlate(
        "1234567",
        "org-1",
      );

      expect(result).toEqual(mockVehicle);
    });

    it("should return null on PGRST116 error (no rows found)", async () => {
      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(queryMock as any);

      const result = await vehiclesService.getVehicleByPlate(
        "1234567",
        "org-1",
      );

      expect(result).toBeNull();
    });
  });
});
