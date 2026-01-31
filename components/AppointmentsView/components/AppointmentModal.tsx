import React from "react";
import { formatLicensePlate } from "../../../utils/formatters";
import { formatPhoneNumberInput } from "../../../utils/phoneUtils";
import { Database, Edit2, Loader, Plus, X } from "lucide-react";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isManager: boolean;
  editingId: string | null;
  selectedDate: string;
  selectedTime: string | null;
  bookingData: {
    customerName: string;
    phone: string;
    vehiclePlate: string;
    serviceType: string;
    duration: string;
    make: string;
    mileage: string;
  };
  setBookingData: (data: any) => void;
  selectedService: string;
  setSelectedService: (val: string) => void;
  handleAutoFill: () => void;
  loadingApi: boolean;
  handleManagerBook: () => void;
  handleBook: () => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  isManager,
  editingId,
  selectedDate,
  selectedTime,
  bookingData,
  setBookingData,
  selectedService,
  setSelectedService,
  handleAutoFill,
  loadingApi,
  handleManagerBook,
  handleBook,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="booking-modal"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white w-[95%] max-w-lg rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-50 text-start">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {editingId && isManager ? "עריכת תור" : "זימון תור חדש"}
            </h2>
            <div className="text-blue-600 font-bold bg-blue-50 inline-block px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-blue-100 mt-1">
              {selectedDate} • {selectedTime}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-start">
          {isManager
            ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                      מספר טלפון
                    </label>
                    <input
                      type="tel"
                      className="input-premium h-14"
                      placeholder="050... "
                      value={bookingData.phone}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          phone: formatPhoneNumberInput(e.target.value),
                        })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                      שם לקוח
                    </label>
                    <input
                      type="text"
                      className="input-premium h-14"
                      placeholder="ישראל ישראלי"
                      value={bookingData.customerName}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          customerName: e.target.value,
                        })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                      מספר רכב
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input-premium w-full h-14 text-center tracking-widest font-mono"
                        placeholder="12-345-67"
                        value={bookingData.vehiclePlate}
                        onChange={(e) =>
                          setBookingData({
                            ...bookingData,
                            vehiclePlate: formatLicensePlate(e.target.value),
                          })}
                      />
                      <button
                        onClick={handleAutoFill}
                        disabled={loadingApi}
                        className="bg-black text-white px-4 rounded-xl"
                      >
                        {loadingApi
                          ? <Loader className="animate-spin" size={16} />
                          : <Database size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                      יצרן ודגם
                    </label>
                    <input
                      type="text"
                      className="input-premium h-14"
                      placeholder="..."
                      value={bookingData.make}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          make: e.target.value,
                        })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
                      קילומטראז'
                    </label>
                    <input
                      type="number"
                      className="input-premium h-14"
                      placeholder="KM"
                      value={bookingData.mileage}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          mileage: e.target.value,
                        })}
                    />
                  </div>
                </div>
              </>
            )
            : null}
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">
              מהות הטיפול / הערות
            </label>
            <textarea
              className="input-premium min-h-[120px] resize-none"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              placeholder="פרט כאן..."
            >
            </textarea>
          </div>
        </div>
        <div className="p-6 bg-gray-50/50 border-t border-gray-100">
          <button
            onClick={isManager ? handleManagerBook : handleBook}
            className="btn-primary w-full h-16 shadow-xl active:scale-95 flex items-center justify-center gap-3"
          >
            {isManager
              ? (
                editingId
                  ? (
                    <>
                      <Edit2 size={20} /> עדכן תור
                    </>
                  )
                  : (
                    <>
                      <Plus size={20} /> שריין תור
                    </>
                  )
              )
              : <>שלח בקשת תור</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
