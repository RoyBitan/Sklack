import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppointmentStatus, UserRole, Task, TaskStatus } from '../types';
import { CalendarDays, Clock, Check, X, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2, Plus, Edit2, Trash2, Database, MessageSquare, Info, User, Phone } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import { formatLicensePlate, cleanLicensePlate } from '../utils/formatters';
import { fetchVehicleDataFromGov, isValidIsraeliPlate } from '../utils/vehicleApi';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';

const AppointmentsView: React.FC = () => {
    const { t } = useApp();
    const { appointments, refreshData } = useData();
    const { profile } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split?.('T')?.[0] || new Date().toISOString().substring(0, 10));
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingApi, setLoadingApi] = useState(false);
    const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null);
    const [showReminderOptions, setShowReminderOptions] = useState<Task | null>(null);
    const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });

    const { tasks, approveTask, updateTask, updateTaskStatus, sendSystemNotification } = useData();
    const { setSelectedRequestId } = useApp();
    const navigate = useNavigate();

    const serviceLabels: Record<string, string> = {
        'ROUTINE_SERVICE': 'טיפול תקופתי',
        'DIAGNOSTICS': 'אבחון ותקלה',
        'BRAKES': 'ברקסים',
        'ENGINE': 'מנוע וגיר',
        'AIR_CONDITIONING': 'מיזוג אוויר',
        'ELECTRICAL': 'חשמל ודיאגנוסטיקה',
        'TIRES': 'צמיגים וכיוון פרונט',
        'OTHER': 'אחר'
    };

    const pendingRequests = useMemo(() => tasks.filter(t => t.status === TaskStatus.WAITING_FOR_APPROVAL), [tasks]);

    const isManager = profile?.role === UserRole.SUPER_MANAGER || profile?.role === UserRole.STAFF;

    const WORKING_HOURS = useMemo(() => {
        const slots = [];
        let current = 7; // Start at 07:00
        while (current <= 18) { // End at 18:00
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

    const [editingId, setEditingId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [bookingData, setBookingData] = useState({
        customerName: '',
        phone: '',
        vehiclePlate: '',
        serviceType: '',
        duration: '1 שעה',
        make: ''
    });

    const handleAutoFill = async () => {
        const cleanedPlate = cleanLicensePlate(bookingData.vehiclePlate);

        if (!cleanedPlate || !isValidIsraeliPlate(cleanedPlate)) {
            alert('אנא הזן מספר רישוי תקין');
            return;
        }

        setLoadingApi(true);

        try {
            const data = await fetchVehicleDataFromGov(cleanedPlate);

            if (!data) {
                alert('לא נמצאו נתונים למספר רישוי זה');
                return;
            }

            setBookingData({
                ...bookingData,
                make: `${data.make} ${data.model}`.trim() || bookingData.make
            });

        } catch (err: any) {
            console.error('Gov API error:', err);
            alert(err.message || 'שגיאה בטעינת נתוני הרכב');
        } finally {
            setLoadingApi(false);
        }
    };

    const handlePrevDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('האם אתה בתוח שברצונך למחוק תור זה?')) return;
        try {
            const { error } = await supabase.from('appointments').delete().eq('id', id);
            if (error) throw error;
            await refreshData();
        } catch (err) {
            console.error('Failed to delete appointment:', err);
            toast.error('שגיאה במחיקת התור');
        }
    };

    const handleEdit = (appointment: any) => {
        setEditingId(appointment.id);
        setSelectedTime(appointment.appointment_time.substring(0, 5));
        setSelectedDate(appointment.appointment_date);
        setBookingData({
            customerName: appointment.customer?.full_name || '',
            vehiclePlate: appointment.vehicle?.plate || '',
            phone: appointment.customer?.phone || '',
            serviceType: appointment.service_type || '', // Using serviceType as description
            duration: appointment.duration || '1 שעה', // Assuming duration exists or default
            make: appointment.vehicle?.model || ''
        });
        setSelectedService(appointment.description || appointment.service_type);
        setShowModal(true);
        setTimeout(() => {
            document.getElementById('booking-modal')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSlotClick = (time: string) => {
        setSelectedTime(time);
        setEditingId(null); // New booking
        setBookingData({
            customerName: '',
            phone: '',
            vehiclePlate: '',
            serviceType: '',
            duration: '1 שעה',
            make: ''
        });
        setSelectedService('');
        setShowModal(true);
        setTimeout(() => {
            document.getElementById('booking-modal')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleManagerBook = async () => {
        setLoading(true);
        try {
            // Upsert logic if editing, Insert if new
            const payload: any = {
                org_id: profile?.org_id,
                // customer_id: ... needs real linking, skipping for now as per prev comment
                service_type: bookingData.serviceType || selectedService, // Use description as service type for now or generic
                description: selectedService,
                appointment_date: selectedDate,
                appointment_time: selectedTime,
                status: 'PENDING',
                // custom fields if supported by DB or metadata
            };

            if (editingId) {
                const { error } = await supabase.from('appointments').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('appointments').insert(payload);
                if (error) throw error;
            }

            await refreshData();
            setShowModal(false);
            setEditingId(null);
        } catch (err) {
            console.error('Booking failed:', err);
            toast.error('שגיאה בשמירת התור');
        } finally {
            setLoading(false);
        }
    };

    if (isManager) {
        return (
            <div className="space-y-12 animate-fade-in-up selection:bg-black selection:text-white">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b-4 border-black pb-10">
                    <h2 className="text-5xl font-black tracking-tighter">יומן תורים</h2>
                    <div className="flex bg-white p-2 rounded-[1.5rem] shadow-xl border border-gray-100 items-center gap-4">
                        <button onClick={handlePrevDay} className="p-4 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
                        <input
                            type="date"
                            className="input-premium py-3 px-8 w-auto h-14 border-0 bg-transparent focus:bg-transparent"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <button onClick={handleNextDay} className="p-4 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
                    </div>
                </div>

                {/* Pending Requests Section */}
                {pendingRequests.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 px-4">
                            <AlertCircle className="text-purple-600" size={28} />
                            <h3 className="text-2xl font-black tracking-tight">בקשות ממתינות לאישור ({pendingRequests.length})</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingRequests.map(task => (
                                <div key={task.id} className="card-premium p-6 border-l-8 border-purple-500 relative group overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-lg leading-tight">{task.title}</h4>
                                                <div className="text-xs text-gray-500 font-bold mt-1">
                                                    {task.vehicle?.model} • {task.vehicle?.plate}
                                                </div>
                                            </div>
                                            <div className="bg-purple-100/80 text-purple-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase">חדש</div>
                                        </div>

                                        <div className="flex flex-col gap-2 text-sm">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <CalendarDays size={14} className="text-purple-500" />
                                                <span className="font-bold">{(task.metadata as any)?.appointmentDate || 'לא נקבע'}</span>
                                                <span className="text-gray-300">|</span>
                                                <Clock size={14} className="text-purple-500" />
                                                <span className="font-bold">{(task.metadata as any)?.appointmentTime || '--:--'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => navigate(`/appointments/${task.id}`)}
                                                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                                            >
                                                <Info size={14} /> עוד פרטים
                                            </button>

                                            {task.status === TaskStatus.WAITING_FOR_APPROVAL && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setRescheduleData({
                                                                date: (task.metadata as any)?.appointmentDate || '',
                                                                time: (task.metadata as any)?.appointmentTime || ''
                                                            });
                                                            setReschedulingTask(task);
                                                        }}
                                                        className="bg-yellow-500 text-white p-2.5 rounded-xl hover:bg-yellow-600 transition-all shadow-lg active:scale-95"
                                                        title="שינוי תור"
                                                    >
                                                        <Database size={18} />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const today = new Date().toISOString().split('T')[0];
                                                            const taskDate = (task.metadata as any)?.appointmentDate;

                                                            if (taskDate === today) {
                                                                const sendNow = window.confirm('האם לשלוח את המשימה לצוות כעת?');
                                                                if (sendNow) {
                                                                    await approveTask(task.id, true);
                                                                } else {
                                                                    setShowReminderOptions(task);
                                                                }
                                                            } else {
                                                                await approveTask(task.id, false);
                                                                toast.success(`התור נקבע ל-${taskDate} בשעה ${(task.metadata as any)?.appointmentTime || ''}`);
                                                            }
                                                        }}
                                                        className="bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95"
                                                        title="אשר"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            await updateTaskStatus(task.id, TaskStatus.CANCELLED);
                                                            toast.success('הבקשה בוטלה');
                                                        }}
                                                        className="bg-red-500 text-white p-2.5 rounded-xl hover:bg-red-600 transition-all shadow-lg active:scale-95"
                                                        title="דחה"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {new Date(selectedDate).getDay() === 6 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                        <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200 shadow-inner">
                            <CalendarDays size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">המוסך סגור בשבת</h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">אנא בחר תאריך אחר לקביעת תור</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {WORKING_HOURS.map(time => {
                            const app = appointments.find(a => a.appointment_date === selectedDate && a.appointment_time.startsWith(time));
                            return (
                                <button
                                    key={time}
                                    onClick={() => !app && handleSlotClick(time)}
                                    disabled={!!app}
                                    className={`w-full text-start card-premium p-4 md:p-6 flex items-center justify-between gap-4 group transition-all duration-300 ${app ? 'bg-white cursor-default' : 'bg-gray-50/50 hover:bg-white hover:scale-[1.01] hover:shadow-lg cursor-pointer'}`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`text-xl font-black w-16 tracking-tighter ${app ? 'text-black' : 'text-gray-900/40 group-hover:text-black'}`}>{time}</div>
                                        {app ? (
                                            <div className="flex items-center gap-4">
                                                <div className="w-1.5 h-12 bg-black rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)]"></div>
                                                <div>
                                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">{app.service_type || 'טיפול כללי'}</div>
                                                    <div className="text-lg font-black tracking-tight">{app.description}</div>
                                                    {/* @ts-ignore */}
                                                    <div className="text-[10px] font-bold text-gray-500 mt-0.5">{app.customer?.full_name || 'לקוח'} • {app.vehicle?.plate || ''}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 text-gray-300 font-black uppercase tracking-[0.2em] text-[10px] group-hover:text-black/50 transition-colors">
                                                <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <span>לחץ לשיריון תור</span>
                                            </div>
                                        )}
                                    </div>

                                    {app && (
                                        <div className="flex items-center gap-2">
                                            <div
                                                onClick={(e) => { e.stopPropagation(); handleEdit(app); }}
                                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-black transition-colors cursor-pointer"
                                            >
                                                <Edit2 size={16} />
                                            </div>
                                            <div
                                                onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                                                className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Booking Modal */}
                {showModal && (
                    <div id="booking-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-2 sm:p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white w-[95%] max-w-lg rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="p-6 pb-2 flex items-center justify-between border-b border-gray-50">
                                <div className="text-start">
                                    <h2 className="text-2xl font-black tracking-tight">{editingId ? 'עריכת תור' : 'זימון תור חדש'}</h2>
                                    <div className="text-gray-400 font-bold bg-gray-50 inline-block px-3 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-gray-100 mt-1">
                                        {selectedDate} • {selectedTime}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 text-start">מספר טלפון</label>
                                        <input
                                            type="tel"
                                            className="input-premium h-14"
                                            placeholder="050-0000000"
                                            value={bookingData.phone || ''}
                                            onChange={e => setBookingData({ ...bookingData, phone: e.target.value })}
                                            onBlur={async () => {
                                                const phone = bookingData.phone;
                                                if (!phone) return;
                                                const { data } = await supabase.from('profiles').select('full_name').eq('phone', phone).maybeSingle();
                                                if (data) setBookingData({ ...bookingData, customerName: data.full_name });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 text-start">שם לקוח</label>
                                        <input type="text" className="input-premium h-14" placeholder="ישראל ישראלי" value={bookingData.customerName} onChange={e => setBookingData({ ...bookingData, customerName: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 text-start">מספר רכב</label>
                                        <div className="flex gap-2">
                                            <input type="text" className="input-premium w-full h-14 text-center tracking-widest font-mono" placeholder="12-345-67" value={bookingData.vehiclePlate} onChange={e => setBookingData({ ...bookingData, vehiclePlate: formatLicensePlate(e.target.value) })} />
                                            <button
                                                type="button"
                                                onClick={handleAutoFill}
                                                disabled={loadingApi}
                                                className="bg-black text-white px-4 rounded-xl font-bold text-[10px] hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center justify-center shrink-0"
                                                title="משוך נתונים"
                                            >
                                                {loadingApi ? <Loader size={16} className="animate-spin" /> : <Database size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 text-start">יצרן ודגם</label>
                                        <input type="text" className="input-premium h-14" placeholder="מאזדה" value={bookingData.make} onChange={e => setBookingData({ ...bookingData, make: e.target.value })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 text-start">זמן משוער</label>
                                    <select className="input-premium h-14 text-sm" value={bookingData.duration} onChange={e => setBookingData({ ...bookingData, duration: e.target.value })}>
                                        <option value="חצי שעה">חצי שעה</option>
                                        <option value="שעה">שעה</option>
                                        <option value="שעתיים">שעתיים</option>
                                        <option value="4 שעות">4 שעות</option>
                                        <option value="יום שלם">יום שלם</option>
                                        <option value="אחר">אחר</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 text-start">מהות הטיפול</label>
                                    <textarea className="input-premium min-h-[120px] resize-none p-4 text-start" placeholder="פרט את מהות הטיפול..." value={selectedService} onChange={e => setSelectedService(e.target.value)}></textarea>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                                <button onClick={handleManagerBook} className="btn-primary w-full h-16 text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3">
                                    {editingId ? <><Edit2 size={20} /> עדכן תור</> : <><Plus size={20} /> שריין תור</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}




                {/* Reminder Options Modal */}
                {
                    showReminderOptions && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
                                <h3 className="text-xl font-black mb-6">מתי תרצה תזכורת?</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { label: 'בעוד 30 דקות', mins: 30 },
                                        { label: 'בעוד שעה', mins: 60 },
                                        { label: 'בעוד שעתיים', mins: 120 },
                                    ].map(opt => (
                                        <button
                                            key={opt.mins}
                                            onClick={async () => {
                                                const reminderDate = new Date();
                                                reminderDate.setMinutes(reminderDate.getMinutes() + opt.mins);
                                                await approveTask(showReminderOptions.id, false, reminderDate.toISOString());
                                                setShowReminderOptions(null);
                                            }}
                                            className="bg-gray-50 p-4 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={async () => {
                                            const time = window.prompt('הזן שעה לתזכורת (HH:mm):', '12:00');
                                            if (time) {
                                                const [h, m] = time.split(':');
                                                const reminderDate = new Date();
                                                reminderDate.setHours(parseInt(h), parseInt(m), 0, 0);
                                                await approveTask(showReminderOptions.id, false, reminderDate.toISOString());
                                            }
                                            setShowReminderOptions(null);
                                        }}
                                        className="bg-blue-50 text-blue-600 p-4 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        זמן מותאם אישית
                                    </button>
                                    <button onClick={() => setShowReminderOptions(null)} className="mt-4 text-gray-400 font-bold">ביטול</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Reschedule Modal */}
                {
                    reschedulingTask && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
                                <h3 className="text-xl font-black mb-6 text-center">הצע מועד חדש</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">תאריך</label>
                                        <input
                                            type="date"
                                            className="input-premium h-14"
                                            value={rescheduleData.date}
                                            onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">שעה</label>
                                        <input
                                            type="time"
                                            className="input-premium h-14"
                                            value={rescheduleData.time}
                                            onChange={e => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button
                                            onClick={async () => {
                                                if (!rescheduleData.date || !rescheduleData.time) return;
                                                await updateTask(reschedulingTask.id, {
                                                    metadata: {
                                                        ...reschedulingTask.metadata,
                                                        appointmentDate: rescheduleData.date,
                                                        appointmentTime: rescheduleData.time
                                                    }
                                                });
                                                if (reschedulingTask.customer_id) {
                                                    await sendSystemNotification(
                                                        reschedulingTask.customer_id,
                                                        'הצעת מועד חדש לתור 📅',
                                                        `האדמין הציע מועד חדש לתור: ${rescheduleData.date} בשעה ${rescheduleData.time}`,
                                                        'APPOINTMENT_RESCHEDULED',
                                                        reschedulingTask.id
                                                    );
                                                }
                                                setReschedulingTask(null);
                                                toast.success('המועד עודכן והודעה נשלחה ללקוח.');
                                            }}
                                            className="flex-1 btn-primary py-4 rounded-xl font-black shadow-lg"
                                        >
                                            עדכן תור
                                        </button>
                                        <button
                                            onClick={() => setReschedulingTask(null)}
                                            className="bg-gray-100 text-gray-600 px-6 py-4 rounded-xl font-black hover:bg-gray-200 transition-all"
                                        >
                                            ביטול
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
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