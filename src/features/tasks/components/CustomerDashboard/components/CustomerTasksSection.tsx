import React, { memo, useCallback, useMemo } from "react";
import { Car, CheckCircle2 } from "lucide-react";
import { Task } from "@/types";
import { CustomerTaskCard } from "@/src/features/tasks";

interface CustomerTasksSectionProps {
  activeTab: "ACTIVE" | "HISTORY";
  setActiveTab: (tab: "ACTIVE" | "HISTORY") => void;
  activeTasks: Task[];
  completedTasks: Task[];
  hasMoreTasks: boolean;
  loading: boolean;
  loadMoreTasks: () => void;
  garagePhone: string | null;
  onShowRequest: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

/**
 * CustomerTasksSection - Memoized for performance
 * Only re-renders when tasks or activeTab change
 */
const CustomerTasksSection: React.FC<CustomerTasksSectionProps> = memo(({
  activeTab,
  setActiveTab,
  activeTasks,
  completedTasks,
  hasMoreTasks,
  loading,
  loadMoreTasks,
  garagePhone,
  onShowRequest,
  onCancel,
  onEdit,
}) => {
  // Memoize current tasks based on active tab
  const currentTasks = useMemo(
    () => activeTab === "ACTIVE" ? activeTasks : completedTasks,
    [activeTab, activeTasks, completedTasks],
  );

  return (
    <section className="space-y-6">
      <TasksHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCount={activeTasks.length}
        completedCount={completedTasks.length}
      />

      {currentTasks.length > 0
        ? (
          <>
            <TasksGrid
              tasks={currentTasks}
              garagePhone={garagePhone}
              onShowRequest={onShowRequest}
              onCancel={onCancel}
              onEdit={onEdit}
            />

            {hasMoreTasks && (
              <LoadMoreButton
                loading={loading}
                onClick={loadMoreTasks}
              />
            )}
          </>
        )
        : <EmptyTasksState />}
    </section>
  );
});

CustomerTasksSection.displayName = "CustomerTasksSection";

/**
 * TasksHeader - Tab navigation (memoized)
 */
const TasksHeader = memo<{
  activeTab: "ACTIVE" | "HISTORY";
  setActiveTab: (tab: "ACTIVE" | "HISTORY") => void;
  activeCount: number;
  completedCount: number;
}>(({ activeTab, setActiveTab, activeCount, completedCount }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
    <h3 className="font-black text-2xl text-gray-900 tracking-tight text-start flex items-center gap-3">
      <CheckCircle2 size={26} className="text-blue-600" />
      {activeTab === "ACTIVE" ? "הטיפולים שלי" : "היסטוריית טיפולים"}
    </h3>
    <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
      <button
        onClick={() => setActiveTab("ACTIVE")}
        className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
          activeTab === "ACTIVE"
            ? "bg-white text-black shadow-md scale-105"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        טיפולים פעילים ({activeCount})
      </button>
      <button
        onClick={() => setActiveTab("HISTORY")}
        className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
          activeTab === "HISTORY"
            ? "bg-white text-black shadow-md scale-105"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        היסטוריה ({completedCount})
      </button>
    </div>
  </div>
));

TasksHeader.displayName = "TasksHeader";

/**
 * TasksGrid - Memoized grid of task cards
 */
const TasksGrid = memo<{
  tasks: Task[];
  garagePhone: string | null;
  onShowRequest: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onEdit: (task: Task) => void;
}>(({ tasks, garagePhone, onShowRequest, onCancel, onEdit }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {tasks.map((task) => (
      <MemoizedCustomerTaskCard
        key={task.id}
        task={task}
        garagePhone={garagePhone}
        onShowRequest={onShowRequest}
        onCancel={onCancel}
        onEdit={onEdit}
      />
    ))}
  </div>
));

TasksGrid.displayName = "TasksGrid";

/**
 * MemoizedCustomerTaskCard - Wrapper to prevent re-renders
 */
const MemoizedCustomerTaskCard = memo(CustomerTaskCard);

/**
 * LoadMoreButton - Memoized load more button
 */
const LoadMoreButton = memo<{ loading: boolean; onClick: () => void }>((
  { loading, onClick },
) => (
  <div className="flex justify-center pt-8">
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full sm:w-auto px-12 py-4 bg-white border-2 border-black rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
    >
      {loading ? "טוען..." : "טען טיפולים נוספים"}
    </button>
  </div>
));

LoadMoreButton.displayName = "LoadMoreButton";

/**
 * EmptyTasksState - Empty state (static, memoized)
 */
const EmptyTasksState = memo(() => (
  <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 shadow-inner flex flex-col items-center">
    <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 text-gray-200">
      <Car size={48} />
    </div>
    <p className="text-gray-400 font-black text-lg">
      אין לך טיפולים פעילים כרגע.
    </p>
  </div>
));

EmptyTasksState.displayName = "EmptyTasksState";

export default CustomerTasksSection;
