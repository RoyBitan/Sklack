import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { useData } from "../contexts/DataContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
  url?: string;
  task_id?: string;
}

import { useNavigate } from "react-router-dom";

const NotificationBell: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { navigateTo } = useApp();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio with custom sound from public folder
    audioRef.current = new Audio("/Notification.wav");
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sound alert effect
  const prevCount = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      if (audioRef.current) {
        audioRef.current.play().catch((e) =>
          console.error("Audio play failed", e)
        );
      }
      if (
        typeof window !== "undefined" && window.navigator &&
        window.navigator.vibrate
      ) {
        try {
          window.navigator.vibrate([200, 100, 200]);
        } catch (e) {}
      }
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all duration-300"
      >
        <Bell size={22} className={unreadCount > 0 ? "animate-bounce" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-14 left-0 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up origin-top-left">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-black text-gray-900 tracking-tight">התראות</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                סמן הכל כנקרא
              </button>
            )}
          </div>

          <div className="max-h-[25rem] overflow-y-auto custom-scrollbar">
            {notifications.length === 0
              ? (
                <div className="p-12 text-center">
                  <Bell size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    אין התראות חדשות
                  </p>
                </div>
              )
              : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-5 border-b border-gray-50 hover:bg-gray-50 transition-all cursor-pointer ${
                      !n.is_read ? "bg-blue-50/20" : ""
                    }`}
                    onClick={() => {
                      if (!n.is_read) markNotificationRead(n.id);
                      // Deep link handling
                      if (n.url) {
                        const target = n.url.replace("/#", "").replace("#", "");
                        // Handle relative paths or AppView strings
                        if (target.startsWith("/")) {
                          navigate(target);
                        } else {
                          // If it's a view name, navigateTo handles it
                          navigateTo(target as any);
                        }
                      }
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {!n.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full">
                          </div>
                        )}
                        <h4
                          className={`text-sm ${
                            !n.is_read
                              ? "font-black text-gray-900"
                              : "font-bold text-gray-600"
                          }`}
                        >
                          {n.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(n.created_at).toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
