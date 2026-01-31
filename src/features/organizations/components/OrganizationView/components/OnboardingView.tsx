import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  LogIn,
  Plus,
  X,
} from "lucide-react";
import { Invitation, Profile, UserRole } from "@/types";

interface OnboardingViewProps {
  selectedPath: "join" | "create" | null;
  setSelectedPath: (path: "join" | "create" | null) => void;
  signOut: () => void;
  profile: Profile | null;
  orgName: string;
  setOrgName: (name: string) => void;
  orgIdToJoin: string;
  setOrgIdToJoin: (id: string) => void;
  loading: boolean;
  error: string;
  infoMessage: string;
  managerPhone: string;
  setManagerPhone: (phone: string) => void;
  searchMode: "ID" | "PHONE";
  setSearchMode: (mode: "ID" | "PHONE") => void;
  invitations: Invitation[];
  handleCreateOrg: (e: React.FormEvent) => void;
  handleJoinOrg: (e: React.FormEvent) => void;
  handleAcceptInvite: (invite: Invitation) => void;
  handleDeclineInvite: (invite: Invitation) => void;
  handlePhoneSearch: () => void;
  formRef: React.RefObject<HTMLDivElement>;
}

const Spinner: React.FC = () => (
  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin">
  </div>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-shake">
    <AlertCircle size={20} />
    <span className="font-bold text-sm">{message}</span>
  </div>
);

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  selectedPath,
  setSelectedPath,
  signOut,
  profile,
  orgName,
  setOrgName,
  orgIdToJoin,
  setOrgIdToJoin,
  loading,
  error,
  infoMessage,
  managerPhone,
  setManagerPhone,
  searchMode,
  setSearchMode,
  invitations,
  handleCreateOrg,
  handleJoinOrg,
  handleAcceptInvite,
  handleDeclineInvite,
  handlePhoneSearch,
  formRef,
}) => {
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
      <div
        ref={formRef}
        className="w-full max-w-2xl card-premium p-12 md:p-20 relative overflow-hidden"
      >
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
            {selectedPath === "create" ? "הקמת מוסך חדש" : "הצטרפות למוסך קיים"}
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
                  onChange={(e) => setOrgIdToJoin(e.target.value.toUpperCase())}
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
};
