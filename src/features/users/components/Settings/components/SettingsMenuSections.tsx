import React from "react";
import {
  Bell,
  Bug,
  ChevronRight,
  FileText,
  Info,
  Lock,
  Mail,
} from "lucide-react";
import { LANGUAGE_LABELS } from "../hooks/useSettingsLogic";
import { Language, NotificationSettings, Profile } from "@/types";

interface SettingsMenuSectionsProps {
  // Account
  user: Profile | null;
  setShowPasswordModal?: (show: boolean) => void;

  // App Settings
  pushEnabled: boolean;
  togglePushNotifications: () => void;
  updateNotificationSettings: (
    updates: Partial<NotificationSettings>,
  ) => void;
  language: Language;
  switchLanguage: (lang: Language) => void;

  // Children mainly for ProfileEditForm injection which is separate but visually part of account
  children?: React.ReactNode;
}

export const AccountSection: React.FC<{
  children: React.ReactNode;
  setShowPasswordModal: (show: boolean) => void;
}> = ({ children, setShowPasswordModal }) => {
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">
          חשבון
        </h3>
      </div>
      <div className="p-6">{children}</div>
      <button
        onClick={() => setShowPasswordModal(true)}
        className="w-full px-6 py-4 flex items-center justify-between border-t border-gray-100 hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Lock
            size={20}
            className="text-gray-400 group-hover:text-black transition-colors"
          />
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            שינוי סיסמה
          </span>
        </div>
        <ChevronRight
          size={20}
          className="text-gray-300 group-hover:text-black transition-colors"
        />
      </button>
    </div>
  );
};

export const AppSettingsSection: React.FC<SettingsMenuSectionsProps> = ({
  user,
  pushEnabled,
  togglePushNotifications,
  updateNotificationSettings,
  language,
  switchLanguage,
}) => {
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">
          הגדרות אפליקציה
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-400" />
            <span className="font-bold text-gray-700">התראות דחיפה</span>
          </div>
          <div
            className={`w-12 h-7 rounded-full transition-all ${
              pushEnabled ? "bg-green-500" : "bg-gray-300"
            } relative cursor-pointer`}
            onClick={togglePushNotifications}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                pushEnabled ? "right-1" : "right-6"
              }`}
            >
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-50 pt-4">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-400" />
            <span className="font-bold text-gray-700">רטט</span>
          </div>
          <div
            className={`w-12 h-7 rounded-full transition-all ${
              user?.notification_settings?.vibrate !== false
                ? "bg-green-500"
                : "bg-gray-300"
            } relative cursor-pointer`}
            onClick={() =>
              updateNotificationSettings({
                vibrate: !user?.notification_settings?.vibrate,
              })}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                user?.notification_settings?.vibrate !== false
                  ? "right-1"
                  : "right-6"
              }`}
            >
            </div>
          </div>
        </div>

        <div className="border-t border-gray-50 pt-4">
          <label className="text-xs font-bold text-gray-500 block mb-2">
            צליל התראה
          </label>
          <select
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
            value={user?.notification_settings?.sound || "default"}
            onChange={(e) =>
              updateNotificationSettings({ sound: e.target.value })}
          >
            <option value="default">ברירת מחדל</option>
            <option value="bell">פעמון</option>
            <option value="digital">דיגיטלי</option>
          </select>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <div className="px-6 py-3">
          <label className="text-xs font-bold text-gray-500 block mb-2">
            שפה
          </label>
          <select
            value={language}
            onChange={(e) => switchLanguage(e.target.value as Language)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
          >
            {Object.values(Language).map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export const InfoSection: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">
          מידע
        </h3>
      </div>
      <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Info
            size={20}
            className="text-gray-400 group-hover:text-black transition-colors"
          />
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            אודות Sklack
          </span>
        </div>
        <ChevronRight
          size={20}
          className="text-gray-300 group-hover:text-black transition-colors"
        />
      </button>
      <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b border-gray-100">
        <div className="flex items-center gap-3">
          <FileText
            size={20}
            className="text-gray-400 group-hover:text-black transition-colors"
          />
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            מדיניות פרטיות
          </span>
        </div>
        <ChevronRight
          size={20}
          className="text-gray-300 group-hover:text-black transition-colors"
        />
      </button>
      <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-3">
          <FileText
            size={20}
            className="text-gray-400 group-hover:text-black transition-colors"
          />
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            תנאי שימוש
          </span>
        </div>
        <ChevronRight
          size={20}
          className="text-gray-300 group-hover:text-black transition-colors"
        />
      </button>
    </div>
  );
};

export const SupportSection: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">
          תמיכה
        </h3>
      </div>
      <a
        href="mailto:support@sklack.com"
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b border-gray-100"
      >
        <div className="flex items-center gap-3">
          <Mail
            size={20}
            className="text-gray-400 group-hover:text-black transition-colors"
          />
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            צור קשר עם תמיכה
          </span>
        </div>
        <ChevronRight
          size={20}
          className="text-gray-300 group-hover:text-black transition-colors"
        />
      </a>
      <a
        href="mailto:bugs@sklack.com"
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Bug
            size={20}
            className="text-gray-400 group-hover:text-black transition-colors"
          />
          <span className="font-bold text-gray-700 group-hover:text-black transition-colors">
            דווח על באג
          </span>
        </div>
        <ChevronRight
          size={20}
          className="text-gray-300 group-hover:text-black transition-colors"
        />
      </a>
    </div>
  );
};
