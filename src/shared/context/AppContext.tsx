import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppView, Language, Profile } from "@/types";
import { TRANSLATIONS } from "@/shared/constants";
import { useAuth } from "@/features/auth";
import { supabase } from "@/services/api/client";
import { useLocation, useNavigate } from "react-router-dom";

interface AppContextType {
  language: Language;
  activeView: AppView;
  navigateTo: (view: AppView) => void;
  switchLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  user: Profile | null;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguage] = useState<Language>(Language.HEBREW);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const hasAttemptedPushRef = React.useRef(false);

  const isRTL = [Language.HEBREW].includes(language);
  const t = useCallback((key: string) => TRANSLATIONS[language]?.[key] || key, [
    language,
  ]);

  const activeView = useMemo<AppView>(() => {
    const path = location.pathname;
    if (path.startsWith("/dashboard")) return "DASHBOARD";
    if (path.startsWith("/settings")) return "SETTINGS";
    if (path.startsWith("/team")) return "ORGANIZATION";
    if (path.startsWith("/notifications")) return "NOTIFICATIONS";
    if (path.startsWith("/appointments/")) return "REQUEST_DETAIL";
    if (path.startsWith("/appointments")) return "APPOINTMENTS";
    if (path.startsWith("/vehicles")) return "VEHICLES";
    if (path.startsWith("/garage")) return "GARAGE";
    if (path.startsWith("/tasks/")) return "TASK_DETAIL";
    if (path.startsWith("/tasks")) return "TASKS";
    return "DASHBOARD";
  }, [location.pathname]);

  const navigateTo = useCallback((view: AppView) => {
    switch (view) {
      case "DASHBOARD":
        navigate("/dashboard");
        break;
      case "SETTINGS":
        navigate("/settings");
        break;
      case "ORGANIZATION":
        navigate("/team");
        break;
      case "NOTIFICATIONS":
        navigate("/notifications");
        break;
      case "APPOINTMENTS":
        navigate("/appointments");
        break;
      case "VEHICLES":
        navigate("/vehicles");
        break;
      case "GARAGE":
        navigate("/garage");
        break;
      case "TASKS":
        navigate("/tasks");
        break;
      case "TASK_DETAIL":
        if (selectedTaskId) navigate(`/tasks/${selectedTaskId}`);
        else navigate("/tasks");
        break;
      case "REQUEST_DETAIL":
        if (selectedRequestId) navigate(`/appointments/${selectedRequestId}`);
        else navigate("/appointments");
        break;
      default:
        navigate("/dashboard");
        break;
    }
  }, [navigate, selectedTaskId, selectedRequestId]);

  const switchLanguage = useCallback((lang: Language) => setLanguage(lang), []);

  // Multi-device Push Registration
  useEffect(() => {
    if (!profile?.id) return;

    const registerPush = async () => {
      if (hasAttemptedPushRef.current) return;
      hasAttemptedPushRef.current = true;

      try {
        // 1. Check browser support
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          console.warn("[Push] Browser does not support push notifications");
          return;
        }

        const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
          | string
          | undefined;
        if (!publicKey) {
          console.warn("[Push] VAPID Public Key missing");
          return;
        }

        // 2. Wait for SW to be ready
        console.log("[Push] Waiting for Service Worker...");
        const registration = await navigator.serviceWorker.ready;
        console.log("[Push] Service Worker ready");

        // 3. Request Permission
        let permission = Notification.permission;
        if (permission === "default") {
          console.log("[Push] Requesting permission...");
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          console.warn("[Push] Permission not granted:", permission);
          return;
        }

        // 4. Get or Create Subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          console.log("[Push] Creating new subscription...");
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        if (subscription && profile?.id) {
          const tokenJson = subscription.toJSON();
          console.log("[Push] Storing token in database...");
          const { error } = await supabase.from("push_tokens").upsert({
            user_id: profile.id,
            token_json: tokenJson,
          }, { onConflict: "user_id, token_json" });

          if (error) console.warn("[Push] DB store failed:", error);
          else {
            console.log("[Push] Token registered successfully");
            // RULE: Never trigger refreshProfile() here to avoid redirection collisions.
          }
        }
      } catch (e) {
        console.warn("[Push] Registration background task failed silently:", e);
      }
    };

    registerPush();
  }, [profile?.id]);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(
      /_/g,
      "/",
    );
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [language, isRTL]);

  const value = useMemo(() => ({
    language,
    activeView,
    navigateTo,
    switchLanguage,
    t,
    isRTL,
    user: profile,
    selectedTaskId,
    setSelectedTaskId,
    selectedRequestId,
    setSelectedRequestId,
  }), [
    language,
    activeView,
    navigateTo,
    switchLanguage,
    t,
    isRTL,
    profile,
    selectedTaskId,
    selectedRequestId,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
