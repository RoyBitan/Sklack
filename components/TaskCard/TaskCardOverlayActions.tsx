import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { useTaskCard } from "./context";

/**
 * TaskCard Overlay Actions Component
 * Displays edit/delete buttons for managers (absolute positioned)
 * Uses TaskCard context - no props needed!
 */
const TaskCardOverlayActions: React.FC = () => {
  const { isManager, setShowEditModal, handleDelete } = useTaskCard();

  if (!isManager) return null;

  return (
    <div className="absolute top-4 left-4 flex gap-1 z-20">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowEditModal(true);
        }}
        className="p-1.5 bg-white/80 backdrop-blur-sm border border-gray-100 hover:bg-black hover:text-white rounded-lg text-gray-400 transition-all shadow-sm active:scale-90"
      >
        <Edit2 size={12} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDelete();
        }}
        className="p-1.5 bg-white/80 backdrop-blur-sm border border-gray-100 hover:bg-red-500 hover:text-white rounded-lg text-red-400 transition-all shadow-sm active:scale-90"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

export default TaskCardOverlayActions;
