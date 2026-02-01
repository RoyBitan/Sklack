import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  Search,
  Trash2,
} from "lucide-react";
import { Priority, Task, TaskStatus } from "@/types";
import { TaskCard } from "@/src/features/tasks";

interface DashboardTaskListProps {
  loading: boolean;
  filteredTasks: Task[];
  hasMoreTasks: boolean;
  loadMoreTasks: () => void;
  getStatusLabel: (s: TaskStatus) => string;
  getPriorityLabel: (p: Priority) => string;
  handleApproveTask: (task: Task) => void;
  handleRescheduleTask: (task: Task) => void;
  handleCancelTask: (task: Task) => void;
  handleDeleteTask: (task: Task) => void;
  setEditingTask: (task: Task) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: TaskStatus | "ALL") => void;
}

export const DashboardTaskList: React.FC<DashboardTaskListProps> = ({
  loading,
  filteredTasks,
  hasMoreTasks,
  loadMoreTasks,
  getStatusLabel,
  getPriorityLabel,
  handleApproveTask,
  handleRescheduleTask,
  handleCancelTask,
  handleDeleteTask,
  setEditingTask,
  setSearchQuery,
  setStatusFilter,
}) => {
  return (
    <div id="task-list" className="pb-20">
      {loading
        ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse-slow">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-6">
            </div>
            <div className="font-black text-gray-400 uppercase tracking-[0.3em]">
              מעדכן משימות...
            </div>
          </div>
        )
        : filteredTasks.length > 0
        ? (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-4">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      משימה
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      רכב
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      סטטוס
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      דחיפות
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      תאריך
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-8 py-6 font-black text-gray-900">
                        {task.title}
                      </td>
                      <td className="px-8 py-6">
                        {task.vehicle
                          ? (
                            <div>
                              <div className="font-mono font-black text-sm">
                                {task.vehicle.plate}
                              </div>
                              <div className="text-xs text-gray-400">
                                {task.vehicle.model}
                              </div>
                            </div>
                          )
                          : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-3 py-1 text-[10px] font-bold rounded-full ${
                            task.status === TaskStatus.COMPLETED
                              ? "bg-green-100 text-green-700"
                              : task.status === TaskStatus.IN_PROGRESS
                              ? "bg-blue-100 text-blue-700"
                              : task.status === TaskStatus.WAITING_FOR_APPROVAL
                              ? "bg-purple-100 text-purple-700"
                              : task.status === TaskStatus.SCHEDULED
                              ? "bg-yellow-100 text-yellow-700"
                              : task.status === TaskStatus.APPROVED
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`text-[10px] font-bold ${
                            task.priority === Priority.CRITICAL
                              ? "text-red-600"
                              : task.priority === Priority.URGENT
                              ? "text-orange-600"
                              : "text-blue-600"
                          }`}
                        >
                          {getPriorityLabel(task.priority)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm text-gray-500">
                        {new Date(task.created_at).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          {task.metadata?.type ===
                                "APPOINTMENT_REQUEST" ||
                              task.status === TaskStatus.WAITING
                            ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApproveTask(task)}
                                  className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                                  title="אשר"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleRescheduleTask(task)}
                                  className="p-2 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors"
                                  title="תאם מחדש"
                                >
                                  <Clock size={16} />
                                </button>
                                <button
                                  onClick={() => handleCancelTask(task)}
                                  className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                                  title="בטל"
                                >
                                  <AlertCircle size={16} />
                                </button>
                              </div>
                            )
                            : (
                              <>
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                                  title="ערוך"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task)}
                                  className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                                  title="מחק"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMoreTasks && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={loadMoreTasks}
                  disabled={loading}
                  className="px-12 py-4 bg-white border-2 border-black rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-xl"
                >
                  {loading ? "טוען..." : "טען משימות נוספות"}
                </button>
              </div>
            )}
          </>
        )
        : (
          <div className="card-premium p-20 md:p-40 text-center flex flex-col items-center group">
            <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2rem] flex items-center justify-center mb-8 transition-transform group-hover:rotate-12">
              <Search size={48} />
            </div>
            <div className="text-gray-400 font-black uppercase tracking-[0.2em] text-xl">
              לא נמצאו משימות תואמות
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-8 text-black font-black text-xs uppercase tracking-widest border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
            >
              נקה את כל המסננים
            </button>
          </div>
        )}
    </div>
  );
};
