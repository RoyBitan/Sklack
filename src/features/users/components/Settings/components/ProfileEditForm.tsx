import React from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileEditFormProps {
  fullName: string;
  setFullName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  secondaryPhone: string;
  setSecondaryPhone: (val: string) => void;
  showSecondary: boolean;
  setShowSecondary: (val: boolean) => void;
  address: string;
  setAddress: (val: string) => void;
  loading: boolean;
  message: { type: "success" | "error"; text: string } | null;
  handleSave: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  fullName,
  setFullName,
  phone,
  setPhone,
  secondaryPhone,
  setSecondaryPhone,
  showSecondary,
  setShowSecondary,
  address,
  setAddress,
  loading,
  message,
  handleSave,
}) => {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-gray-500 block mb-1.5">
          שם מלא
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="שם מלא"
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1.5">
            טלפון נייד
          </label>
          <input
            type="tel"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
            value={phone || ""}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-0000000"
          />
        </div>

        <div>
          {!secondaryPhone && !showSecondary && (
            <button
              onClick={() => setShowSecondary(true)}
              className="text-blue-600 font-bold text-xs flex items-center gap-2 hover:bg-blue-50 p-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> הוסף טלפון נוסף
            </button>
          )}

          {(secondaryPhone || showSecondary) && (
            <div className="animate-fade-in-up">
              <label className="text-xs font-bold text-gray-500 block mb-1.5 flex justify-between">
                <span>טלפון נוסף</span>
                <button
                  onClick={() => {
                    setSecondaryPhone("");
                    setShowSecondary(false);
                  }}
                  className="text-red-500 text-[10px]"
                >
                  הסר
                </button>
              </label>
              <input
                type="tel"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                value={secondaryPhone || ""}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                placeholder="נוסף"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 block mb-1.5">
          כתובת מגורים
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="עיר, רחוב, מספר בית"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 block mb-1.5">
          דואר אלקטרוני
        </label>
        <input
          type="email"
          disabled
          className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
          value={user?.email || ""}
          placeholder="email@example.com"
        />
      </div>

      {message && (
        <div
          className={`text-xs font-bold ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
      >
        {loading ? "שומר..." : "עדכן פרטים"}
      </button>
    </div>
  );
};

export default ProfileEditForm;
