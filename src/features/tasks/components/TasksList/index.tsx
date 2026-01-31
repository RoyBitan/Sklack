import React, { memo, useCallback, useMemo, useState } from "react";
import { useTasks } from "../../context/TasksContext";
import { Priority, Task, TaskStatus, UserRole } from "@/types";
import TaskCard from "../TaskCard";
import { useDebounce } from "use-debounce";
import {
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import CreateTaskModal from "../CreateTaskModal";
import EditTaskModal from "../EditTaskModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * TasksList - Main tasks management view
 * Optimized with memoization for performance
 */
const TasksList: React.FC = () => {
  const { profile } = useAuth();
  const {
    tasks,
    loading,
    hasMoreTasks,
    loadMoreTasks,
  } = useTasks();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Memoize filtered tasks
  const filteredTasks = useMemo(() =>
    tasks.filter((t) => {
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = !debouncedSearchQuery ||
        (t.title?.toLowerCase() || "").includes(searchLower) ||
        (t.vehicle?.plate || "").includes(debouncedSearchQuery) ||
        (t.vehicle?.model?.toLowerCase() || "").includes(searchLower);

      return matchesStatus && matchesSearch;
    }), [tasks, statusFilter, debouncedSearchQuery]);

  // Memoize callbacks
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleOpenAddModal = useCallback(() => setShowAddModal(true), []);
  const handleCloseAddModal = useCallback(() => setShowAddModal(false), []);
  const handleCloseEditModal = useCallback(() => setEditingTask(null), []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("ALL");
  }, []);

  const canCreateTask = profile?.role === UserRole.SUPER_MANAGER;

  if (loading && tasks.length === 0) {
    return <LoadingSpinner message="טוען משימות..." />;
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up">
      {/* Header Area */}
      <TasksHeader
        canCreateTask={canCreateTask}
        onAddTask={handleOpenAddModal}
      />

      {/* Filters & Search */}
      <TasksFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={setStatusFilter}
      />

      {/* Task List Content */}
      <TasksContent
        tasks={filteredTasks}
        hasMoreTasks={hasMoreTasks}
        loading={loading}
        onLoadMore={loadMoreTasks}
        onClearFilters={handleClearFilters}
      />

      {/* Modals - Only render when needed */}
      {showAddModal && <CreateTaskModal onClose={handleCloseAddModal} />}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  );
};

/**
 * TasksHeader - Page title and add button
 */
const TasksHeader = memo<{
  canCreateTask: boolean;
  onAddTask: () => void;
}>(({ canCreateTask, onAddTask }) => (
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
        onClick={onAddTask}
        className="btn-primary px-8 h-14 md:h-16 flex items-center gap-3 shadow-xl whitespace-nowrap"
      >
        <Plus size={24} />
        <span>משימה חדשה</span>
      </button>
    )}
  </div>
));

TasksHeader.displayName = "TasksHeader";

/**
 * Filter buttons configuration
 */
const FILTER_OPTIONS = [
  { id: "ALL" as const, label: "הכל", icon: Filter },
  { id: TaskStatus.WAITING, label: "ממתין", icon: Clock },
  { id: TaskStatus.IN_PROGRESS, label: "בטיפול", icon: Wrench },
  { id: TaskStatus.COMPLETED, label: "הושלם", icon: CheckCircle2 },
];

/**
 * TasksFilters - Search and status filter bar
 */
const TasksFilters = memo<{
  searchQuery: string;
  statusFilter: TaskStatus | "ALL";
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (filter: TaskStatus | "ALL") => void;
}>(({ searchQuery, statusFilter, onSearchChange, onStatusChange }) => (
  <div className="flex flex-col lg:flex-row gap-4">
    <div className="relative flex-1 group">
      <input
        type="text"
        placeholder="חיפוש לפי שם משימה, לוחית רישוי או דגם..."
        className="input-premium pl-12 h-14 md:h-16 text-base"
        value={searchQuery}
        onChange={onSearchChange}
      />
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
        size={20}
      />
    </div>

    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
      {FILTER_OPTIONS.map((filter) => (
        <FilterButton
          key={filter.id}
          filter={filter}
          isActive={statusFilter === filter.id}
          onClick={() => onStatusChange(filter.id)}
        />
      ))}
    </div>
  </div>
));

TasksFilters.displayName = "TasksFilters";

/**
 * FilterButton - Individual filter button
 */
const FilterButton = memo<{
  filter: typeof FILTER_OPTIONS[number];
  isActive: boolean;
  onClick: () => void;
}>(({ filter, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 h-14 md:h-16 rounded-2xl font-black whitespace-nowrap transition-all ${
      isActive
        ? "bg-black text-white shadow-xl scale-105"
        : "bg-white text-gray-500 border border-gray-100 hover:border-gray-300"
    }`}
  >
    <filter.icon size={18} />
    <span>{filter.label}</span>
  </button>
));

FilterButton.displayName = "FilterButton";

/**
 * TasksContent - Task list or empty state
 */
const TasksContent = memo<{
  tasks: Task[];
  hasMoreTasks: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onClearFilters: () => void;
}>(({ tasks, hasMoreTasks, loading, onLoadMore, onClearFilters }) => (
  <div className="space-y-4">
    {tasks.length > 0
      ? (
        <>
          <TasksGrid tasks={tasks} />

          {hasMoreTasks && (
            <LoadMoreButton loading={loading} onClick={onLoadMore} />
          )}
        </>
      )
      : <EmptyTasksState onClearFilters={onClearFilters} />}
  </div>
));

TasksContent.displayName = "TasksContent";

/**
 * TasksGrid - Grid of task cards
 */
const TasksGrid = memo<{ tasks: Task[] }>(({ tasks }) => (
  <div className="grid grid-cols-1 gap-4">
    {tasks.map((task) => <MemoizedTaskCard key={task.id} task={task} />)}
  </div>
));

TasksGrid.displayName = "TasksGrid";

/**
 * MemoizedTaskCard - Wrapped TaskCard with memo
 */
const MemoizedTaskCard = memo(TaskCard);

/**
 * LoadMoreButton - Pagination button
 */
const LoadMoreButton = memo<{ loading: boolean; onClick: () => void }>((
  { loading, onClick },
) => (
  <div className="mt-8 flex justify-center">
    <button
      onClick={onClick}
      disabled={loading}
      className="px-10 py-4 bg-white border-2 border-black rounded-2xl font-black text-sm hover:bg-black hover:text-white transition-all disabled:opacity-50 shadow-lg"
    >
      {loading ? "טוען..." : "טען משימות נוספות"}
    </button>
  </div>
));

LoadMoreButton.displayName = "LoadMoreButton";

/**
 * EmptyTasksState - Empty search results
 */
const EmptyTasksState = memo<{ onClearFilters: () => void }>((
  { onClearFilters },
) => (
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
      onClick={onClearFilters}
      className="text-black font-black text-sm uppercase tracking-widest border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
    >
      נקה את כל המסננים
    </button>
  </div>
));

EmptyTasksState.displayName = "EmptyTasksState";

export default memo(TasksList);
