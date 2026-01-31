import React from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppView, UserRole } from "@/types";
import {
  Bell,
  CalendarDays,
  Car,
  Database,
  Home,
  LogOut,
  RefreshCcw,
  Settings,
  Users,
  WifiOff,
  Wrench,
} from "lucide-react";
import SklackLogo from "../../ui/SklackLogo";
import NotificationBell from "@/components/NotificationBell";
import { useData } from "@/contexts/DataContext";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const { activeView, navigateTo, isRTL, t } = useApp();
  const { profile, signOut } = useAuth();
  const { loading: dataLoading } = useData();

  if (!profile) return <>{children}</>;

  // Get page title based on active view
  const getPageTitle = () => {
    switch (activeView) {
      case "DASHBOARD":
        return "דף הבית";
      case "TASKS":
        return "משימות";
      case "VEHICLES":
        return "רכבים";
      case "APPOINTMENTS":
        return "תורים";
      case "GARAGE":
        return "המוסך שלי";
      case "SETTINGS":
        return "הגדרות";
      case "NOTIFICATIONS":
        return "התראות";
      default:
        return "Sklack";
    }
  };

  const NavItem = (
    { view, icon: Icon, label }: {
      view: AppView;
      icon: React.ElementType;
      label: string;
    },
  ) => {
    const isActive = activeView === view ||
      (view === "TASKS" && activeView === "TASK_DETAIL") ||
      (view === "APPOINTMENTS" && activeView === "REQUEST_DETAIL");
    return (
      <button
        onClick={() => navigateTo(view)}
        className={`flex flex-col md:flex-row items-center gap-3 px-6 py-4 rounded-[1.5rem] transition-all duration-300 ${
          isActive
            ? "bg-black text-white shadow-2xl scale-[1.05]"
            : "text-gray-400 hover:text-black hover:bg-gray-100"
        }`}
      >
        <Icon size={22} className={isActive ? "animate-pulse-slow" : ""} />
        <span className="text-[10px] md:text-sm font-black uppercase tracking-tighter">
          {label}
        </span>
      </button>
    );
  };

  // Role-based bottom navigation items
  const getBottomNavItems = (): {
    view: AppView;
    icon: React.ElementType;
    label: string;
  }[] => {
    const isManager = profile.role === UserRole.SUPER_MANAGER;
    const isWorker = profile.role === UserRole.STAFF;
    const isCustomer = profile.role === UserRole.CUSTOMER;

    if (isManager) {
      return [
        { view: "DASHBOARD", icon: Home, label: "בית" },
        { view: "GARAGE", icon: Wrench, label: "מוסך" },
        { view: "APPOINTMENTS", icon: CalendarDays, label: "תורים" },
        { view: "SETTINGS", icon: Settings, label: "הגדרות" },
      ];
    }

    if (isWorker) {
      return [
        { view: "DASHBOARD", icon: Home, label: "דף הבית" },
        { view: "SETTINGS", icon: Settings, label: "הגדרות" },
      ];
    }

    if (isCustomer) {
      return [
        { view: "DASHBOARD", icon: Home, label: "דף הבית" },
        { view: "SETTINGS", icon: Settings, label: "הגדרות" },
      ];
    }

    return [];
  };

  const bottomNavItems = getBottomNavItems();

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-heebo selection:bg-black selection:text-white">
      {/* Mobile Header - Sticky */}
      <header className="md:hidden bg-white/95 backdrop-blur-2xl border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="px-5 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-xl shadow-lg">
              <SklackLogo size={20} />
            </div>
            <h1 className="text-lg font-black tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:block bg-white/90 backdrop-blur-2xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-24 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <div
              className="flex items-center gap-4 cursor-pointer group"
              onClick={() => navigateTo("DASHBOARD")}
            >
              <div className="bg-black text-white p-3 rounded-[1.2rem] shadow-2xl transition-transform group-hover:scale-110">
                <SklackLogo size={28} />
              </div>
              <div className="transition-transform group-hover:translate-x-1">
                <h1 className="text-2xl font-black tracking-tighter leading-none">
                  Sklack
                </h1>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Garage OS
                </p>
              </div>
            </div>

            <nav className="flex gap-3">
              <NavItem view="DASHBOARD" icon={Home} label="דף הבית" />
              {profile.role === UserRole.SUPER_MANAGER && (
                <>
                  <NavItem view="TASKS" icon={Car} label="משימות" />
                  <NavItem
                    view="APPOINTMENTS"
                    icon={CalendarDays}
                    label="תורים"
                  />
                  <NavItem view="ORGANIZATION" icon={Users} label="צוות" />
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-8">
            <NotificationBell />
            {dataLoading && (
              <div className="animate-spin text-black">
                <RefreshCcw size={18} />
              </div>
            )}

            <div className="flex items-center gap-6 pl-8 border-l border-gray-100">
              <div className="text-right">
                <div className="text-base font-black text-gray-900 leading-none">
                  {profile?.full_name?.split?.(" ")?.[0] || "משתמש"}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                  {profile.role === UserRole.STAFF ? "צוות" : profile.role}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-4 bg-red-50 text-red-600 rounded-[1.2rem] hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90"
              >
                <LogOut size={22} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-16 md:top-24 left-0 right-0 z-40 bg-red-600 text-white py-2.5 px-4 flex items-center justify-center gap-3 shadow-lg animate-fade-in">
          <WifiOff size={18} className="animate-pulse" />
          <span className="text-xs font-black tracking-wide">
            מצב לא מקוון - ייתכן וחלק מהנתונים אינם מעודכנים
          </span>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 w-full max-w-7xl mx-auto p-4 md:p-12 pb-28 md:pb-12 transition-all ${
          !isOnline ? "mt-8" : ""
        }`}
      >
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Role-Based */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/98 backdrop-blur-3xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-around px-2 z-50 safe-area-inset-bottom">
        {bottomNavItems.map(({ view, icon: Icon, label }) => {
          const isActive = activeView === view ||
            (view === "TASKS" && activeView === "TASK_DETAIL") ||
            (view === "APPOINTMENTS" && activeView === "REQUEST_DETAIL");
          return (
            <button
              key={view}
              onClick={() => navigateTo(view)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-300 touch-target ${
                isActive
                  ? "bg-black text-white shadow-xl scale-110"
                  : "text-gray-400 active:scale-95"
              }`}
            >
              <Icon size={24} strokeWidth={2.5} />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
