import React from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { UserRole } from "../../../types";

interface DashboardControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setShowInviteModal: (show: boolean) => void;
  setShowAddModal: (show: boolean) => void;
  profile: import("../../../types").Profile | null;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  searchQuery,
  setSearchQuery,
  setShowInviteModal,
  setShowAddModal,
  profile,
}) => {
  return (
    <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-center sticky top-16 md:top-28 z-40 bg-[#f8f9fa]/80 backdrop-blur-xl py-4 -my-4">
      <div className="relative flex-1 w-full group">
        <input
          type="text"
          placeholder="חיפוש משימה, לוחית רישוי או דגם..."
          className="input-premium pl-12 md:pl-16 pr-5 md:pr-8 h-14 md:h-20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
          size={20}
        />
      </div>

      {profile?.role === UserRole.SUPER_MANAGER && (
        <button
          onClick={() => setShowInviteModal(true)}
          className="hidden lg:flex h-20 px-8 bg-white border-2 border-dashed border-gray-300 rounded-[1.5rem] text-gray-400 font-black hover:border-black hover:text-black hover:bg-white transition-all items-center gap-3 whitespace-nowrap"
        >
          <UserPlus size={24} />
          <span>הזמן עובד</span>
        </button>
      )}

      {profile?.role === UserRole.SUPER_MANAGER && (
        <button
          onClick={() => setShowAddModal(true)}
          className="hidden md:flex btn-primary h-20 items-center gap-4 whitespace-nowrap px-10 shadow-2xl"
        >
          <Plus size={28} /> משימה חדשה
        </button>
      )}
    </div>
  );
};
