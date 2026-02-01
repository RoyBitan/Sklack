import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { UsersService } from "@/src/features/users/services/users.service";
import { supabase } from "@/lib/supabase";
import { MembershipStatus, UserRole } from "@/types";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe("UsersService", () => {
  let service: UsersService;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);
  });

  describe("getProfile", () => {
    it("should fetch user profile by ID", async () => {
      const mockProfile = { id: "u1", full_name: "John Doe" };
      mockChain.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const result = await service.getProfile("u1");

      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(mockChain.eq).toHaveBeenCalledWith("id", "u1");
      expect(result).toEqual(mockProfile);
    });

    it("should throw error when profile not found", async () => {
      mockChain.single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });
      await expect(service.getProfile("u1")).rejects.toThrow();
    });
  });

  describe("updateProfile", () => {
    it("should update profile successfully", async () => {
      const mockResult = { id: "u1", full_name: "Jane Doe" };
      mockChain.single.mockResolvedValueOnce({ data: mockResult, error: null });

      const result = await service.updateProfile("u1", {
        full_name: "Jane Doe",
      });

      expect(mockChain.update).toHaveBeenCalledWith({ full_name: "Jane Doe" });
      expect(result.full_name).toBe("Jane Doe");
    });
  });

  describe("fetchTeamMembers", () => {
    it("should fetch team members", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: [{ id: "m1" }], error: null }),
        );
      });

      const result = await service.fetchTeamMembers("org-1");

      expect(mockChain.eq).toHaveBeenCalledWith("org_id", "org-1");
      expect(mockChain.in).toHaveBeenCalledWith("role", [
        UserRole.STAFF,
        UserRole.SUPER_MANAGER,
      ]);
      expect(result).toHaveLength(1);
    });

    it("should throw failure error", async () => {
      mockChain.then.mockImplementation((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(service.fetchTeamMembers("org-1")).rejects.toThrow();
    });
  });

  describe("fetchAdmins", () => {
    it("should fetch admins only", async () => {
      await service.fetchAdmins("org-1");
      expect(mockChain.eq).toHaveBeenCalledWith("role", UserRole.SUPER_MANAGER);
    });

    it("should throw on failure", async () => {
      mockChain.then.mockImplementation((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(service.fetchAdmins("org-1")).rejects.toThrow();
    });
  });

  describe("lookupCustomerByPhone", () => {
    it("should return customer and vehicles when found", async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: { id: "u1" },
        error: null,
      });
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: [{ id: "v1" }], error: null }),
        );
      });

      const result = await service.lookupCustomerByPhone("12345");

      expect(result?.customer.id).toBe("u1");
      expect(result?.vehicles).toHaveLength(1);
    });

    it("should return null when profile not found", async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await service.lookupCustomerByPhone("000");
      expect(result).toBeNull();
    });

    it("should return null if no phone provided", async () => {
      const result = await service.lookupCustomerByPhone("");
      expect(result).toBeNull();
    });

    it("should throw if profile fetch fails", async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.lookupCustomerByPhone("123")).rejects.toThrow();
    });
  });

  describe("promoteToAdmin", () => {
    it("should update role and call RPC", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });

      await service.promoteToAdmin("u1");

      expect(mockChain.update).toHaveBeenCalledWith({
        role: UserRole.SUPER_MANAGER,
      });
      expect(supabase.rpc).toHaveBeenCalledWith("update_user_role", {
        user_id: "u1",
        new_role: UserRole.SUPER_MANAGER,
      });
    });

    it("should ignore RPC error", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });
      (supabase.rpc as Mock).mockRejectedValueOnce(new Error("RPC Fail"));

      await expect(service.promoteToAdmin("u1")).resolves.not.toThrow();
    });
  });

  describe("updateOrganization", () => {
    it("should update organization table", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });

      await service.updateOrganization("org-1", { name: "New Name" });
      expect(supabase.from).toHaveBeenCalledWith("organizations");
      expect(mockChain.update).toHaveBeenCalledWith({ name: "New Name" });
    });

    it("should throw on failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: { message: "Fail" } }));
      });
      await expect(service.updateOrganization("org-1", {})).rejects.toThrow();
    });
  });

  describe("getOrganization", () => {
    it("should fetch organization details", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "org-1", name: "Org" },
        error: null,
      });
      const result = await service.getOrganization("org-1");
      expect(result.name).toBe("Org");
    });

    it("should throw on error", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.getOrganization("org-1")).rejects.toThrow();
    });
  });
});
