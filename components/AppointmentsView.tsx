import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { AppointmentStatus, UserRole } from '../types';
import { CalendarDays, Clock, Check, X, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';

const AppointmentsView: React.FC = () => {
    const { t } = useApp();
    const { appointments, refreshData } = useData();
    const { profile } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split?.('T')?.[0] || new Date().toISOString().substring(0, 10));
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState('');
    const [loading, setLoading] = useState(false);

    const isManager = profile?.role === UserRole.SUPER_MANAGER || profile?.role === UserRole.DEPUTY_MANAGER;

    const WORKING_HOURS = useMemo(() => {
        const slots = [];
        let current = 8;
        while (current <= 16) {
            const h = Math.floor(current);
            const m = current % 1 === 0 ? '00' : '30';
            slots.push(`${h.toString().padStart(2, '0')}:${m}`);
            current += 0.5;
        }
        return slots;
    }, []);

    const handleBook = async () => {
        if (!selectedTime || !selectedService || !profile?.org_id) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('appointments').insert({
                org_id: profile.org_id,
                customer_id: profile.id,
                service_type: selectedService,
                appointment_date: selectedDate,
                appointment_time: selectedTime,
                status: 'PENDING'
            });
            if (error) throw error;
            await refreshData();
            setSelectedTime(null);
            setSelectedService('');
        } catch (err) {
            console.error('Failed to book appointment:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: AppointmentStatus) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
            await refreshData();
        } catch (err) {
            console.error('Failed to update appointment:', err);
        }
    };

    if (isManager) {
        return (
            <div className="space-y-12 animate-fade-in-up selection:bg-black selection:text-white">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-black pb-10">
                    <h2 className="text-5xl font-black tracking-tighter">יומן תורים</h2>
                    <div className="flex bg-white p-2 rounded-[1.5rem] shadow-xl border border-gray-100 items-center gap-4">
                        <button className="p-4 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
                        <input
                            type="date"
                            className="input-premium py-3 px-8 w-auto h-14 border-0 bg-transparent focus:bg-transparent"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <button className="p-4 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
                    </div>
                </div>

                <div className="space-y-6">
                    {WORKING_HOURS.map(time => {
                        const app = appointments.find(a => a.appointment_date === selectedDate && a.appointment_time.startsWith(time));
                        return (
                            <div key={time} className={`card-premium p-8 flex items-center justify-between gap-8 group transition-all duration-300 ${app ? 'bg-white' : 'bg-gray-50/50 hover:bg-white opacity-80 hover:opacity-100'}`}>
                                <div className="flex items-center gap-10">
                                    <div className="text-3xl font-black text-gray-200 group-hover:text-black transition-colors w-24 tracking-tighter">{time}</div>
                                    {app ? (
                                        <div className="flex items-center gap-6">
                                            <div className="w-2 h-16 bg-black rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)]"></div>
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">סוג שירות</div>
                                                <div className="text-2xl font-black tracking-tight">{app.service_type}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-200 font-black uppercase tracking-[0.2em] text-xs">Available Slot</div>
                                    )}
                                </div>

                                {app && (
                                    <div className="flex items-center gap-4">
                                        <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${app.status === 'PENDING' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                                            {app.status}
                                        </span>
                                        {app.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleStatusUpdate(app.id, AppointmentStatus.APPROVED)}
                                                    className="p-4 bg-black text-white rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-xl"
                                                >
                                                    <Check size={22} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(app.id, AppointmentStatus.REJECTED)}
                                                    className="p-4 bg-white border-2 border-red-50 text-red-500 rounded-2xl hover:bg-red-50 transition-all"
                                                >
                                                    <X size={22} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-12 animate-fade-in-up pb-20 selection:bg-black selection:text-white">
            <div className="card-premium p-12 md:p-16 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-black"></div>

                <h2 className="text-5xl font-black tracking-tighter mb-12 flex items-center gap-8">
                    <div className="p-5 bg-black text-white rounded-3xl shadow-2xl">
                        <CalendarDays size={40} />
                    </div>
                    קביעת תור למוסך
                </h2>

                <div className="space-y-10 text-start">
                    <div className="group">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4 px-2">סוג הטיפול המבוקש</label>
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
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4 px-2">בחר תאריך מבוקש</label>
                        <input
                            type="date"
                            className="input-premium h-20 text-xl"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <div className="group">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6 px-2">בחר שעה פנויה</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {WORKING_HOURS.map(time => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`h-16 rounded-[1.2rem] font-black text-base transition-all duration-300 border-2 ${selectedTime === time ? 'bg-black text-white border-black shadow-2xl scale-105' : 'bg-gray-50 border-transparent text-gray-400 hover:border-gray-200 hover:text-black'}`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleBook}
                        disabled={loading || !selectedService || !selectedTime}
                        className="btn-primary w-full h-24 text-2xl mt-12 shadow-2xl tracking-tight group"
                    >
                        {loading ? (
                            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="group-hover:scale-110 transition-transform flex items-center justify-center gap-4">
                                שריין מקום עכשיו <CheckCircle2 size={32} />
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="text-center">
                <p className="text-gray-400 font-bold text-sm italic">
                    * קביעת התור מותנית באישור סופי של מנהל המוסך
                </p>
            </div>
        </div>
    );
};

export default AppointmentsView;