import React from "react";
import { X } from "lucide-react";

interface CreateTaskHeaderProps {
  onClose: () => void;
}

const CreateTaskHeader: React.FC<CreateTaskHeaderProps> = ({ onClose }) => {
  return (
    <div className="px-6 py-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-white sm:rounded-t-[2rem] sticky top-0 z-10 shrink-0">
      <div>
        <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tighter">
          משימה חדשה
        </h2>
        <p className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mt-1">
          פתיחת כרטיס עבודה לרכב
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all active:scale-90 touch-target"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default CreateTaskHeader;
