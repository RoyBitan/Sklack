/**
 * TaskCard - Re-export from new feature location
 *
 * @deprecated This location is deprecated. Import from '@/src/features/tasks' instead.
 *
 * This file re-exports from the new feature-based location for backward compatibility.
 * All existing imports will continue to work during the migration period.
 *
 * New usage:
 *   import { TaskCard } from '@/src/features/tasks';
 *   // or
 *   import TaskCard from '@/src/features/tasks/components/TaskCard';
 */

// Re-export everything from the new location
export { default } from "@/src/features/tasks/components/TaskCard";
export { useTaskCard } from "@/src/features/tasks/components/TaskCard";
