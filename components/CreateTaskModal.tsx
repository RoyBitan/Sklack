import React, { useState } from 'react';
import { X, Save, Car, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Priority, TaskStatus } from '../types';

interface CreateTaskModalProps {
    onClose: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose }) => {
    const { profile } = useAuth();
    const { refreshData } = useData();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [phone, setPhone] = useState(''); // New State
    const [plate, setPlate] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [color, setColor] = useState('');
    const [immobilizer, setImmobilizer] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.NORMAL);
    const [foundVehicles, setFoundVehicles] = useState<any[]>([]); // New State
    const [showVehicleSelect, setShowVehicleSelect] = useState(false); // New State

    const handlePlateBlur = async () => {
        if (!plate || !profile?.org_id) return;

        try {
            const { data: existing } = await supabase
                .from('vehicles')
                .select('*')
                .eq('plate', plate)
                .eq('org_id', profile.org_id)
                .maybeSingle();

            if (existing) {
                setModel(existing.model);
                setYear(existing.year || '');
                setColor(existing.color || '');
                setImmobilizer(existing.immobilizer_code || '');
            }
        } catch (e) {
            console.error('Vehicle lookup failed', e);
        }
    };

    const handlePhoneBlur = async () => {
        if (!phone) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_vehicles_by_phone', { phone_text: phone });
            if (error) throw error;

            if (data && data.length > 0) {
                setFoundVehicles(data);
                setShowVehicleSelect(true);
            } else {
                setFoundVehicles([]);
            }
        } catch (e) {
            console.error('Magic fetch failed', e);
        } finally {
            setLoading(false);
        }
    };

    const selectVehicle = (v: any) => {
        setPlate(v.plate);
        setModel(v.model);
        setYear(v.year || '');
        setColor(v.color || '');
        setShowVehicleSelect(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.org_id) return;

        setLoading(true);
        setError('');

        try {
            // 1. Create or Find Vehicle
            let vehicleId = null;
            if (plate) {
                // Check if exists
                const { data: existingVehicle } = await supabase
                    .from('vehicles')
                    .select('id')
                    .eq('plate', plate)
                    .eq('org_id', profile.org_id)
                    .maybeSingle();

                if (existingVehicle) {
                    vehicleId = existingVehicle.id;
                } else {
                    // Create new
                    const { data: newVehicle, error: vError } = await supabase
                        .from('vehicles')
                        .insert({
                            org_id: profile.org_id,
                            plate,
                            model: model || 'Unknown',
                            year: year || null,
                            color: color || null,
                        })
                        .select()
                        .single();

                    if (vError) throw vError;
                    vehicleId = newVehicle.id;
                }
            }

            // 2. Create Task
            const { error: tError } = await supabase
                .from('tasks')
                .insert({
                    org_id: profile.org_id,
                    created_by: profile.id,
                    title,
                    description,
                    priority,
                    status: TaskStatus.WAITING,
                    vehicle_id: vehicleId,
                    vehicle_year: year,
                    immobilizer_code: immobilizer,
                    assigned_to: [] // Can handle assignment later
                });

            if (tError) throw tError;

            await refreshData();
            onClose();

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'שגיאה ביצירת המשימה');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/40 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]">

                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter">משימה חדשה</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">פתיחת כרטיס עבודה לרכב</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 bg-gray-50 rounded-[1.5rem] hover:bg-black hover:text-white transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                    <form id="create-task-form" onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">כותרת הטיפול</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="input-premium"
                                placeholder="לדוגמה: טיפול 10,000 + החלפת ברקסים"
                            />
                        </div>

                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 relative">
                            {/* Phone Lookup */}
                            <div className="mb-6">
                                <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">איתור לפי נייד לקוח (Magic Fetch)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        onBlur={handlePhoneBlur}
                                        className="input-premium bg-white"
                                        placeholder="050-0000000"
                                    />
                                </div>
                                {/* Dropdown for multiple vehicles */}
                                {showVehicleSelect && foundVehicles.length > 0 && (
                                    <div className="absolute top-24 left-0 w-full z-20 px-6">
                                        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-2 space-y-2">
                                            <div className="text-[10px] font-bold text-gray-400 px-3 py-1">נמצאו {foundVehicles.length} רכבים. בחר רכב:</div>
                                            {foundVehicles.map(v => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => selectVehicle(v)}
                                                    className="w-full text-right p-3 hover:bg-gray-50 rounded-xl flex items-center justify-between group"
                                                >
                                                    <div>
                                                        <div className="font-black text-gray-900">{v.plate}</div>
                                                        <div className="text-xs text-gray-500">{v.model}</div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 text-blue-600 text-xs font-bold">בחר</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 mb-6">
                                <Car size={24} className="text-gray-400" />
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">פרטי רכב (אופציונלי)</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">מספר רישוי</label>
                                    <input
                                        type="text"
                                        value={plate}
                                        onChange={e => setPlate(e.target.value)}
                                        onBlur={handlePlateBlur}
                                        className="input-premium font-mono tracking-widest text-center bg-white"
                                        placeholder="12-345-67"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">דגם הרכב</label>
                                    <input
                                        type="text"
                                        value={model}
                                        onChange={e => setModel(e.target.value)}
                                        className="input-premium bg-white"
                                        placeholder="מאזדה 3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">צבע הרכב</label>
                                    <input
                                        type="text"
                                        value={color}
                                        onChange={e => setColor(e.target.value)}
                                        className="input-premium bg-white"
                                        placeholder="לבן פנינה"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">שנתון רכב</label>
                                    <input
                                        type="text"
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        className="input-premium bg-white"
                                        placeholder="2024"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">קודנית</label>
                                    <input
                                        type="text"
                                        value={immobilizer}
                                        onChange={e => setImmobilizer(e.target.value)}
                                        className="input-premium bg-white font-mono tracking-widest text-center"
                                        placeholder="1234"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">תיאור והערות</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="input-premium h-32 py-4 resize-none"
                                placeholder="פרט כאן את הבעיות שדווחו על ידי הלקוח..."
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">דחיפות</label>
                            <div className="flex bg-gray-100 p-2 rounded-[1.5rem] gap-2">
                                {Object.values(Priority).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${priority === p
                                            ? (p === Priority.CRITICAL ? 'bg-red-500 text-white shadow-lg' : p === Priority.URGENT ? 'bg-orange-500 text-white shadow-lg' : 'bg-black text-white shadow-lg')
                                            : 'text-gray-400 hover:text-black'
                                            }`}
                                    >
                                        {p === Priority.NORMAL ? 'רגיל' : p === Priority.URGENT ? 'דחוף' : 'קריטי'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-6 rounded-[1.5rem] flex items-center gap-4 border border-red-100 animate-shake">
                                <AlertCircle size={24} />
                                <p className="text-sm font-black">{error}</p>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                    <button
                        form="create-task-form"
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save size={20} />
                                <span className="font-black text-lg">פתח כרטיס עבודה</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTaskModal;
