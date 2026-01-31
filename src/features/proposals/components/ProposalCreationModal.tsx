import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Loader, Mic, Send, Upload, X } from "lucide-react";
import { useProposals } from "../context/ProposalsContext";
import { compressImage, uploadAsset } from "@/shared/utils/assetUtils";
import { toast } from "sonner";
import { scrollToFormStart } from "@/shared/utils/uiUtils";

interface ProposalCreationModalProps {
  taskId: string;
  onClose: () => void;
}

const ProposalCreationModal: React.FC<ProposalCreationModalProps> = ({
  taskId,
  onClose,
}) => {
  const { addProposal } = useProposals();
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollToFormStart(scrollRef.current);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("אנא הכנס תיאור לבקשה");
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;
      let audioUrl = null;

      if (photo) {
        const compressed = await compressImage(photo, 1200, 1200, 0.6);
        const fileExt = photo.name.split(".").pop() || "jpg";
        const filePath = `proposals/${taskId}/photo-${Date.now()}.${fileExt}`;
        photoUrl = await uploadAsset(compressed, "tasks", filePath);
      }

      if (audio) {
        // Audio doesn't need compression usually, it's small enough
        const fileExt = audio.name.split(".").pop() || "mp3";
        const filePath = `proposals/${taskId}/audio-${Date.now()}.${fileExt}`;
        audioUrl = await uploadAsset(audio, "tasks", filePath);
      }

      await addProposal(taskId, {
        description,
        photo_url: photoUrl,
        audio_url: audioUrl, // Pass audio url
      });

      onClose();
    } catch (err) {
      console.error("Failed to create proposal:", err);
      const message = err instanceof Error ? err.message : "שגיאה ביצירת הבקשה";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up">
      <div
        ref={scrollRef}
        className="bg-white w-full sm:w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">
            הצעת תיקון נוסף 💡
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto"
        >
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
              תיאור התקלה / התיקון המוצע
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-premium h-32 py-4 resize-none"
              placeholder="לדוגמה: רפידות בלם שחוקות גלגל ימין..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Photo Upload */}
            <div
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                photo
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files?.[0] && setPhoto(e.target.files[0])}
                  className="hidden"
                />
                {photo
                  ? (
                    <>
                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-2">
                        <Camera size={20} />
                      </div>
                      <span className="text-xs font-bold text-emerald-700 truncate max-w-full">
                        {photo.name}
                      </span>
                    </>
                  )
                  : (
                    <>
                      <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-2">
                        <Camera size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400">
                        צלם תמונה
                      </span>
                    </>
                  )}
              </label>
            </div>

            {/* Audio Upload */}
            <div
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                audio
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="audio/*"
                  // capture // Removed to avoid potential issues on some browsers if not needed
                  onChange={(e) =>
                    e.target.files?.[0] && setAudio(e.target.files[0])}
                  className="hidden"
                />
                {audio
                  ? (
                    <>
                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-2">
                        <Mic size={20} />
                      </div>
                      <span className="text-xs font-bold text-emerald-700 truncate max-w-full">
                        הקלטה צורפה
                      </span>
                    </>
                  )
                  : (
                    <>
                      <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-2">
                        <Mic size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400">
                        הוסף הקלטה
                      </span>
                    </>
                  )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-black text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <Loader className="animate-spin" /> : (
              <>
                <Send size={18} />
                שלח לאישור מנהל
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ProposalCreationModal;
