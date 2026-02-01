import React from "react";
import { LogOut, Shield } from "lucide-react";
import { Profile } from "@/types";
import { Button, Card } from "@/src/shared/components/ui";

interface CustomerHeaderProps {
  user: Profile | null;
  profile: Profile | null;
  onDisconnect: () => void;
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  user,
  profile,
  onDisconnect,
}) => {
  return (
    <Card
      variant="default"
      padding="none"
      className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl"
    >
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-start">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            שלום, {user?.full_name?.split?.(" ")?.[0] || "לקוח"}
          </h1>
          <p className="text-gray-400 font-bold max-w-sm leading-relaxed text-base md:text-lg">
            כאן תוכל לנהל את רכביך, לעקוב אחר טיפולים ולבצע צ'ק-אין מהיר.
          </p>
        </div>

        <div className="flex gap-2">
          {profile?.organization?.name && (
            <Card
              variant="glass"
              padding="none"
              className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-xl"
            >
              <Shield className="text-emerald-400" size={28} />
              <div className="text-start">
                <div className="text-[10px] font-black uppercase text-emerald-300 tracking-widest mb-0.5">
                  מוסך פעיל
                </div>
                <div className="font-black text-lg text-white">
                  {profile.organization.name}
                </div>
              </div>
            </Card>
          )}

          <Button
            variant="ghost"
            onClick={onDisconnect}
            title="התנתק מהמוסך"
            className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 text-white shadow-xl"
          >
            <LogOut size={24} />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CustomerHeader;
