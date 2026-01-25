import React, { useState } from 'react';
import { X, CheckCircle2, Car, User, Calendar, Palette, Download, Loader, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatLicensePlate, cleanLicensePlate } from '../utils/formatters';
import { fetchVehicleDataFromGov, isValidIsraeliPlate } from '../utils/vehicleApi';

interface AddVehicleModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ onClose, onSuccess }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingApi, setLoadingApi] = useState(false);
    const [plate, setPlate] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [color, setColor] = useState('');
    const [vin, setVin] = useState('');
    const [fuelType, setFuelType] = useState('');
    const [engineModel, setEngineModel] = useState('');
    const [registrationValidUntil, setRegistrationValidUntil] = useState('');
    const [ownerPhone, setOwnerPhone] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [kodanit, setKodanit] = useState('');
    const [error, setError] = useState('');
    const [apiSuccess, setApiSuccess] = useState(false);
    const [showMoreDetails, setShowMoreDetails] = useState(false);

    const handleAutoFill = async () => {
        const cleanedPlate = cleanLicensePlate(plate);
        if (!cleanedPlate || !isValidIsraeliPlate(cleanedPlate)) {
            setError('אנא הזן מספר רישוי תקין');
            return;
        }

        setLoadingApi(true);
        setError('');
        setApiSuccess(false);

        try {
            const data = await fetchVehicleDataFromGov(cleanedPlate);
            if (!data) {
                setError('לא נמצאו נתונים למספר רישוי זה. אנא הזן את הפרטים ידנית.');
                return;
            }

            setModel(data.model || model);
            setYear(data.year || year);
            setColor(data.color || color);
            setVin(data.vin || vin);
            setFuelType(data.fuelType || fuelType);
            setEngineModel(data.engineModel || engineModel);
            setRegistrationValidUntil(data.registrationValidUntil || registrationValidUntil);
            setApiSuccess(true);
            setTimeout(() => setApiSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'שגיאה בטעינת נתוני הרכב');
        } finally {
            setLoadingApi(false);
        }
    };

    const handlePhoneSearch = async () => {
        if (!ownerPhone.trim()) return;
        setLoading(true);
        setError('');
        try {
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('phone', ownerPhone)
                .maybeSingle();

            if (profiles) {
                setOwnerName(profiles.full_name);
                const { data: vehicle } = await supabase
                    .from('vehicles')
                    .select('plate, model, year, kodanit')
                    .eq('owner_id', profiles.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (vehicle) {
                    setPlate(formatLicensePlate(vehicle.plate));
                    setModel(vehicle.model);
                    setYear(vehicle.year || '');
                    setKodanit(vehicle.kodanit || '');
                }
            } else {
                setError('לא נמצא לקוח עם מספר טלפון זה');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!profile?.org_id) throw new Error('No organization ID found');
            const cleanedPlate = cleanLicensePlate(plate);
            if (cleanedPlate.length < 7) throw new Error('מספר רישוי לא תקין');

            // Pre-check for duplicate vehicle
            const { data: existingVehicle } = await supabase
                .from('vehicles')
                .select('id')
                .eq('plate', cleanedPlate)
                .eq('org_id', profile.org_id)
                .maybeSingle();

            if (existingVehicle) {
                throw new Error('הרכב כבר קיים במערכת');
            }

            let ownerId = null;
            if (ownerPhone) {
                const { data: user } = await supabase.from('profiles').select('id').eq('phone', ownerPhone).maybeSingle();
                ownerId = user?.id;
            }

            const { error: insertError } = await supabase.from('vehicles').insert({
                org_id: profile.org_id,
                plate: cleanedPlate,
                model,
                year,
                color,
                vin,
                fuel_type: fuelType,
                engine_model: engineModel,
                registration_valid_until: registrationValidUntil || null,
                kodanit,
                owner_id: ownerId,
                owner_name: ownerName
            });

            if (insertError) {
                // Fallback for race conditions
                if (insertError.code === '23505' || insertError.message.includes('unique constraint') || insertError.message.includes('unique_violation')) {
                    throw new Error('הרכב כבר קיים במערכת');
                }
                throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'שגיאה בהוספת הרכב');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[90dvh] overflow-hidden border-t-[8px] sm:border-t-[12px] border-blue-600">
                {/* Header */}
                <div className="flex-none p-6 pb-2 flex items-center justify-between border-b border-gray-50">
                    <div className="text-start">
                        <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center mb-1 text-blue-600"><Car size={20} /></div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">הוספת רכב חדש</h2>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest leading-none">הוספת רכב למאגר המוסך</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-black hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <form id="add-vehicle-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-start">מספר טלפון</label>
                                <input type="tel" className="input-premium h-14" placeholder="050-0000000" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} onBlur={handlePhoneSearch} />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-start">שם לקוח</label>
                                <input type="text" className="input-premium h-14" placeholder="ישראל ישראלי" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-start">מספר רישוי</label>
                            <div className="relative">
                                <input type="text" required className="input-premium font-mono tracking-widest text-center text-xl h-14 w-full pr-14" placeholder="12-345-67" dir="ltr" value={plate} onChange={e => setPlate(formatLicensePlate(e.target.value))} />
                                <button
                                    type="button"
                                    onClick={handleAutoFill}
                                    disabled={loadingApi}
                                    className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                                    title="Magic Fetch from DataGov"
                                >
                                    {loadingApi ? <Loader size={16} className="animate-spin" /> : apiSuccess ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Primary Display */}
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                            <div className="text-start">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">יצרן, דגם, שנה</div>
                                <div className="text-lg sm:text-xl font-black text-black tracking-tight uppercase">
                                    {model || '---'} {year ? `(${year})` : ''}
                                </div>
                            </div>
                            <CheckCircle2 className={model ? 'text-green-500' : 'text-gray-200'} size={32} />
                        </div>

                        {/* More Details Tab */}
                        <button type="button" onClick={() => setShowMoreDetails(!showMoreDetails)} className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
                            <span className="font-black text-xs text-gray-700">פרטים מזהים נוספים (שלדה, מנוע, קודנית)</span>
                            <ChevronDown className={`transition-transform duration-300 ${showMoreDetails ? 'rotate-180' : ''}`} size={20} />
                        </button>

                        {showMoreDetails && (
                            <div className="space-y-4 animate-fade-in-up bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200 text-start">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">קודנית</label>
                                        <input type="text" className="input-premium h-12 font-mono tracking-widest text-start bg-white border-gray-100 uppercase" placeholder="1234" value={kodanit} onChange={e => setKodanit(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">דגם מנוע</label>
                                        <input type="text" className="input-premium h-12 bg-white border-gray-100 uppercase font-mono text-sm" placeholder="G4FC" value={engineModel} onChange={e => setEngineModel(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">צבע</label>
                                        <input type="text" className="input-premium h-12 bg-white border-gray-100" placeholder="לבן" value={color} onChange={e => setColor(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">תוקף טסט</label>
                                        <input type="text" className="input-premium h-12 bg-white border-gray-100 text-left font-mono text-sm" placeholder="YYYY-MM-DD" value={registrationValidUntil} onChange={e => setRegistrationValidUntil(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">מספר שלדה</label>
                                        <input type="text" className="input-premium h-12 font-mono text-xs bg-white border-gray-100 uppercase" placeholder="VMF1..." value={vin} onChange={e => setVin(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">סוג דלק</label>
                                        <input type="text" className="input-premium h-12 bg-white border-gray-100" placeholder="בנזין" value={fuelType} onChange={e => setFuelType(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[11px] font-black text-center border border-red-100 animate-shake">
                                {error}
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-gray-50/50 border-t border-gray-100 mb-safe">
                    <button
                        type="submit"
                        form="add-vehicle-form"
                        disabled={loading}
                        className="btn-primary w-full h-16 sm:h-20 flex items-center justify-center gap-4 text-lg sm:text-xl shadow-xl active:scale-95 transition-all touch-target"
                    >
                        {loading ? <Loader className="animate-spin" /> : <><CheckCircle2 size={24} /> <span>שמור רכב במערכת</span></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddVehicleModal;
