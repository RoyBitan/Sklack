import React, { useRef } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserCircle2,
  X,
} from "lucide-react";
import { PreCheckInData, Vehicle } from "@/types";
import { formatLicensePlate } from "@/utils/formatters";
import { playClickSound } from "@/utils/uiUtils";

interface CheckInModalProps {
  showCheckIn: Vehicle | null;
  editingTaskId: string | null;
  checkInForm: Partial<PreCheckInData>;
  setCheckInForm: React.Dispatch<React.SetStateAction<Partial<PreCheckInData>>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const CheckInModal: React.FC<CheckInModalProps> = ({
  showCheckIn,
  editingTaskId,
  checkInForm,
  setCheckInForm,
  isSubmitting,
  onSubmit,
  onClose,
  scrollRef,
}) => {
  if (!showCheckIn) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={scrollRef}
        className="bg-white w-[95%] max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden border-t-[12px] border-blue-600"
      >
        {/* Header */}
        <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-50 bg-white">
          <div className="text-start">
            <h1 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-gray-900">
              <Sparkles className="text-blue-600" size={24} />
              {editingTaskId ? "עריכת פרטי תור" : "צ'ק-אין / הזמנת תור"}
            </h1>
            <p className="text-gray-400 font-bold text-[10px] sm:text-xs mt-1 uppercase tracking-widest">
              {showCheckIn.model} | {formatLicensePlate(showCheckIn.plate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <form id="check-in-form" onSubmit={onSubmit} className="space-y-8">
            {/* Personal Details Section */}
            <div className="space-y-5">
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                פרטי בעל הרכב
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    required
                    className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                    placeholder="שם מלא"
                    value={checkInForm.ownerName}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        ownerName: e.target.value,
                      })}
                  />
                  <UserCircle2
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                </div>
                <div className="relative">
                  <input
                    required
                    className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pr-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all text-left ltr"
                    placeholder="טלפון"
                    value={checkInForm.ownerPhone}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        ownerPhone: e.target.value,
                      })}
                  />
                  <Phone
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                </div>
                <div className="relative">
                  <input
                    className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                    placeholder="דואר אלקטרוני"
                    type="email"
                    value={checkInForm.ownerEmail}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        ownerEmail: e.target.value,
                      })}
                  />
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"
                    size={20}
                  />
                </div>
                <div className="relative">
                  <input
                    className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                    placeholder="כתובת מגורים"
                    value={checkInForm.ownerAddress}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        ownerAddress: e.target.value,
                      })}
                  />
                  <MapPin
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                </div>
              </div>
              {(!checkInForm.ownerName || !checkInForm.ownerPhone) && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl text-[10px] font-bold">
                  <AlertCircle size={14} />
                  <span>
                    חסרים פרטים אישיים. וודא שהם מעודכנים בתיק הלקוח.
                  </span>
                </div>
              )}
            </div>

            {/* Vehicle Details Section */}
            <div className="space-y-4">
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                קילומטראז' נוכחי
              </div>
              <div className="relative">
                <input
                  type="number"
                  className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-5 pl-12 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                  placeholder="הזן קילומטראז'..."
                  value={checkInForm.currentMileage || ""}
                  onChange={(e) =>
                    setCheckInForm({
                      ...checkInForm,
                      currentMileage: e.target.value,
                    })}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs">
                  KM
                </div>
              </div>
            </div>

            {/* Service Type Selection */}
            <div className="space-y-4">
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                סוג שירות מבוקש
              </div>
              <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
                <details className="group" open>
                  <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                    <span className="font-bold text-gray-700 text-sm">
                      {(checkInForm.serviceTypes?.length || 0) > 0
                        ? `נבחרו ${checkInForm.serviceTypes?.length} שירותים`
                        : "בחר שירותים לרכב..."}
                    </span>
                    <ChevronDown
                      className="transform transition-transform group-open:rotate-180 text-gray-400"
                      size={20}
                    />
                  </summary>
                  <div className="p-4 bg-white border-t border-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: "ROUTINE_SERVICE", label: "טיפול תקופתי" },
                      { id: "DIAGNOSTICS", label: "אבחון תקלה" },
                      { id: "BRAKES", label: "בלמים" },
                      { id: "TIRES", label: "צמיגים / פנצ'ר" },
                      { id: "BATTERY", label: "מצבר / חשמל" },
                      { id: "AIR_CONDITIONING", label: "מיזוג אוויר" },
                      { id: "TEST_PREP", label: "הכנה לטסט" },
                      { id: "OTHER", label: "אחר (פרט למטה)" },
                    ].map((service) => (
                      <label
                        key={service.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          (checkInForm.serviceTypes || []).includes(service.id)
                            ? "border-blue-500 bg-blue-50/50 text-blue-700"
                            : "border-transparent bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            (checkInForm.serviceTypes || []).includes(
                                service.id,
                              )
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {(checkInForm.serviceTypes || []).includes(
                            service.id,
                          ) && <Check size={12} strokeWidth={4} />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={(checkInForm.serviceTypes || []).includes(
                            service.id,
                          )}
                          onChange={() => {
                            setCheckInForm((prev) => {
                              const services = (
                                  prev.serviceTypes || []
                                ).includes(service.id)
                                ? (prev.serviceTypes || []).filter(
                                  (s) => s !== service.id,
                                )
                                : [...(prev.serviceTypes || []), service.id];
                              return { ...prev, serviceTypes: services };
                            });
                          }}
                        />
                        <span className="font-black text-[11px]">
                          {service.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
              {(checkInForm.serviceTypes || []).includes("OTHER") && (
                <div className="animate-fade-in">
                  <textarea
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition-all h-24 resize-none"
                    placeholder="פרט את הבעיה או הבקשה..."
                    value={checkInForm.faultDescription || ""}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        faultDescription: e.target.value,
                      })}
                  />
                </div>
              )}
            </div>

            {/* Schedule Appointment Section */}
            <div className="space-y-4">
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                מועד מבוקש (אופציונלי)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 px-2 uppercase tracking-widest">
                    תאריך
                  </label>
                  <input
                    type="date"
                    className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none"
                    value={checkInForm.appointmentDate}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        appointmentDate: e.target.value,
                      })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 px-2 uppercase tracking-widest">
                    שעה
                  </label>
                  <input
                    type="time"
                    className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-600 outline-none"
                    value={checkInForm.appointmentTime}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        appointmentTime: e.target.value,
                      })}
                  />
                </div>
              </div>
            </div>

            {/* Preferred Payment Method */}
            <div className="space-y-4">
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-100 pb-1 text-start">
                צורת תשלום מועדפת
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCheckInForm({
                      ...checkInForm,
                      paymentMethod: "CREDIT_CARD",
                    })}
                  className={`p-4 rounded-xl border-2 font-black flex flex-col items-center gap-2 transition-all ${
                    checkInForm.paymentMethod === "CREDIT_CARD"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  <CreditCard size={20} />{" "}
                  <span className="text-[10px]">כרטיס אשראי</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCheckInForm({
                      ...checkInForm,
                      paymentMethod: "CASH",
                    })}
                  className={`p-4 rounded-xl border-2 font-black flex flex-col items-center gap-2 transition-all ${
                    checkInForm.paymentMethod === "CASH"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  <DollarSign size={20} />{" "}
                  <span className="text-[10px]">מזומן</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCheckInForm({
                      ...checkInForm,
                      paymentMethod: "OTHER",
                    })}
                  className={`p-4 rounded-xl border-2 font-black flex flex-col items-center gap-2 transition-all ${
                    checkInForm.paymentMethod === "OTHER"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-50 bg-gray-50 text-gray-400 hover:bg-gray-100"
                  } col-span-2 sm:col-span-1`}
                >
                  <Sparkles size={20} />{" "}
                  <span className="text-[10px]">אמצעי אחר</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100">
          <button
            type="submit"
            form="check-in-form"
            disabled={isSubmitting}
            onClick={() => !isSubmitting && playClickSound()}
            className={`w-full h-16 sm:h-20 ${
              isSubmitting
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white rounded-3xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3`}
          >
            <span>
              {isSubmitting
                ? "מעדכן..."
                : editingTaskId
                ? "עדכן פרטים"
                : "בצע צ'ק-אין עכשיו"}
            </span>
            {isSubmitting
              ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              )
              : <CheckCircle2 size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;
