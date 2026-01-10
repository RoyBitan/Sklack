import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, AppView } from '../types';
import { TRANSLATIONS } from '../constants';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface AppContextType {
  language: Language;
  activeView: AppView;
  navigateTo: (view: AppView) => void;
  switchLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  user: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [language, setLanguage] = useState<Language>(Language.HEBREW);
  const [activeView, setActiveView] = useState<AppView>('DASHBOARD');

  const isRTL = [Language.HEBREW].includes(language);
  const t = useCallback((key: string) => TRANSLATIONS[language]?.[key] || key, [language]);

  const navigateTo = (view: AppView) => setActiveView(view);
  const switchLanguage = (lang: Language) => setLanguage(lang);

  // Multi-device Push Registration
  useEffect(() => {
    if (!profile?.id) return;

    const registerPush = async () => {
      // 1. Check browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Browser does not support push notifications');
        return;
      }

      const publicKey = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.error('[Push] VAPID Public Key missing');
        return;
      }

      try {
        // 2. Wait for SW to be ready
        console.log('[Push] Waiting for Service Worker...');
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] Service Worker ready');

        // 3. Request Permission
        let permission = Notification.permission;
        if (permission === 'default') {
          console.log('[Push] Requesting permission...');
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          console.warn('[Push] Permission not granted:', permission);
          return;
        }

        // 4. Get or Create Subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          console.log('[Push] Creating new subscription...');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        if (subscription) {
          const tokenJson = subscription.toJSON();
          // Multi-device hardening: Use the new push_tokens table
          console.log('[Push] Storing token in database...');
          const { error } = await supabase.from('push_tokens').upsert({
            user_id: profile.id,
            token_json: tokenJson
          }, { onConflict: 'user_id, token_json' });

          if (error) throw error;
          console.log('[Push] Token registered successfully for multi-device support');
        }
      } catch (e) {
        console.error('[Push] Registration failed:', e);
      }
    };

    registerPush();
  }, [profile?.id]);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  return (
    <AppContext.Provider value={{
      language, activeView, navigateTo, switchLanguage, t, isRTL,
      user: profile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
