import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Task, TaskStatus, Vehicle } from "@/types";
import { Car, CheckCircle2, Clock, MapPin, Phone, Wrench } from "lucide-react";
import SklackLogo from "@/components/SklackLogo";
import { useParams } from "react-router-dom";

interface PublicOrderStatusProps {
  taskId?: string;
}

const PublicOrderStatus: React.FC<PublicOrderStatusProps> = (
  { taskId: propTaskId },
) => {
  const { taskId: urlTaskId } = useParams<{ taskId: string }>();
  const taskId = propTaskId || urlTaskId;
  const [task, setTask] = useState<Task | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTaskStatus = async () => {
      try {
        // Fetch task with vehicle info
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select(`
                        *,
                        vehicle:vehicles(*)
                    `)
          .eq("id", taskId)
          .maybeSingle();

        if (taskError) throw taskError;

        if (!taskData) {
          setError("לא נמצאה משימה עם המזהה הזה");
          return;
        }

        // IDOR Protection: Check session ownership if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          // If user is a customer, they must own the task
          if (profile?.role === "CUSTOMER") {
            const isOwner = taskData.customer_id === session.user.id ||
              taskData.created_by === session.user.id ||
              taskData.vehicle?.owner_id === session.user.id;

            if (!isOwner) {
              setError("אין לך הרשאה לצפות במשימה זו");
              setLoading(false);
              return;
            }
          }
        }

        setTask(taskData);
        setVehicle(taskData.vehicle);
      } catch (err) {
        console.error("Error fetching task:", err);
        setError("לא נמצאה משימה עם המזהה הזה");
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchTaskStatus();

      // Subscribe to realtime updates
      const subscription = supabase
        .channel(`task-${taskId}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `id=eq.${taskId}`,
        }, (payload: { new: Task }) => {
          setTask(payload.new);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [taskId]);

  const getProgressPercentage = () => {
    if (!task) return 0;
    switch (task.status) {
      case TaskStatus.WAITING:
        return 33;
      case TaskStatus.IN_PROGRESS:
        return 66;
      case TaskStatus.COMPLETED:
        return 100;
      default:
        return 0;
    }
  };

  const getStatusLabel = () => {
    if (!task) return "";
    switch (task.status) {
      case TaskStatus.WAITING:
        return "ממתין לטיפול";
      case TaskStatus.IN_PROGRESS:
        return "בטיפול";
      case TaskStatus.COMPLETED:
        return "הושלם";
      default:
        return task.status;
    }
  };

  const getStatusIcon = () => {
    if (!task) return Clock;
    switch (task.status) {
      case TaskStatus.WAITING:
        return Clock;
      case TaskStatus.IN_PROGRESS:
        return Wrench;
      case TaskStatus.COMPLETED:
        return CheckCircle2;
      default:
        return Clock;
    }
  };

  const getStatusColor = () => {
    if (!task) return "text-gray-400";
    switch (task.status) {
      case TaskStatus.WAITING:
        return "text-orange-500";
      case TaskStatus.IN_PROGRESS:
        return "text-blue-500";
      case TaskStatus.COMPLETED:
        return "text-green-500";
      default:
        return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="animate-pulse-slow text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4">
          </div>
          <p className="text-gray-500 font-bold">טוען...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Car size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            משימה לא נמצאה
          </h2>
          <p className="text-gray-500 font-medium">
            {error || "אנא בדוק את הקישור ונסה שוב"}
          </p>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon();
  const progress = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="bg-black text-white p-4 rounded-2xl inline-block mb-6 shadow-2xl">
            <SklackLogo size={40} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
            מעקב אחר הרכב שלך
          </h1>
          <p className="text-gray-500 font-medium">
            עדכון בזמן אמת על סטטוס הטיפול
          </p>
        </div>

        {/* Vehicle Info */}
        {vehicle && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center">
                <Car size={32} />
              </div>
              <div className="flex-1">
                <div className="bg-[#FFE600] border-4 border-black rounded-[1.2rem] px-5 py-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] inline-block mb-2">
                  <span className="font-mono font-black text-xl tracking-[0.2em]">
                    {vehicle.plate}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-700">
                  {vehicle.model}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Task Info */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-2xl font-black text-gray-900 mb-4">
            {task.title}
          </h2>
          {task.description && (
            <p className="text-gray-600 font-medium mb-6">{task.description}</p>
          )}

          {/* Status */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`w-14 h-14 ${
                getStatusColor().replace("text-", "bg-").replace("500", "100")
              } ${getStatusColor()} rounded-2xl flex items-center justify-center`}
            >
              <StatusIcon size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                סטטוס
              </p>
              <p className={`text-xl font-black ${getStatusColor()}`}>
                {getStatusLabel()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-bold text-gray-500">
              <span>התקדמות</span>
              <span>{progress}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  task.status === TaskStatus.COMPLETED
                    ? "bg-green-500"
                    : task.status === TaskStatus.IN_PROGRESS
                    ? "bg-blue-500"
                    : "bg-orange-500"
                }`}
                style={{ width: `${progress}%` }}
              >
              </div>
            </div>

            {/* Timeline */}
            <div className="flex justify-between pt-4">
              <div
                className={`text-center ${
                  task.status === TaskStatus.WAITING ||
                    task.status === TaskStatus.IN_PROGRESS ||
                    task.status === TaskStatus.COMPLETED
                    ? "opacity-100"
                    : "opacity-30"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                    task.status === TaskStatus.WAITING ||
                      task.status === TaskStatus.IN_PROGRESS ||
                      task.status === TaskStatus.COMPLETED
                      ? "bg-orange-500"
                      : "bg-gray-300"
                  }`}
                >
                </div>
                <p className="text-xs font-bold text-gray-500">התקבל</p>
              </div>
              <div
                className={`text-center ${
                  task.status === TaskStatus.IN_PROGRESS ||
                    task.status === TaskStatus.COMPLETED
                    ? "opacity-100"
                    : "opacity-30"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                    task.status === TaskStatus.IN_PROGRESS ||
                      task.status === TaskStatus.COMPLETED
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }`}
                >
                </div>
                <p className="text-xs font-bold text-gray-500">בטיפול</p>
              </div>
              <div
                className={`text-center ${
                  task.status === TaskStatus.COMPLETED
                    ? "opacity-100"
                    : "opacity-30"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                    task.status === TaskStatus.COMPLETED
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                </div>
                <p className="text-xs font-bold text-gray-500">הושלם</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="mt-8 pt-6 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-gray-500">נפתח ב:</span>
              <span className="font-black text-gray-900">
                {new Date(task.created_at).toLocaleDateString("he-IL")}{" "}
                {new Date(task.created_at).toLocaleTimeString("he-IL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {task.status === TaskStatus.COMPLETED && task.updated_at && (
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-500">הושלם ב:</span>
                <span className="font-black text-green-600">
                  {new Date(task.updated_at).toLocaleDateString("he-IL")}{" "}
                  {new Date(task.updated_at).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-black to-gray-800 rounded-3xl shadow-xl p-8 text-white text-center">
          <h3 className="text-xl font-black mb-4">יש שאלות?</h3>
          <p className="text-white/80 font-medium mb-6">
            צור קשר עם המוסך לפרטים נוספים
          </p>
          <a
            href="tel:+972501234567"
            className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black hover:scale-105 transition-transform shadow-xl"
          >
            <Phone size={24} />
            <span>התקשר למוסך</span>
          </a>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 font-bold">
            Powered by Sklack Garage OS
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicOrderStatus;
