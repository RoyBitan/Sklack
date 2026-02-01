import React from "react";
import { UserCircle2 } from "lucide-react";

import { Profile } from "@/types";

interface ProfileCompletionBannerProps {
  user: Profile | null;
  onNavigateSettings: () => void;
}

const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  user,
  onNavigateSettings,
}) => {
  if (
    (user?.phone && user?.address) ||
    localStorage.getItem("dismissedProfileBanner")
  ) {
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 flex justify-between items-center animate-fade-in-up">
      <div className="flex items-center gap-4">
        <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
          <UserCircle2 size={24} />
        </div>
        <div className="text-start">
          <div className="font-black text-gray-900 text-lg">
            הפרופיל שלך לא מלא
          </div>
          <div className="text-sm text-gray-500">
            השלם פרטים אישיים כדי לחסוך זמן בצ'ק-אין
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          localStorage.setItem("dismissedProfileBanner", "true");
          onNavigateSettings();
        }}
        className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-orange-600 transition-all shadow-lg active:scale-95"
      >
        השלם פרטים
      </button>
    </div>
  );
};

export default ProfileCompletionBanner;
