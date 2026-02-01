import React from "react";
import { Camera, Trash2 } from "lucide-react";

interface RequestFormModalProps {
  showRequestForm: string | null;
  requestText: string;
  setRequestText: (text: string) => void;
  requestPhoto: File | null;
  setRequestPhoto: (file: File | null) => void;
  onSubmit: (taskId: string, photo?: File) => void;
  onClose: () => void;
}

const RequestFormModal: React.FC<RequestFormModalProps> = ({
  showRequestForm,
  requestText,
  setRequestText,
  requestPhoto,
  setRequestPhoto,
  onSubmit,
  onClose,
}) => {
  if (!showRequestForm) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm animate-scale-in">
        <h4 className="font-black text-lg mb-4">בקשה נוספת לטיפול</h4>
        <textarea
          className="w-full bg-gray-50 rounded-xl p-4 mb-4 h-32 border-2 border-transparent focus:border-blue-500 outline-none resize-none"
          placeholder="פרט את הבקשה שלך..."
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
        />
        <div className="flex items-center gap-4 mb-6">
          <label className="flex-1 flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-100 transition-all">
            <Camera size={20} className="text-blue-500" />
            <span className="text-xs font-black text-gray-500">
              {requestPhoto ? "תמונה נבחרה" : "צרף תמונה"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setRequestPhoto(e.target.files?.[0] || null)}
            />
          </label>
          {requestPhoto && (
            <button
              onClick={() => setRequestPhoto(null)}
              className="p-4 bg-red-50 text-red-500 rounded-xl border-2 border-transparent hover:border-red-500 transition-all"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={() => onSubmit(showRequestForm, requestPhoto || undefined)}
            className="flex-1 bg-black text-white py-3 rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-all active:scale-95"
          >
            שלח בקשה
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestFormModal;
