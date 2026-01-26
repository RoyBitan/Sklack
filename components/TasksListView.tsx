import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { Priority, Task, TaskStatus, UserRole } from "../types";
import TaskCard from "./TaskCard";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import CreateTaskModal from "./CreateTaskModal";
import EditTaskModal from "./EditTaskModal";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const TasksListView: React.FC = () => {
  const { profile } = useAuth();
  const {
    tasks,
    loading,
    deleteTask,
    updateTaskStatus,
    updateTask,
    hasMoreTasks,
    loadMoreTasks,
  } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filteredTasks = React.useMemo(() =>
    tasks.filter((t) => {
      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        matchesStatus = t.status === statusFilter;
      }

      const matchesSearch =
        (t.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (t.vehicle?.plate || "").includes(searchQuery) ||
        (t.vehicle?.model?.toLowerCase() || "").includes(
          searchQuery.toLowerCase(),
        );
      return matchesStatus && matchesSearch;
    }), [tasks, statusFilter, searchQuery]);

  const getStatusLabel = (s: TaskStatus) => {
    switch (s) {
      case TaskStatus.WAITING:
        return "ממתין לטיפול";
      case TaskStatus.APPROVED:
        return "אושר";
      case TaskStatus.IN_PROGRESS:
        return "בטיפול";
      case TaskStatus.COMPLETED:
        return "הושלם";
      case TaskStatus.CUSTOMER_APPROVAL:
        return "אישור לקוח";
      case TaskStatus.WAITING_FOR_APPROVAL:
        return "ממתין לאישור";
      case TaskStatus.CANCELLED:
        return "בוטל";
      default:
        return s;
    }
  };

  const getPriorityLabel = (p: Priority) => {
    switch (p) {
      case Priority.NORMAL:
        return "רגיל";
      case Priority.URGENT:
        return "דחוף";
      case Priority.CRITICAL:
        return "קריטי";
      default:
        return p;
    }
  };

  if (loading && tasks.length === 0) {
    return <LoadingSpinner message="טוען משימות..." />;
  }

  const canCreateTask = profile?.role === UserRole.SUPER_MANAGER;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-start">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            ניהול משימות
          </h1>
          <p className="text-gray-500 font-bold mt-1">
            צפה ונהל את כל המשימות הפעילות במוסך
          </p>
        </div>
        {canCreateTask && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-8 h-14 md:h-16 flex items-center gap-3 shadow-xl whitespace-nowrap"
          >
            <Plus size={24} />
            <span>משימה חדשה</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <input
            type="text"
            placeholder="חיפוש לפי שם משימה, לוחית רישוי או דגם..."
            className="input-premium pl-12 h-14 md:h-16 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
            size={20}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {[
            { id: "ALL", label: "הכל", icon: Filter },
            { id: TaskStatus.WAITING, label: "ממתין", icon: Clock },
            { id: TaskStatus.IN_PROGRESS, label: "בטיפול", icon: Wrench },
            { id: TaskStatus.COMPLETED, label: "הושלם", icon: CheckCircle2 },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id as any)}
              className={`flex items-center gap-2 px-6 h-14 md:h-16 rounded-2xl font-black whitespace-nowrap transition-all ${
                statusFilter === filter.id
                  ? "bg-black text-white shadow-xl scale-105"
                  : "bg-white text-gray-500 border border-gray-100 hover:border-gray-300"
              }`}
            >
              <filter.icon size={18} />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Task List Content */}
      <div className="space-y-4">
        {filteredTasks.length > 0
          ? (
            <>
              <div className="grid grid-cols-1 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>

              {hasMoreTasks && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMoreTasks}
                    disabled={loading}
                    className="px-10 py-4 bg-white border-2 border-black rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 shadow-lg"
                  >
                    {loading ? "טוען..." : "טען משימות נוספות"}
                  </button>
                </div>
              )}
            </>
          )
          : (
            <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-gray-100 py-32">
              <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">
                לא נמצאו משימות
              </h3>
              <p className="text-gray-500 font-bold mb-8">
                נסה לשנות את מסנני החיפוש שלך
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="text-black font-black text-sm uppercase tracking-widest border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
              >
                נקה את כל המסננים
              </button>
            </div>
          )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <CreateTaskModal onClose={() => setShowAddModal(false)} />
      )}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};

export default TasksListView;
