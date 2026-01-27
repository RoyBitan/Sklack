import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  LogIn,
  Phone,
  Plus,
  Printer,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import { MembershipStatus, UserRole } from "../types";
import { normalizePhone } from "../utils/phoneUtils";
import { sanitize } from "../utils/formatters";
import { toast } from "sonner";

interface OrganizationViewProps {
  onboarding?: boolean;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ onboarding }) => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { promoteToAdmin } = useData();
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

  // Member Management
  const [members, setMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitePhone, setInvitePhone] = useState("");

  const isManager = profile?.role === UserRole.SUPER_MANAGER;

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

    if (data) setInvitations(data);
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      toast.error(err.message || "שגיאה בשליחת הזמנה");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("accept_invitation", {
        inv_id: invite.id,
      });
      if (error) throw error;

      await refreshProfile();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "שגיאה בקבלת ההזמנה");
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvite = async (invite: any) => {
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
        window.location.reload(); // Force full reload to ensure AuthGuard re-evaluates
      }, 500);
    } catch (err: any) {
      setError(err.message || "כשלו ניסיונות יצירת הארגון");
      console.error(err);
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
        .eq("garage_code", cleanedCode) // Changed to search by garage_code
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
      // Give the profile a moment to update, then navigate
      setTimeout(() => {
        window.location.reload(); // Force full reload to ensure AuthGuard re-evaluates
      }, 500);
    } catch (err: any) {
      setError(err.message || "הצטרפות למוסך נכשלה. נסה שוב.");
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (profile?.organization?.garage_code) {
      navigator.clipboard.writeText(profile.organization.garage_code);
      setInfoMessage("הועתק");
      setTimeout(() => setInfoMessage(""), 2000);
    }
  };

  if (onboarding) {
    if (!selectedPath) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fade-in-up">
          <div className="w-full max-w-5xl">
            <div className="flex justify-end mb-8">
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                <ArrowLeft size={20} />
                <span>Logout</span>
              </button>
            </div>

            <div className="text-center mb-16">
              <div className="bg-black text-white p-10 rounded-[2.5rem] mb-8 shadow-2xl inline-block">
                <Building2 size={80} />
              </div>
              <h2 className="text-5xl font-black tracking-tighter mb-4 text-gray-900">
                ברוכים הבאים!
              </h2>
              <p className="text-gray-500 font-bold text-lg max-w-2xl mx-auto">
                בחר את הפעולה המתאימה עבורך
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Show Create option ONLY for managers */}
              {profile?.role === UserRole.SUPER_MANAGER && (
                <button
                  onClick={() => setSelectedPath("create")}
                  className="card-premium p-12 hover:scale-105 transition-all duration-300 group text-start bg-gradient-to-br from-black to-gray-800 text-white"
                >
                  <div className="bg-white/20 p-8 rounded-[2rem] mb-8 inline-block group-hover:scale-110 transition-transform">
                    <Plus size={48} />
                  </div>
                  <h3 className="text-3xl font-black mb-4">צור מוסך חדש</h3>
                  <p className="text-white/80 font-bold leading-relaxed">
                    הפוך את המוסך שלך לדיגיטלי תוך פחות מדקה
                  </p>
                  <div className="mt-8 flex items-center gap-2 font-black text-sm">
                    <span>התחל עכשיו</span>
                    <ArrowRight size={20} />
                  </div>
                </button>
              )}

              {/* Show Join option ONLY for non-managers (Team/Customer) */}
              {profile?.role !== UserRole.SUPER_MANAGER && (
                <button
                  onClick={() => setSelectedPath("join")}
                  className="card-premium p-12 hover:scale-105 transition-all duration-300 group text-start"
                >
                  <div className="bg-blue-100 text-blue-600 p-8 rounded-[2rem] mb-8 inline-block group-hover:scale-110 transition-transform">
                    <LogIn size={48} />
                  </div>
                  <h3 className="text-3xl font-black mb-4 text-gray-900">
                    הצטרף למוסך קיים
                  </h3>
                  <p className="text-gray-500 font-bold leading-relaxed">
                    יש לך מזהה מוסך? הצטרף לצוות והתחל לעבוד
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-blue-600 font-black text-sm">
                    <span>המשך</span>
                    <ArrowRight size={20} />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fade-in-up">
        <div className="w-full max-w-2xl card-premium p-12 md:p-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-black"></div>
          <div className="flex justify-end mb-8">
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              <ArrowLeft size={20} />
              <span>Logout</span>
            </button>
          </div>

          <div className="flex flex-col items-center mb-16 text-center">
            <div className="bg-black text-white p-10 rounded-[2.5rem] mb-12 shadow-2xl transition-transform hover:scale-110">
              <Building2 size={80} />
            </div>
            <h2 className="text-5xl font-black tracking-tighter mb-6 leading-tight text-gray-900">
              {selectedPath === "create"
                ? "הקמת מוסך חדש"
                : "הצטרפות למוסך קיים"}
            </h2>
            <p className="text-gray-400 font-bold text-lg max-w-md mx-auto leading-relaxed italic">
              {selectedPath === "create"
                ? "תהליך ההקמה לוקח פחות מ-60 שניות. הפוך את המוסך שלך לדיגיטלי עוד היום."
                : "הזן את המזהה (ID) שקיבלת ממנהל המוסך כדי להתחיל לעבוד."}
            </p>
          </div>

          {selectedPath === "create"
            ? (
              <form onSubmit={handleCreateOrg} className="space-y-12">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 mb-4 px-2 uppercase tracking-[0.3em] text-start">
                    שם המוסך / העסק
                  </label>
                  <input
                    type="text"
                    required
                    className="input-premium h-24 text-2xl px-10"
                    placeholder="למשל: מוסך האומנים בע''מ"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>
                {error && <ErrorMessage message={error} />}
                <button
                  type="submit"
                  disabled={loading || !orgName.trim()}
                  className="btn-primary w-full h-24 flex items-center justify-center gap-6 text-2xl group relative overflow-hidden shadow-2xl"
                >
                  {loading ? <Spinner /> : (
                    <>
                      <span>צור את המוסך שלי</span>
                      <Plus size={32} />
                    </>
                  )}
                </button>
              </form>
            )
            : (
              <form onSubmit={handleJoinOrg} className="space-y-12">
                {invitations.length > 0 && (
                  <div className="space-y-4 animate-fade-in-up">
                    <label className="block text-[11px] font-black text-orange-400 uppercase tracking-[0.3em] px-2">
                      יש לך הזמנות ממתינות
                    </label>
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="bg-orange-50 border border-orange-100 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-4 text-start">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Building2 size={24} className="text-orange-500" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-gray-900">
                              הזמנה מ {inv.organization.name}
                            </div>
                            <div className="text-[10px] text-orange-600/60 font-black uppercase tracking-widest">
                              מזהה: {inv.org_id.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptInvite(inv)}
                            className="p-3 bg-green-500 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                          >
                            <Check size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineInvite(inv)}
                            className="p-3 bg-black text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-black text-gray-400 mb-4 px-2 uppercase tracking-[0.3em] text-start">
                    קוד מוסך (Garage Code)
                  </label>
                  <input
                    type="text"
                    required
                    className="input-premium h-24 text-2xl px-10 font-mono tracking-widest uppercase"
                    placeholder="AB123"
                    value={orgIdToJoin}
                    onChange={(e) =>
                      setOrgIdToJoin(e.target.value.toUpperCase())}
                  />

                  <p className="text-[10px] text-gray-400 font-bold px-2 text-center mt-4">
                    הזן את המזהה (ID) שקיבלת ממנהל המוסך כדי להתחיל לעבוד.
                  </p>

                  <div className="flex justify-between mt-6 px-2">
                    <p className="text-[10px] text-gray-400 font-bold">
                      * בקש ממנהל המוסך את המזהה
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setSearchMode(searchMode === "ID" ? "PHONE" : "ID")}
                      className="text-[10px] font-bold text-blue-600 underline"
                    >
                      {searchMode === "ID"
                        ? "או חפש לפי טלפון מנהל"
                        : "חפש לפי מזהה (ID)"}
                    </button>
                  </div>
                  {searchMode === "PHONE" && (
                    <div className="mt-4 animate-fade-in-up">
                      <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">
                        טלפון המנהל
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          className="input-premium flex-1"
                          placeholder="050-0000000"
                          value={managerPhone}
                          onChange={(e) => setManagerPhone(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handlePhoneSearch}
                          className="bg-black text-white px-6 rounded-[1.2rem] font-bold text-sm"
                        >
                          חפש
                        </button>
                      </div>
                      {infoMessage && (
                        <p className="text-green-600 font-bold text-sm mt-2 px-2">
                          {infoMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {error && <ErrorMessage message={error} />}
                <button
                  type="submit"
                  disabled={loading || !orgIdToJoin.trim()}
                  className="btn-primary w-full h-24 flex items-center justify-center gap-6 text-2xl group relative overflow-hidden shadow-2xl"
                >
                  {loading ? <Spinner /> : (
                    <>
                      <span>הצטרף לצוות</span>
                      <LogIn size={32} />
                    </>
                  )}
                </button>
              </form>
            )}
        </div>
      </div>
    );
  }

  const orgDisplayName = profile?.membership_status === MembershipStatus.PENDING
    ? "בהמתנה לאישור"
    : (isManager
      ? `המוסך של ${profile?.full_name?.split?.(" ")?.[0] || "המנהל"} `
      : "חבר בארגון");

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-12 px-8 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b-4 border-black pb-12">
        <div>
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none mb-4">
            ניהול מוסך
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-sm">
            Organization & Team Settings
          </p>
        </div>
        {isManager && (
          <div className="bg-black text-white px-8 py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-widest shadow-xl">
            Admin Panel
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 card-premium p-12 relative group">
          <div className="absolute top-8 right-8 text-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Building2 size={120} />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-10 mb-12">
            <div className="w-24 h-24 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
              <Building2 size={48} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">
                שם הארגון הפעיל
              </div>
              <div className="text-5xl font-black tracking-tight text-gray-900">
                {profile?.org_id ? orgDisplayName : "אין ארגון"}
              </div>
            </div>
          </div>
          <div className="p-10 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 transition-colors hover:bg-white hover:border-gray-200">
            <div className="text-center md:text-right">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3">
                קוד מוסך (Garage Code)
              </div>
              <div className="font-mono text-lg font-black text-gray-400 tracking-tight">
                {profile?.organization?.garage_code || "---"}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={copyToClipboard}
                className="px-10 h-16 bg-white text-black rounded-[1.2rem] shadow-xl border-2 border-black/5 hover:scale-110 active:scale-95 transition-all text-sm font-black flex items-center gap-4"
              >
                <Copy size={20} />{" "}
                {infoMessage === "הועתק" ? "הועתק!" : "העתק מזהה"}
              </button>
            </div>
          </div>
        </div>

        <div className="card-premium p-12 flex flex-col justify-center items-center text-center group hover:bg-black hover:text-white transition-colors duration-500">
          <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:bg-white/10 group-hover:text-white transition-colors">
            <Users size={56} />
          </div>
          <div className="text-7xl font-black mb-2 tracking-tighter">
            {members.length}
          </div>
          <div className="text-[11px] font-black text-gray-400 group-hover:text-gray-400 uppercase tracking-[0.3em]">
            חברים פעילים
          </div>
        </div>
      </div>

      {pendingRequests.length > 0 && isManager && (
        <div className="card-premium p-12 overflow-hidden relative border-orange-200 bg-orange-50">
          <h3 className="text-3xl font-black flex items-center gap-4 text-orange-900 mb-8">
            <AlertCircle size={32} className="text-orange-600" />בקשות הצטרפות
            ({pendingRequests.length})
          </h3>
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-6 rounded-[1.5rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm border border-orange-100"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-start flex-1">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black shrink-0">
                    {req.full_name[0]}
                  </div>
                  <div>
                    <div className="font-black text-lg">{req.full_name}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                      {req.role}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                  <button
                    onClick={() =>
                      handleMembershipAction(req.id, MembershipStatus.APPROVED)}
                    className="w-full md:w-auto p-4 md:p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors flex items-center justify-center gap-2 font-bold md:font-normal"
                  >
                    <Check size={20} />
                    <span className="md:hidden">אשר</span>
                  </button>
                  <button
                    onClick={() =>
                      handleMembershipAction(req.id, MembershipStatus.REJECTED)}
                    className="w-full md:w-auto p-4 md:p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2 font-bold md:font-normal"
                  >
                    <X size={20} />
                    <span className="md:hidden">דחה</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-premium p-12 overflow-hidden relative">
        <div className="flex items-center justify-between mb-12">
          <h3 className="text-3xl font-black flex items-center gap-6">
            <Shield size={36} className="text-black" />
            <span className="tracking-tighter">צוות ולקוחות</span>
          </h3>
          {isManager && (
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="050-0000000"
                className="input-premium py-2 px-4 h-12 text-sm"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />
              <button
                onClick={handleInvite}
                disabled={loading || !invitePhone.trim()}
                className="bg-black text-white px-6 rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all"
              >
                הזמן למוסך
              </button>
            </div>
          )}
        </div>
        <div className="space-y-6">
          {members.length === 0
            ? (
              <div className="text-center py-10 text-gray-400 font-black uppercase tracking-widest">
                אין חברים להצגה
              </div>
            )
            : members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col w-full"
              >
                <div
                  className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 hover:bg-white hover:shadow-xl transition-all duration-300 group/row cursor-pointer"
                  onClick={() =>
                    setExpandedMember(
                      expandedMember === member.id ? null : member.id,
                    )}
                >
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center font-black text-2xl shadow-xl transition-transform group-hover/row:scale-110">
                      {member.full_name?.[0]}
                    </div>
                    <div className="text-center md:text-right">
                      <div className="font-black text-2xl tracking-tight text-gray-900">
                        {member.full_name}
                      </div>
                      <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                        {member.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-6 py-2 ${
                        member.role === UserRole.CUSTOMER
                          ? "bg-blue-50 text-blue-600 border-blue-100"
                          : "bg-green-50 text-green-600 border-green-100"
                      } text-[10px] font-black rounded-full uppercase tracking-widest border shadow-sm`}
                    >
                      {member.role === UserRole.CUSTOMER ? "Client" : "Staff"}
                    </span>
                    {isManager && member.role === UserRole.STAFF && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(`האם לקדם את ${member.full_name} למנהל?`)
                          ) {
                            promoteToAdmin(member.id);
                          }
                        }}
                        className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-blue-700 shadow-md active:scale-95 transition-all"
                        title="קדם למנהל"
                      >
                        <Shield size={14} /> קדם
                      </button>
                    )}
                    {expandedMember === member.id
                      ? <ChevronUp size={20} className="text-gray-300" />
                      : <ChevronDown size={20} className="text-gray-300" />}
                  </div>
                </div>

                {expandedMember === member.id && (
                  <div className="mt-4 p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] animate-fade-in-up space-y-8">
                    {/* Admin Power: Promote Staff */}
                    {isManager && member.role === UserRole.STAFF && (
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-blue-50 rounded-[1.8rem] border border-blue-100">
                        <div className="text-start">
                          <div className="font-black text-blue-900">
                            קידום למנהל
                          </div>
                          <div className="text-xs text-blue-700/60 font-bold">
                            הענק למשתמש זה גישה מלאה ללוח הבקרה והניהול
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(`האם לקדם את ${member.full_name} למנהל?`)
                            ) promoteToAdmin(member.id);
                          }}
                          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
                        >
                          <Shield size={18} /> קדם למנהל
                        </button>
                      </div>
                    )}

                    {/* Document Management Section */}
                    {isManager && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">
                          <FileText size={14} /> מסמכי לקוח / עובד
                        </div>

                        {member.documents &&
                            Object.keys(member.documents).length > 0
                          ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(
                                member.documents as Record<string, string>,
                              ).map(([type, url]) => (
                                <div
                                  key={type}
                                  className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col gap-4"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                      {type}
                                    </div>
                                    <div className="flex gap-2">
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="View/Download"
                                        className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-black hover:border-black transition-all"
                                      >
                                        <Download size={14} />
                                      </a>
                                      <button
                                        onClick={() => {
                                          const win = window.open(
                                            url,
                                            "_blank",
                                          );
                                          if (win) win.print();
                                        }}
                                        title="Print"
                                        className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-black hover:border-black transition-all"
                                      >
                                        <Printer size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="aspect-video bg-white rounded-xl overflow-hidden border border-gray-100">
                                    {url.toLowerCase().endsWith(".pdf")
                                      ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                          <FileText size={40} />
                                          <span className="text-[10px] font-black uppercase mt-2">
                                            PDF Document
                                          </span>
                                        </div>
                                      )
                                      : (
                                        <img
                                          src={url}
                                          alt={type}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                          : (
                            <div className="text-center py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                              <div className="text-xs font-bold text-gray-400">
                                לא הועלו מסמכים עבור משתמש זה
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] flex items-start gap-5 border border-red-100 animate-shake shadow-lg shadow-red-100">
    <AlertCircle size={28} className="shrink-0 mt-0.5" />
    <p className="text-lg font-black leading-tight">{message}</p>
  </div>
);

const Spinner: React.FC = () => (
  <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin">
  </div>
);

export default OrganizationView;
