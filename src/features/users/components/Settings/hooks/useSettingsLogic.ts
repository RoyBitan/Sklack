import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/contexts/AppContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Language, NotificationSettings, UserRole } from "@/types";
import {
  formatPhoneDisplay,
  formatPhoneNumberInput,
  isValidPhone,
  normalizePhone,
} from "@/utils/phoneUtils";
import { sanitize } from "@/utils/formatters";
import { compressImage, uploadAsset } from "@/utils/assetUtils";

export const LANGUAGE_LABELS: Record<string, string> = {
  [Language.HEBREW]: "עברית (Hebrew)",
  [Language.ENGLISH]: "English",
  [Language.ARABIC]: "العربية (Arabic)",
  [Language.RUSSIAN]: "Русский (Russian)",
  [Language.CHINESE]: "中文 (Chinese)",
  [Language.THAI]: "ไทย (Thai)",
  [Language.HINDI]: "हिन्दी (Hindi)",
};

export const useSettingsLogic = () => {
  const { user, t, language, switchLanguage } = useApp();
  const { profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const { updateUser } = useData();

  // Main Settings View State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingPush, setCheckingPush] = useState(true);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile Edit Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [showSecondary, setShowSecondary] = useState(false);
  const [address, setAddress] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<
    {
      type: "success" | "error";
      text: string;
    } | null
  >(null);

  // Initialize Profile Form Data when User Loads
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(formatPhoneDisplay(user.phone || ""));
      setSecondaryPhone(formatPhoneDisplay(user.secondary_phone || ""));
      setShowSecondary(!!user.secondary_phone);
      setAddress(user.address || "");
    }
  }, [user]);

  // Check Push Status
  useEffect(() => {
    const checkPushStatus = async () => {
      if (!profile?.id) return;
      try {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", profile.id)
          .maybeSingle();
        setPushEnabled(!!data);
      } catch (e) {
        console.error("Error checking push status:", e);
      } finally {
        setCheckingPush(false);
      }
    };
    checkPushStatus();
  }, [profile?.id]);

  // Handlers
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_MANAGER:
        return "מנהל ראשי";
      case UserRole.STAFF:
        return "צוות";
      case UserRole.CUSTOMER:
        return "לקוח";
      default:
        return role;
    }
  };

  const togglePushNotifications = async () => {
    if (!profile?.id) return;
    try {
      if (pushEnabled) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", profile.id);
        setPushEnabled(false);
      } else {
        alert("התראות דחיפה יופעלו בקרוב");
      }
    } catch (e) {
      console.error("Error toggling push:", e);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    try {
      setLoadingAvatar(true);
      const compressed = await compressImage(file, 400, 400, 0.8);
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

      const publicUrl = await uploadAsset(compressed, "avatars", filePath);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      window.location.reload();
    } catch (err) {
      console.error("Avatar upload failed", err);
      toast.error("העלאת תמונה נכשלה");
    } finally {
      setLoadingAvatar(false);
    }
  };

  const updateNotificationSettings = async (
    updates: Partial<NotificationSettings>,
  ) => {
    if (!profile?.id) return;
    try {
      const currentSettings = user?.notification_settings ||
        { vibrate: true, sound: "default", events: [] };
      const newSettings = { ...currentSettings, ...updates };

      await supabase
        .from("profiles")
        .update({ notification_settings: newSettings })
        .eq("id", profile.id);

      // Optimistically update local state or trigger a refresh if critical
    } catch (e) {
      console.error("Update settings failed", e);
    }
  };

  const handleSaveProfile = async () => {
    setEditLoading(true);
    setEditMessage(null);

    // Validation
    if (!fullName.trim()) {
      setEditMessage({ type: "error", text: "נא להזין שם מלא" });
      setEditLoading(false);
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      setEditMessage({ type: "error", text: "מספר טלפון ראשי לא תקין" });
      setEditLoading(false);
      return;
    }

    if (secondaryPhone) {
      const normalizedSecondary = normalizePhone(secondaryPhone);
      if (!isValidPhone(normalizedSecondary)) {
        setEditMessage({ type: "error", text: "מספר טלפון משני לא תקין" });
        setEditLoading(false);
        return;
      }
    }

    try {
      if (!user?.id) throw new Error("No user ID");

      await updateUser(user.id, {
        full_name: sanitize(fullName),
        phone: normalizedPhone,
        secondary_phone: secondaryPhone ? normalizePhone(secondaryPhone) : null,
        address: sanitize(address),
      });
      setEditMessage({ type: "success", text: "הפרטים עודכנו בהצלחה" });
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setEditMessage({ type: "error", text: "שגיאה בעדכון הפרטים" });
    } finally {
      setEditLoading(false);
    }
  };

  return {
    // Global
    user,
    profile,
    authLoading,
    signOut,

    // Main View
    pushEnabled,
    checkingPush,
    loadingAvatar,
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
    setPhone: (val: string) => setPhone(formatPhoneNumberInput(val)),
    secondaryPhone,
    setSecondaryPhone: (val: string) =>
      setSecondaryPhone(formatPhoneNumberInput(val)),
    showSecondary,
    setShowSecondary,
    address,
    setAddress,
    editLoading,
    editMessage,
    handleSaveProfile,
  };
};
