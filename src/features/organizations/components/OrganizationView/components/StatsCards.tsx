import React from "react";
import { Building2, Copy, Users } from "lucide-react";
import { Profile } from "@/types";

interface StatsCardsProps {
  profile: Profile | null;
  membersCount: number;
  orgDisplayName: string;
  infoMessage: string;
  copyToClipboard: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  profile,
  membersCount,
  orgDisplayName,
  infoMessage,
  copyToClipboard,
}) => {
  return (
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
          {membersCount}
        </div>
        <div className="text-[11px] font-black text-gray-400 group-hover:text-gray-400 uppercase tracking-[0.3em]">
          חברים פעילים
        </div>
      </div>
    </div>
  );
};
