/**
 * Users Service
 * Centralizes all user/profile-related database operations
 */

import { supabase } from "@/services/api/client";
import {
  MembershipStatus,
  NotificationSettings,
  Organization,
  OrganizationSettings,
  Profile,
  UserRole,
  Vehicle,
} from "@/types";
import { UserNotFoundError } from "@/shared/utils/errors";

// DTOs
export interface UpdateProfileDTO {
  full_name?: string;
  phone?: string | null;
  secondary_phone?: string | null;
  address?: string | null;
  role?: UserRole;
  membership_status?: MembershipStatus;
  notification_settings?: NotificationSettings;
  avatar_url?: string;
  documents?: Record<string, string>;
}

export interface UpdateOrganizationDTO {
  name?: string;
  logo_url?: string;
  garage_code?: string;
  settings?: OrganizationSettings;
}

class UsersService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, organization:organizations(*)")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new UserNotFoundError(userId);
    }

    return data as Profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileDTO,
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("*, organization:organizations(*)")
      .single();

    if (error || !data) {
      throw new UserNotFoundError(userId);
    }

    return data as Profile;
  }

  /**
   * Fetch team members for an organization
   */
  async fetchTeamMembers(orgId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("org_id", orgId)
      .in("role", [UserRole.STAFF, UserRole.SUPER_MANAGER])
      .eq("membership_status", MembershipStatus.APPROVED);

    if (error) {
      console.error("[UsersService] fetchTeamMembers error:", error);
      throw error;
    }

    return (data || []) as Profile[];
  }

  /**
   * Fetch all admins for an organization
   */
  async fetchAdmins(orgId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("org_id", orgId)
      .eq("role", UserRole.SUPER_MANAGER)
      .eq("membership_status", MembershipStatus.APPROVED);

    if (error) {
      console.error("[UsersService] fetchAdmins error:", error);
      throw error;
    }

    return (data || []) as Profile[];
  }

  /**
   * Look up a customer by phone number
   */
  async lookupCustomerByPhone(
    phone: string,
  ): Promise<{ customer: Profile; vehicles: Vehicle[] } | null> {
    if (!phone) return null;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profileData) {
      return null;
    }

    const { data: vehiclesData } = await supabase
      .from("vehicles")
      .select("*")
      .eq("owner_id", profileData.id);

    return {
      customer: profileData as Profile,
      vehicles: vehiclesData || [],
    };
  }

  /**
   * Promote a user to admin role
   */
  async promoteToAdmin(userId: string): Promise<void> {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: UserRole.SUPER_MANAGER })
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    // Also update via RPC for auth metadata if available
    try {
      await supabase.rpc("update_user_role", {
        user_id: userId,
        new_role: UserRole.SUPER_MANAGER,
      });
    } catch (e) {
      // RPC might not exist, ignore
      console.warn("[UsersService] RPC update_user_role not available");
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    orgId: string,
    updates: UpdateOrganizationDTO,
  ): Promise<void> {
    const { error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", orgId);

    if (error) {
      throw error;
    }
  }

  /**
   * Get organization details
   */
  async getOrganization(orgId: string): Promise<Organization> {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}

// Export singleton instance
export const usersService = new UsersService();
