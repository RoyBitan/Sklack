import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { useData } from "@/shared/context/DataContext";
import { supabase } from "@/services/api/client";
import { Invitation, MembershipStatus, Profile, UserRole } from "@/types";
import { normalizePhone } from "@/shared/utils/phoneUtils";
import { sanitize } from "@/shared/utils/formatters";
import { scrollToFormStart } from "@/shared/utils/uiUtils";

interface UseOrganizationLogicProps {
  onboarding?: boolean;
}

export const useOrganizationLogic = (
  { onboarding }: UseOrganizationLogicProps,
) => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { promoteToAdmin } = useData();

  // State
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgIdToJoin, setOrgIdToJoin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [selectedPath, setSelectedPath] = useState<"join" | "create" | null>(
    null,
  );
  const [managerPhone, setManagerPhone] = useState("");
  const [searchMode, setSearchMode] = useState<"ID" | "PHONE">("ID");
  const formRef = useRef<HTMLDivElement>(null);

  // Data State
  const [members, setMembers] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitePhone, setInvitePhone] = useState("");

  const isManager = profile?.role === UserRole.SUPER_MANAGER;

  // Effects
  useEffect(() => {
    if (profile?.org_id && !onboarding) {
      fetchMembers();
    } else if (onboarding) {
      fetchInvitations();

      if (!selectedPath) {
        // Priority: Registration Metadata Role > Profile Role
        const rawRole = user?.user_metadata?.role;
        const currentRole = rawRole || profile?.role;

        if (currentRole === UserRole.SUPER_MANAGER) {
          setSelectedPath("create");
        } else if (currentRole) {
          setSelectedPath("join");
        }
      }
    }
  }, [profile?.org_id, onboarding, profile?.role, user?.user_metadata]);

  useEffect(() => {
    if (selectedPath && formRef.current) {
      scrollToFormStart(formRef);
    }
  }, [selectedPath]);

  // Actions
  const fetchMembers = async () => {
    if (!profile?.org_id) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("org_id", profile.org_id);

    if (data) {
      setMembers(
        data.filter((m) => m.membership_status === MembershipStatus.APPROVED),
      );
      setPendingRequests(
        data.filter((m) => m.membership_status === MembershipStatus.PENDING),
      );
    }
  };

  const fetchInvitations = async () => {
    if (!profile?.phone) return;

    const { data, error } = await supabase
      .from("invitations")
      .select("*, organization:organizations(name, id)")
      .eq("phone", profile.phone)
      .eq("status", "PENDING");

    if (data) setInvitations(data || []);
  };

  const handleMembershipAction = async (
    userId: string,
    status: MembershipStatus,
  ) => {
    try {
      const { error } = await supabase.from("profiles").update({
        membership_status: status,
      }).eq("id", userId);
      if (error) throw error;
      fetchMembers();
    } catch (e) {
      console.error(e);
      toast.error("הפעולה נכשלה");
    }
  };

  const handleInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invitePhone.trim() || !profile?.org_id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("invitations").insert({
        phone: normalizePhone(invitePhone),
        org_id: profile.org_id,
        invited_by: profile.id,
      });
      if (error) throw error;
      setInvitePhone("");
      setInfoMessage("הזמנה נשלחה בהצלחה!");
      setTimeout(() => setInfoMessage(""), 3000);
      toast.success("הזמנה נשלחה בהצלחה");
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בשליחת הזמנה";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (
    invite: Invitation,
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("accept_invitation", {
        inv_id: invite.id,
      });
      if (error) throw error;

      await refreshProfile();
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בקבלת ההזמנה";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async (
    invite: Invitation,
  ) => {
    try {
      await supabase.from("invitations").update({ status: "DECLINED" }).eq(
        "id",
        invite.id,
      );
      fetchInvitations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !user) return;

    setLoading(true);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc("create_organization", {
        org_name: sanitize(orgName),
      });
      if (rpcError) throw rpcError;
      await refreshProfile();
      // Give the profile a moment to update, then navigate to dashboard
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "כשלו ניסיונות יצירת הארגון";
      setError(message);
      console.error(err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSearch = async () => {
    if (!managerPhone.trim()) return;
    setError("");
    setInfoMessage("");
    try {
      const normalized = normalizePhone(managerPhone);
      const { data } = await supabase.rpc("get_org_by_manager_phone", {
        manager_phone: normalized,
      });
      if (data && data.length > 0) {
        setOrgIdToJoin(sanitize(data[0].garage_code).toUpperCase());
        setInfoMessage(`נמצא מוסך: ${data[0].org_name} `);
      } else {
        setError("לא נמצא מוסך עבור מספר זה");
      }
    } catch (e) {
      setError("שגיאה בחיפוש");
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgIdToJoin.trim() || !user) return;

    setLoading(true);
    setError("");

    try {
      const cleanedCode = sanitize(orgIdToJoin).toUpperCase();
      const { data: org, error: fetchError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("garage_code", cleanedCode)
        .single();

      if (fetchError || !org) {
        throw new Error("לא נמצא מוסך עם המזהה שהוזן. נא לבדוק שנית.");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ org_id: org.id, membership_status: MembershipStatus.PENDING })
        .eq("id", user.id);

      if (updateError) throw updateError;
      await refreshProfile();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "הצטרפות למוסך נכשלה. נסה שוב.";
      setError(message);
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (profile?.organization?.garage_code) {
      navigator.clipboard.writeText(profile.organization.garage_code);
      setInfoMessage("הועתק");
      toast.success("הקוד הועתק ללוח");
      setTimeout(() => setInfoMessage(""), 2000);
    }
  };

  const orgDisplayName = profile?.membership_status === MembershipStatus.PENDING
    ? "בהמתנה לאישור"
    : (isManager
      ? `המוסך של ${profile?.full_name?.split?.(" ")?.[0] || "המנהל"} `
      : "חבר בארגון");

  return {
    // Global Auth / Data
    user,
    profile,
    signOut,
    isManager,
    promoteToAdmin,

    // Local State
    expandedMember,
    setExpandedMember,
    orgName,
    setOrgName,
    orgIdToJoin,
    setOrgIdToJoin,
    loading,
    setLoading,
    error,
    setError,
    infoMessage,
    setInfoMessage,
    selectedPath,
    setSelectedPath,
    managerPhone,
    setManagerPhone,
    searchMode,
    setSearchMode,
    formRef,

    // Data
    members,
    pendingRequests,
    invitations,
    invitePhone,
    setInvitePhone,

    // Logic
    handleCreateOrg,
    handleJoinOrg,
    handleInvite,
    handleAcceptInvite,
    handleDeclineInvite,
    handlePhoneSearch,
    copyToClipboard,
    handleMembershipAction,
    orgDisplayName,
  };
};
