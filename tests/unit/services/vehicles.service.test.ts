import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { VehiclesService } from "@/src/features/vehicles/services/vehicles.service";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("VehiclesService", () => {
  let service: VehiclesService;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VehiclesService();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);
  });

  describe("fetchVehicles", () => {
    it("should fetch vehicles for staff", async () => {
      await service.fetchVehicles({ orgId: "org-1" });
      expect(mockChain.eq).toHaveBeenCalledWith("org_id", "org-1");
    });

    it("should fetch vehicles for customer", async () => {
      await service.fetchVehicles({
        ownerId: "user-1",
        userRole: UserRole.CUSTOMER,
      });
      expect(mockChain.eq).toHaveBeenCalledWith("owner_id", "user-1");
    });

    it("should throw error on failure", async () => {
      mockChain.then.mockImplementation((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(service.fetchVehicles({})).rejects.toThrow();
    });
  });

  describe("getVehicle", () => {
    it("should fetch vehicle by ID", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "v1" },
        error: null,
      });
      const result = await service.getVehicle("v1");
      expect(mockChain.eq).toHaveBeenCalledWith("id", "v1");
      expect(result.id).toBe("v1");
    });

    it("should throw error if not found", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.getVehicle("v1")).rejects.toThrow();
    });
  });

  describe("getVehicleByPlate", () => {
    it("should fetched vehicle by plate", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "v1", plate: "123" },
        error: null,
      });
      const result = await service.getVehicleByPlate("123", "org-1");
      expect(mockChain.eq).toHaveBeenCalledWith("plate", "123");
      expect(result?.id).toBe("v1");
    });

    it("should return null on PGRST116 (not found)", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });
      const result = await service.getVehicleByPlate("123", "org-1");
      expect(result).toBeNull();
    });

    it("should throw on other errors", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "OTHER" },
      });
      await expect(service.getVehicleByPlate("123", "org-1")).rejects.toThrow();
    });
  });

  describe("getVehicleIdsByOwner", () => {
    it("should return list of IDs", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: [{ id: "v1" }, { id: "v2" }], error: null }),
        );
      });
      const result = await service.getVehicleIdsByOwner("u1");
      expect(result).toEqual(["v1", "v2"]);
    });
  });

  describe("createVehicle", () => {
    it("should insert vehicle", async () => {
      const dto = { org_id: "org-1", plate: "123", model: "M1" };
      mockChain.single.mockResolvedValueOnce({
        data: { id: "v1", ...dto },
        error: null,
      });
      const result = await service.createVehicle(dto);
      expect(mockChain.insert).toHaveBeenCalledWith(dto);
      expect(result.id).toBe("v1");
    });

    it("should throw on creation failure", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.createVehicle({} as any)).rejects.toThrow();
    });
  });

  describe("updateVehicle", () => {
    it("should update vehicle", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "v1", model: "New" },
        error: null,
      });
      const result = await service.updateVehicle("v1", { model: "New" });
      expect(mockChain.update).toHaveBeenCalledWith({ model: "New" });
      expect(result.model).toBe("New");
    });
  });

  describe("deleteVehicleByPlate", () => {
    it("should delete by plate", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });
      await service.deleteVehicleByPlate("123");
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith("plate", "123");
    });

    it("should throw on delete failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: { message: "Fail" } }));
      });
      await expect(service.deleteVehicleByPlate("123")).rejects.toThrow();
    });
  });

  describe("deleteVehicle", () => {
    it("should delete by ID", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });
      await service.deleteVehicle("v1");
      expect(mockChain.eq).toHaveBeenCalledWith("id", "v1");
    });
  });
});
