import React, { createContext, useCallback, useContext } from "react";
import { toast } from "sonner";
import { useAuth } from "@/src/features/auth";
import { Profile, Vehicle } from "@/types";
import {
  UpdateOrganizationDTO,
  UpdateProfileDTO,
  usersService,
} from "../services/users.service";

interface UsersContextType {
  promoteToAdmin: (userId: string) => Promise<void>;
  updateUser: (userId: string, data: UpdateProfileDTO) => Promise<void>;
  fetchTeamMembers: () => Promise<Profile[]>;
  lookupCustomerByPhone: (
    phone: string,
  ) => Promise<{ customer: Profile; vehicles: Vehicle[] } | null>;
  updateOrganization: (data: UpdateOrganizationDTO) => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();

  const updateUser = useCallback(
    async (userId: string, data: UpdateProfileDTO) => {
      try {
        await usersService.updateProfile(userId, data);
        toast.success("הפרופיל עודכן בהצלחה");
      } catch (error) {
        toast.error("נכשל בעדכון הפרופיל");
        throw error;
      }
    },
    [],
  );

  const updateOrganization = useCallback(
    async (updates: UpdateOrganizationDTO) => {
      if (!profile?.org_id) return;
      try {
        await usersService.updateOrganization(profile.org_id, updates);
        toast.success("פרטי המוסך עודכנו בהצלחה");
        window.location.reload();
      } catch (e) {
        console.error("Update organization failed:", e);
        toast.error("נכשל בעדכון פרטי המוסך");
        throw e;
      }
    },
    [profile],
  );

  const promoteToAdmin = useCallback(async (userId: string) => {
    try {
      await usersService.promoteToAdmin(userId);
      toast.success("Staff promoted to Admin successfully");
    } catch (e) {
      console.error("Promotion failed:", e);
      toast.error("Failed to promote user");
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    if (!profile?.org_id) return [];
    try {
      return await usersService.fetchTeamMembers(profile.org_id);
    } catch (error) {
      console.error("[UsersContext] fetchTeamMembers failed:", error);
      return [];
    }
  }, [profile]);

  const lookupCustomerByPhone = useCallback(async (phone: string) => {
    try {
      return await usersService.lookupCustomerByPhone(phone);
    } catch (e) {
      console.error("[UsersContext] lookupCustomerByPhone failed:", e);
      return null;
    }
  }, []);

  return (
    <UsersContext.Provider
      value={{
        promoteToAdmin,
        updateUser,
        fetchTeamMembers,
        lookupCustomerByPhone,
        updateOrganization,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) throw new Error("useUsers error");
  return context;
};
