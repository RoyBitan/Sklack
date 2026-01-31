import React from "react";
import {
  Car,
  Check,
  FileText,
  Link,
  Shield,
  Trash2,
  Upload,
  UserCircle2,
} from "lucide-react";

interface CustomerDocumentsSectionProps {
  user: import("../../../types").Profile | null;
  uploadingDoc: string | null;
  uploadProgress: Record<string, number>;
  onUpload: (type: string, file: File) => void;
  onDelete: (type: string) => void;
}

const CustomerDocumentsSection: React.FC<CustomerDocumentsSectionProps> = ({
  user,
  uploadingDoc,
  uploadProgress,
  onUpload,
  onDelete,
}) => {
  return (
    <section className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl relative overflow-hidden group/docs">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2">
      </div>

      <div className="flex items-center gap-4 mb-10 px-1 text-start relative">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <FileText size={24} />
        </div>
        <div>
          <h3 className="font-black text-2xl tracking-tight text-gray-900">
            המסמכים שלי
          </h3>
          <p className="text-gray-400 text-xs font-bold mt-0.5">
            נהל את מסמכי הרכב והזיהוי שלך במקום אחד
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {[
          {
            id: "idCard",
            label: "תעודת זהות",
            icon: <UserCircle2 size={24} />,
          },
          { id: "carLicense", label: "רישיון רכב", icon: <Car size={24} /> },
          {
            id: "insurance",
            label: "ביטוח חובה",
            icon: <Shield size={24} />,
          },
        ].map((doc) => {
          const docUrl = user?.documents?.[doc.id];
          const isUploading = uploadingDoc === doc.id;
          const progress = uploadProgress[doc.id] || 0;

          return (
            <div
              key={doc.id}
              className="relative bg-white/60 backdrop-blur-md rounded-[2rem] p-8 border border-white flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1 group/card"
            >
              {/* Icon / Status Indicator */}
              <div
                className={`w-20 h-20 rounded-[1.75rem] mb-6 flex items-center justify-center transition-all duration-500 relative ${
                  docUrl
                    ? "bg-emerald-100 text-emerald-600 shadow-emerald-100"
                    : "bg-gray-50 text-gray-300"
                } shadow-xl`}
              >
                {isUploading
                  ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          className="text-blue-100"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          className="text-blue-600"
                          style={{
                            strokeDasharray: "176",
                            strokeDashoffset: `${176 - (progress / 100) * 176}`,
                            transition: "stroke-dashoffset 0.3s ease",
                          }}
                        />
                      </svg>
                      <span className="absolute text-[10px] font-black text-blue-600">
                        {progress}%
                      </span>
                    </div>
                  )
                  : (
                    <>
                      {doc.icon}
                      {docUrl && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white border-4 border-white animate-bounce-in">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      )}
                    </>
                  )}
              </div>

              <div className="text-base font-black text-gray-800 mb-6">
                {doc.label}
              </div>

              {/* Progress Bar (Traditional) */}
              {isUploading && (
                <div className="w-full h-1.5 bg-blue-50 rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                {!docUrl
                  ? (
                    <label
                      className={`w-full py-4 rounded-2xl font-black text-sm cursor-pointer transition-all flex items-center justify-center gap-3 active:scale-95 ${
                        isUploading
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-black text-white hover:bg-gray-800 shadow-lg"
                      }`}
                    >
                      <Upload size={18} />
                      {isUploading ? "מעלה..." : "בחר תמונה או PDF"}
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUpload(doc.id, file);
                        }}
                      />
                    </label>
                  )
                  : (
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                      >
                        <Link size={16} />
                        צפייה
                      </a>
                      <button
                        onClick={() => onDelete(doc.id)}
                        className="flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-2xl font-black text-xs hover:bg-red-100 transition-all active:scale-95"
                      >
                        <Trash2 size={16} />
                        מחיקה
                      </button>
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CustomerDocumentsSection;
