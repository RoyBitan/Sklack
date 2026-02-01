import React from "react";
import { LogOut } from "lucide-react";
import LoadingSpinner from "@/src/shared/components/ui/LoadingSpinner";
import { useSettingsLogic } from "./hooks/useSettingsLogic";

// Components
import SettingsHeader from "./components/SettingsHeader";
import ProfileEditForm from "./components/ProfileEditForm";
import ChangePasswordModal from "./components/ChangePasswordModal";
import {
  AccountSection,
  AppSettingsSection,
  InfoSection,
  SupportSection,
} from "./components/SettingsMenuSections";

const SettingsView: React.FC = () => {
  const {
    // Global
    user,
    authLoading,
    signOut,
    // Main View
    pushEnabled, // checkingPush, // Not strictly breaking to not use checkingSpinner on push status, can default to false
    showPasswordModal,
    setShowPasswordModal,
    language,
    switchLanguage,
    getRoleLabel,
    togglePushNotifications,
    handleAvatarUpload,
    updateNotificationSettings,
    // Profile Form
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
    editLoading,
    editMessage,
    handleSaveProfile,
  } = useSettingsLogic();

  if (authLoading || !user) {
    return <LoadingSpinner message="טוען הגדרות..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Profile Header */}
      <SettingsHeader
        user={user}
        getRoleLabel={getRoleLabel}
        handleAvatarUpload={handleAvatarUpload}
      />

      {/* Group 1: Account */}
      <AccountSection setShowPasswordModal={setShowPasswordModal}>
        <ProfileEditForm
          fullName={fullName}
          setFullName={setFullName}
          phone={phone}
          setPhone={setPhone}
          secondaryPhone={secondaryPhone}
          setSecondaryPhone={setSecondaryPhone}
          showSecondary={showSecondary}
          setShowSecondary={setShowSecondary}
          address={address}
          setAddress={setAddress}
          loading={editLoading}
          message={editMessage}
          handleSave={handleSaveProfile}
        />
      </AccountSection>

      {/* Group 2: App Settings */}
      <AppSettingsSection
        user={user}
        pushEnabled={pushEnabled}
        togglePushNotifications={togglePushNotifications}
        updateNotificationSettings={updateNotificationSettings}
        language={language}
        switchLanguage={switchLanguage}
      />

      {/* Group 3: Information */}
      <InfoSection />

      {/* Group 4: Support */}
      <SupportSection />

      {/* Logout Button */}
      <button
        onClick={() => {
          console.log("Sign out button clicked (SettingsView)");
          signOut();
        }}
        className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl md:rounded-3xl font-black text-base transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3 cursor-pointer touch-manipulation"
      >
        <LogOut size={22} />
        <span>התנתק</span>
      </button>

      {/* Version Info */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400 font-bold">SklackOS v2.0.1</p>
        <p className="text-xs text-gray-300 mt-1">
          © 2026 Sklack. All rights reserved
        </p>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
};

export default SettingsView;
