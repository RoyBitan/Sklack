import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/features/auth";
import { useData } from "@/contexts/DataContext";
import { useApp } from "@/contexts/AppContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  getTaskFaultDescription,
  getTaskMileage,
  getTaskOwnerName,
  getTaskOwnerPhone,
  getTaskServiceTypes,
  TaskStatus,
} from "@/types";
import {
  ArrowRight,
  CalendarDays,
  Check,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { formatLicensePlate } from "@/src/shared/utils/formatters";
import { toast } from "sonner";

/**
 * RequestDetailsView - Displays detailed information about a service request
 * Refactored for complete type safety using typed metadata and helper functions.
 */
const RequestDetailsView: React.FC = () => {
  const { id: urlRequestId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { tasks, approveTask } = useData();
  const { setSelectedRequestId, navigateTo } = useApp();
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync context with URL param
  useEffect(() => {
    if (urlRequestId) {
      setSelectedRequestId(urlRequestId);
    }
    return () => setSelectedRequestId(null);
  }, [urlRequestId, setSelectedRequestId]);

  const request = useMemo(() => tasks.find((t) => t.id === urlRequestId), [
    tasks,
    urlRequestId,
  ]);

  // IDOR Protection: Customers can ONLY view their own requests
  useEffect(() => {
    if (!request || !profile) return;

    if (
      profile.role === "CUSTOMER" &&
      request.customer_id !== profile.id &&
      request.vehicle?.owner_id !== profile.id
    ) {
      navigate("/appointments");
      toast.error("אין לך הרשאה לצפות בבקשה זו");
    }
  }, [request, profile, navigate]);

  const serviceLabels: Record<string, string> = {
    "ROUTINE_SERVICE": "טיפול תקופתי",
    "DIAGNOSTICS": "אבחון ותקלה",
    "BRAKES": "ברקסים",
    "ENGINE": "מנוע וגיר",
    "AIR_CONDITIONING": "מיזוג אוויר",
    "ELECTRICAL": "חשמל ודיאגנוסטיקה",
    "TIRES": "צמיגים וכיוון פרונט",
    "OTHER": "אחר",
  };

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h2 className="text-xl font-black text-gray-900 mb-2">
          הבקשה לא נמצאה
        </h2>
        <button
          onClick={() => {
            setSelectedRequestId(null);
            navigateTo("APPOINTMENTS");
          }}
          className="text-purple-600 font-bold flex items-center gap-2"
        >
          <ArrowRight size={20} />
          חזרה לניהול תורים
        </button>
      </div>
    );
  }

  const ownerName = getTaskOwnerName(request);
  const ownerPhone = getTaskOwnerPhone(request);
  const mileage = getTaskMileage(request);
  const serviceTypes = getTaskServiceTypes(request);
  const faultDescription = getTaskFaultDescription(request);
  const { metadata } = request;

  const handleBack = () => {
    setSelectedRequestId(null);
    navigateTo("APPOINTMENTS");
  };

  const onApprove = async (sendToTeamNow: boolean) => {
    if (!approveTask) return;
    setIsUpdating(true);
    try {
      await approveTask(request.id, sendToTeamNow);
      handleBack();
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Header */}
      <div className="flex-none p-5 md:p-6 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowRight size={24} className="text-gray-600" />
          </button>
          <div className="text-start">
            <h3 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-3">
              <MessageSquare className="text-purple-600 ltr" size={24} />
              בקשת תור חדשה
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="bg-[#FFE600] border-2 border-black rounded-lg px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-mono font-black text-xs tracking-widest">
                  {formatLicensePlate(
                    request.vehicle?.plate || metadata?.vehiclePlate || "",
                  )}
                </span>
              </div>
              <span className="text-xs font-bold text-gray-400">|</span>
              <span className="text-xs font-black text-gray-500">
                {request.vehicle?.model || metadata?.vehicleModel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto p-5 md:p-8 space-y-6 pb-24 native-scroll">
        {/* Section: Service & Schedule */}
        <div className="bg-purple-900 text-white p-7 md:p-10 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute -bottom-8 -left-8 opacity-10 group-hover:scale-110 transition-transform">
            <CalendarDays size={150} />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-black text-purple-300 uppercase tracking-[0.15em] mb-4">
              מועד מבוקש ושירות
            </div>
            <div className="text-3xl md:text-4xl font-black tracking-tighter mb-6 outline-none">
              {metadata?.appointmentDate}
              <span className="text-purple-400 mx-3 text-2xl font-bold">@</span>
              {metadata?.appointmentTime}
            </div>
            <div className="flex flex-wrap gap-2 pt-6 border-t border-white/10">
              {serviceTypes.length > 0
                ? (
                  serviceTypes.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-5 py-2.5 bg-white/10 rounded-2xl text-[13px] font-black border border-white/10"
                    >
                      {serviceLabels[t] || t}
                    </span>
                  ))
                )
                : (
                  <span className="px-5 py-2.5 bg-white/10 rounded-2xl text-[13px] font-black border border-white/10">
                    {request.title || "כללי"}
                  </span>
                )}
            </div>
          </div>
        </div>

        {/* Section: Customer Info */}
        <div className="space-y-4">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 text-start">
            פרטי תקשורת ולקוח
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 text-start group hover:border-purple-200 transition-colors">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-3">
                <User size={20} />
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">
                שם הלקוח
              </div>
              <div className="font-black text-gray-900 text-lg">
                {ownerName}
              </div>
            </div>
            {ownerPhone && (
              <a
                href={`tel:${ownerPhone}`}
                className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 text-start group hover:border-green-200 transition-colors"
              >
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-3">
                  <Phone size={20} />
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">
                  חייג ללקוח
                </div>
                <div className="font-black text-gray-900 text-lg font-mono tracking-tighter">
                  {ownerPhone}
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Section: Vehicle Specs */}
        <div className="space-y-4">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 text-start">
            מפרט רכב
          </div>
          <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-6 text-start">
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  קילומטראז'
                </div>
                <div className="font-black text-gray-900 text-base">
                  {mileage || "---"} KM
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  צבע וגימור
                </div>
                <div className="font-black text-gray-900 text-base">
                  {request.vehicle?.color || metadata?.vehicleColor || "---"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  סוג דלק
                </div>
                <div className="font-black text-gray-900 text-base">
                  {request.vehicle?.fuel_type || metadata?.fuelType || "---"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  קודנית / נעילה
                </div>
                <div className="font-black text-red-600 font-mono tracking-widest text-base">
                  {request.immobilizer_code || request.vehicle?.kodanit ||
                    metadata?.immobilizerCode || "---"}
                </div>
              </div>
              <div className="col-span-2 pt-4 border-t border-gray-50 space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  מספר שלדה (VIN)
                </div>
                <div className="font-black text-gray-900 font-mono text-sm uppercase break-all">
                  {request.vehicle?.vin || metadata?.vin || "---"}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  דגם מנוע
                </div>
                <div className="font-black text-gray-900 font-mono uppercase text-sm">
                  {request.vehicle?.engine_model || metadata?.engineModel ||
                    "---"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Remarks */}
        <div className="space-y-4">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 text-start">
            תיאור התקלה / הערות
          </div>
          <div className="bg-white p-7 rounded-[1.5rem] shadow-sm border-2 border-dashed border-gray-100">
            <p className="text-xl font-bold leading-relaxed italic text-gray-600 text-start">
              "{faultDescription || "אין הערות נוספות"}"
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="flex-none p-5 md:p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
        {request.status === TaskStatus.WAITING_FOR_APPROVAL
          ? (
            <div className="flex flex-col gap-3">
              <button
                disabled={isUpdating}
                onClick={() => onApprove(true)}
                className="w-full bg-green-600 text-white py-4 rounded-[1.2rem] font-black text-lg shadow-xl hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Check size={24} />
                אישור ושליחה לביצוע בצוות
              </button>
              <button
                disabled={isUpdating}
                onClick={() => onApprove(false)}
                className="w-full bg-white text-black border-2 border-black py-4 rounded-[1.2rem] font-black text-base shadow-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                אישור כמשובץ (ללא הודעת צוות)
              </button>
            </div>
          )
          : (
            <button
              onClick={handleBack}
              className="w-full bg-black text-white py-4 rounded-[1.2rem] font-black text-base shadow-2xl hover:bg-gray-900 transition-all active:scale-95 touch-target flex items-center justify-center gap-3"
            >
              חזרה לרשימה
            </button>
          )}
      </div>
    </div>
  );
};

export default RequestDetailsView;
