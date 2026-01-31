/**
 * Tasks Feature - Barrel Export
 *
 * This is the main entry point for the tasks feature.
 * Import from here for clean, feature-based imports.
 *
 * @example
 * import { TaskCard, useTasks, tasksService } from '@/features/tasks';
 */

// Components
export { default as TaskCard } from "./components/TaskCard/index";
export { default as CreateTaskModal } from "./components/CreateTaskModal";
export { default as EditTaskModal } from "./components/EditTaskModal";
export { default as TasksList } from "./components/TasksList";
export { default as TaskDetails } from "./components/TaskDetails";
export { default as HandOverModal } from "./components/HandOverModal";
export { default as CustomerTaskCard } from "./components/CustomerTaskCard";

// Context
export { TasksProvider, useTasks } from "./context/TasksContext";

// Hooks
// export { useTaskActions } from './hooks/useTaskActions';
// export { useTaskFilters } from './hooks/useTaskFilters';

// Services
export { tasksService } from "./services/tasks.service";

// Types
export * from "./types/task.types";

// Utils
// export * from './utils/task.utils';
