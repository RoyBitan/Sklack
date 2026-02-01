import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useData } from "@/contexts/DataContext";
import { TaskStatus } from "@/types";
import TaskCard from "../TaskCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Briefcase,
  CheckCircle,
  Layers,
  ListTodo,
  Shield,
  Sun,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TeamDashboard: React.FC = () => {
  const { user, t } = useApp();
  const { profile } = useAuth();
  const { tasks, loading, hasMoreTasks, loadMoreTasks } = useData();
  const [view, setView] = useState<"MY_TASKS" | "OPEN" | "HISTORY">("MY_TASKS");

  // Filter tasks assigned to me that are IN_PROGRESS
  const activeTasks = React.useMemo(
    () =>
      tasks.filter((t) =>
        t.assigned_to?.includes(user?.id || "") &&
        t.status === TaskStatus.IN_PROGRESS
      ),
    [tasks, user?.id],
  );

  // Filter tasks assigned to me that are still WAITING (The Queue)
  const myQueue = React.useMemo(
    () =>
      tasks.filter((t) =>
        t.assigned_to?.includes(user?.id || "") &&
        t.status === TaskStatus.WAITING
      ),
    [tasks, user?.id],
  );

  // Filter open tasks (unassigned or assigned to others but waiting/approved)
  const openTasks = React.useMemo(
    () =>
      tasks.filter((t) =>
        (t.status === TaskStatus.WAITING || t.status === TaskStatus.APPROVED) &&
        (!t.assigned_to || t.assigned_to.length === 0)
      ),
    [tasks],
  );

  // Filter completed tasks assigned to me
  const completedTasks = React.useMemo(
    () =>
      tasks.filter((t) =>
        t.assigned_to?.includes(user?.id || "") &&
        t.status === TaskStatus.COMPLETED
      ),
    [tasks, user?.id],
  );

  const hasActiveTask = activeTasks.length > 0;

  if (loading || !user) {
    return <LoadingSpinner message="טוען לוח בקרה..." />;
  }

  return (
    <div className="pb-20 space-y-4 md:space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl">
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-start">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-black uppercase tracking-widest mb-3">
              <Sun size={14} />
              יום עבודה נעים!
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              שלום, {profile?.full_name?.split?.(" ")?.[0] || "צוות"}
            </h1>
            <p className="text-gray-400 font-bold max-w-sm leading-relaxed text-base md:text-lg">
              יש לך{" "}
              <span className="text-white underline decoration-emerald-500 decoration-2">
                {activeTasks.length}
              </span>{" "}
              משימות פעילות
              {myQueue.length > 0 && ` ועוד ${myQueue.length} בתור.`}
            </p>
          </div>
          {profile?.organization?.name && (
            <div className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-xl">
              <Shield className="text-emerald-400" size={28} />
              <div className="text-start">
                <div className="text-[10px] font-black uppercase text-emerald-300 tracking-widest mb-0.5">
                  סניף פעיל
                </div>
                <div className="font-black text-lg">
                  {profile.organization.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Switcher */}
      <div className="bg-gray-100/80 p-1.5 rounded-xl md:rounded-2xl flex gap-1 shadow-inner border border-gray-200/50">
        <button
          onClick={() => setView("MY_TASKS")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${
            view === "MY_TASKS"
              ? "bg-white text-blue-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          <Briefcase
            size={16}
            className={view === "MY_TASKS" ? "text-blue-500" : "text-gray-400"}
          />
          משימות שלי
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              view === "MY_TASKS"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {activeTasks.length + myQueue.length}
          </span>
        </button>
        <button
          onClick={() => setView("OPEN")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${
            view === "OPEN"
              ? "bg-white text-blue-700 shadow-[0_2px_8_rgba(0,0,0,0.08)] ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          <ListTodo
            size={16}
            className={view === "OPEN" ? "text-blue-500" : "text-gray-400"}
          />
          קריאות פתוחות
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              view === "OPEN"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {openTasks.length}
          </span>
        </button>
        <button
          onClick={() => setView("HISTORY")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${
            view === "HISTORY"
              ? "bg-white text-blue-700 shadow-[0_2px_8_rgba(0,0,0,0.08)] ring-1 ring-black/5"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          <CheckCircle
            size={16}
            className={view === "HISTORY" ? "text-blue-500" : "text-gray-400"}
          />
          היסטוריה
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              view === "HISTORY"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {completedTasks.length}
          </span>
        </button>
      </div>

      <div className="space-y-4 md:space-y-6 animate-fade-in-up">
        {view === "MY_TASKS" && (
          <>
            {/* Active Section */}
            {activeTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                  <Briefcase size={14} /> בטיפול כרגע
                </div>
                {activeTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}

            {/* Queue Section */}
            {myQueue.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2 px-2 text-gray-400 font-black text-xs uppercase tracking-widest">
                  <Layers size={14} /> הבאות בתור עבורך
                </div>
                {myQueue.map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            )}

            {activeTasks.length === 0 && myQueue.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl md:rounded-3xl border border-dashed border-gray-200 shadow-sm">
                <div className="bg-green-50 text-green-500 p-4 rounded-full mb-4">
                  <Briefcase size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">הכל נקי!</h3>
                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                  אין לך משימות פעילות כרגע. כל הכבוד!
                </p>
                <button
                  onClick={() => setView("OPEN")}
                  className="mt-4 text-blue-600 font-medium text-sm hover:underline"
                >
                  בדוק אם יש קריאות חדשות
                </button>
              </div>
            )}
          </>
        )}

        {view === "OPEN" && (
          <>
            {openTasks.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-500">אין קריאות פתוחות כרגע</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {openTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}
            </div>
          </>
        )}

        {view === "HISTORY" && (
          <>
            {completedTasks.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-500">אין משימות שהושלמו</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {hasMoreTasks && (
        <div className="flex justify-center pt-6">
          <button
            onClick={loadMoreTasks}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-black rounded-[1.5rem] font-black text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-xl"
          >
            {loading ? "טוען..." : "צפה במשימות קודמות"}
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamDashboard;
