import React from "react";
import { Edit2 } from "lucide-react";
import { UserRole } from "../../../types";

interface SettingsHeaderProps {
  user: import("../../../types").Profile | null;
  getRoleLabel: (role: UserRole) => string;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  user,
  getRoleLabel,
  handleAvatarUpload,
}) => {
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
      <div className="flex items-center gap-6 mb-6">
        <div className="relative group">
          <div className="w-24 h-24 bg-gradient-to-br from-black to-gray-700 text-white rounded-full flex items-center justify-center text-4xl font-black shadow-xl overflow-hidden">
            {user?.avatar_url
              ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )
              : (
                user?.full_name?.charAt?.(0) || "U"
              )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 hover:scale-110 transition-transform cursor-pointer">
            <Edit2 size={14} className="text-black" />
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-gray-900">
            {user?.full_name || "משתמש"}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold uppercase">
              {getRoleLabel(user?.role)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeader;
