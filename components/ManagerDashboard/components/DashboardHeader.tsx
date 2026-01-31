import React from "react";
import { Shield, Sun } from "lucide-react";

interface DashboardHeaderProps {
  profile: import("../../../types").Profile | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = (
  { profile },
) => {
  return (
    <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl">
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl">
      </div>
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-start">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-black uppercase tracking-widest mb-3">
            <Sun size={14} />
            שיהיה לך יום סקלאק!
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            שלום, {profile?.full_name?.split?.(" ")?.[0] || "מנהל"}
          </h1>
          <p className="text-gray-400 font-bold max-w-sm leading-relaxed text-base md:text-lg">
            ביצועי המוסך שלך במבט חטוף. הכל תחת שליטה.
          </p>
        </div>
        {profile?.organization?.name && (
          <div className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-xl">
            <Shield className="text-emerald-400" size={28} />
            <div className="text-start">
              <div className="text-[10px] font-black uppercase text-emerald-300 tracking-widest mb-0.5">
                מחובר ומאובטח
              </div>
              <div className="font-black text-lg">
                {profile.organization.name}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
