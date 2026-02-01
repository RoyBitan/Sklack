import React from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";

interface CustomerBookViewProps {
  selectedService: string;
  setSelectedService: (val: string) => void;
  selectedDate: string;
  setSelectedDate: (val: string) => void;
  selectedTime: string | null;
  setSelectedTime: (val: string | null) => void;
  mileage: string;
  setMileage: (val: string) => void;
  loading: boolean;
  handleBook: () => void;
  WORKING_HOURS: string[];
}

const CustomerBookView: React.FC<CustomerBookViewProps> = ({
  selectedService,
  setSelectedService,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  mileage,
  setMileage,
  loading,
  handleBook,
  WORKING_HOURS,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-20 text-center">
      <div className="card-premium p-12 md:p-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-black"></div>
        <h2 className="text-5xl font-black tracking-tighter mb-12 flex items-center justify-center gap-8 text-center">
          <div className="p-5 bg-black text-white rounded-3xl shadow-2xl">
            <CalendarDays size={40} />
          </div>
          קביעת תור למווסך
        </h2>
        <div className="space-y-10 text-start">
          <div className="group">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4 px-2">
              סוג הטיפול המבוקש
            </label>
            <select
              className="input-premium h-20 text-xl"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="">-- בחר שירות --</option>
              <option value="טיפול שנתי">טיפול שנתי תקופתי</option>
              <option value="הכנה לטסט">הכנה לטסט ורישוי</option>
              <option value="דיאגנוסטיקה">דיאגנוסטיקה ממוחשבת</option>
              <option value="תיקון כללי">תיקון כללי / מכונאות</option>
            </select>
          </div>
          <div className="group">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4 px-2">
              בחר תאריך מבוקש
            </label>
            <input
              type="date"
              className="input-premium h-20 text-xl"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="group">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6 px-2">
              בחר שעה פנויה
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {WORKING_HOURS.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`h-16 rounded-[1.2rem] font-black text-base transition-all duration-300 border-2 ${
                    selectedTime === time
                      ? "bg-black text-white border-black shadow-2xl scale-105"
                      : "bg-gray-50 border-transparent text-gray-400 hover:border-gray-200"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div className="group">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4 px-2">
              קילומטראז' נוכחי
            </label>
            <input
              type="number"
              className="input-premium h-20 text-xl"
              placeholder="כמה קילומטר הרכב עבר?"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </div>
          <button
            onClick={handleBook}
            disabled={loading || !selectedService || !selectedTime}
            className="btn-primary w-full h-24 text-2xl mt-12 shadow-2xl tracking-tight group"
          >
            {loading
              ? (
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin">
                </div>
              )
              : (
                <span className="group-hover:scale-110 transition-transform flex items-center justify-center gap-4">
                  שריין מקום עכשיו <CheckCircle2 size={32} />
                </span>
              )}
          </button>
        </div>
      </div>
      <p className="text-gray-400 font-bold text-sm italic">
        * קביעת התור מותנית באישור סופי של מנהל המוסך
      </p>
    </div>
  );
};

export default CustomerBookView;
