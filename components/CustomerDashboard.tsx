import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { ProposalStatus, TaskStatus, UserRole, PreCheckInData, Vehicle } from '../types';
import {
    Check, X, CreditCard, Phone, AlertCircle, Camera, Mic, PlusCircle,
    Upload, FileText, Shield, UserCircle2, DollarSign, Square, Car,
    MapPin, Calendar, Clock, Sparkles, CheckCircle2, ArrowRight, Trash2, Plus,
    ChevronRight, Settings, Star, Search, Filter
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const CustomerDashboard: React.FC = () => {
    const { user, t, navigateTo } = useApp();
    const {
        tasks, vehicles, loading, updateTaskStatus, updateProposal,
        addProposal, updateUser, submitCheckIn, addVehicle, removeVehicle
    } = useData();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showRequestForm, setShowRequestForm] = useState<string | null>(null);
    const [requestText, setRequestText] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [hasAudio, setHasAudio] = useState(false);

    // Vehicle Modal State
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [newVehicle, setNewVehicle] = useState<Omit<Vehicle, 'addedAt'>>({
        plate: '',
        model: '',
        year: '',
        color: ''
    });

    // Pre-CheckIn Form State
    const [showCheckIn, setShowCheckIn] = useState<Vehicle | null>(null);
    const [checkInForm, setCheckInForm] = useState<Partial<PreCheckInData>>({
        fullName: user?.full_name || '',
        phone: user?.phone || '',
        mileage: '',
        carCode: '',
        address: '',
        faultDescription: '',
        preferredPayment: 'creditCard'
    });

    if (loading || !user) {
        return <LoadingSpinner message="טוען לוח בקרה..." />;
    }

    // RLS ensures 'tasks' only contains records relevant to this customer (own tasks or vehicle tasks)
    const myTasks = tasks;
    const myVehicles = user?.vehicles || [];

    const handlePay = (taskId: string) => {
        setProcessingId(taskId);
        setTimeout(() => {
            setProcessingId(null);
            updateTaskStatus(taskId, TaskStatus.COMPLETED);
            alert(t('paymentSuccessful'));
        }, 1500);
    };

    const handleProposalResponse = (taskId: string, proposalId: string, accepted: boolean) => {
        updateProposal(taskId, proposalId, { status: accepted ? ProposalStatus.APPROVED : ProposalStatus.REJECTED });
    };

    const submitCustomerRequest = (taskId: string) => {
        if (!requestText) return;
        // Removed 'status' from the proposal object as it's omitted in the type definition 
        // and handled internally by addProposal in AppContext.
        addProposal(taskId, {
            taskId,
            createdBy: user!.id,
            creatorRole: UserRole.CUSTOMER,
            description: requestText,
            photoData: capturedImage || undefined,
            audioData: hasAudio ? 'mock_audio_data' : undefined,
        });
        setShowRequestForm(null);
        setRequestText('');
        setCapturedImage(null);
        setHasAudio(false);
    };

    const handleDocUpload = (type: 'carLicense' | 'insurance' | 'idCard') => {
        const mockData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        updateUser(user!.id, {
            documents: {
                ...(user?.documents || {}),
                [type]: mockData
            }
        });
        alert(t('upload') + " " + t(type === 'carLicense' ? 'carLicense' : type === 'insurance' ? 'insuranceDoc' : 'idCardDoc') + " בהצלחה!");
    };

    const handleAddVehicleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVehicle.plate || !newVehicle.model) return;
        addVehicle(newVehicle);
        setShowAddVehicle(false);
        setNewVehicle({ plate: '', model: '', year: '', color: '' });
    };

    const handleCheckInSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!showCheckIn) return;

        const fullData: PreCheckInData = {
            ...(checkInForm as any),
            vehiclePlate: showCheckIn.plate,
            vehicleModel: showCheckIn.model,
            vehicleYear: showCheckIn.year || '',
            vehicleColor: showCheckIn.color || '',
            submittedAt: Date.now(),
            hasInsurance: true
        };

        submitCheckIn(fullData);
        setShowCheckIn(null);
        alert(t('checkInSuccess'));
    };

    return (
        <div className="pb-24 space-y-8 animate-fade-in">
            {/* Personalized Header */}
            <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-start">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">שלום, {user?.full_name?.split?.(' ')?.[0] || 'לקוח'}</h1>
                        <p className="text-gray-400 font-bold max-w-sm leading-relaxed text-base md:text-lg">כאן תוכל לנהל את רכביך, לעקוב אחר טיפולים ולבצע צ'ק-אין מהיר.</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-xl">
                        <Shield className="text-blue-400" size={28} />
                        <div className="text-start">
                            <div className="text-[10px] font-black uppercase text-blue-300 tracking-widest mb-0.5">מוסך פעיל</div>
                            <div className="font-black text-lg">מחובר ומאובטח</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MY VEHICLES SECTION - Prominent multiple car support */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="font-black text-2xl text-gray-900 tracking-tight flex items-center gap-3">
                        <Car size={26} className="text-blue-600" />
                        רכבים שלי ({myVehicles.length})
                    </h3>
                    <button
                        onClick={() => setShowAddVehicle(true)}
                        className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={18} /> הוסף רכב נוסף
                    </button>
                </div>

                {myVehicles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myVehicles.map(v => (
                            <div key={v.plate} className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="text-start">
                                        <div className="bg-yellow-400 border-2 border-black rounded-lg px-3 py-1.5 inline-block shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 group-hover:-translate-y-1 transition-transform">
                                            <span className="font-mono text-xs font-black tracking-widest text-black">{v.plate}</span>
                                        </div>
                                        <h4 className="font-black text-xl text-gray-900">{v.model}</h4>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{v.year} • {v.color}</p>
                                    </div>
                                    <button onClick={() => removeVehicle(v.plate)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                                <div className="flex gap-2 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => setShowCheckIn(v)}
                                        className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                    >
                                        <Sparkles size={16} /> צ'ק-אין מהיר
                                    </button>
                                    <button
                                        onClick={() => navigateTo('APPOINTMENTS')}
                                        className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        <Calendar size={16} /> הזמן תור
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center shadow-inner">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
                            <Car size={40} />
                        </div>
                        <p className="text-gray-500 font-black text-lg">טרם רשמת רכבים בחשבונך.</p>
                        <button
                            onClick={() => setShowAddVehicle(true)}
                            className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm mt-6 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <PlusCircle size={20} /> רשום רכב ראשון
                        </button>
                    </div>
                )}
            </section>

            {/* ADD VEHICLE MODAL */}
            {showAddVehicle && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-fade-in-up relative">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black flex items-center gap-3 text-gray-900">
                                <PlusCircle className="text-blue-600" size={28} />
                                רישום רכב חדש
                            </h2>
                            <button onClick={() => setShowAddVehicle(false)} className="text-gray-400 hover:text-black transition-colors"><X size={28} /></button>
                        </div>
                        <form onSubmit={handleAddVehicleSubmit} className="space-y-6">
                            <div className="group">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1 group-focus-within:text-black transition-colors">מספר רישוי</label>
                                <input required className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 font-mono text-xl tracking-widest text-center focus:bg-white focus:border-black outline-none transition-all shadow-sm" value={newVehicle.plate} onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value })} placeholder="00-000-00" />
                            </div>
                            <div className="group">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1 group-focus-within:text-black transition-colors">דגם רכב</label>
                                <input required className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 font-bold focus:bg-white focus:border-black outline-none transition-all shadow-sm" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} placeholder="למשל: טויוטה קורולה" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">שנת ייצור</label>
                                    <input className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 font-bold focus:bg-white focus:border-black outline-none transition-all" value={newVehicle.year} onChange={e => setNewVehicle({ ...newVehicle, year: e.target.value })} placeholder="2024" />
                                </div>
                                <div className="group">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block px-1">צבע</label>
                                    <input className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 font-bold focus:bg-white focus:border-black outline-none transition-all" value={newVehicle.color} onChange={e => setNewVehicle({ ...newVehicle, color: e.target.value })} placeholder="לבן" />
                                </div>
                            </div>
                            <button type="submit" className="w-full h-18 bg-black text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-gray-900 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-3">
                                <Plus size={24} /> הוסף רכב למוסך שלי
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CHECK-IN FORM MODAL */}
            {showCheckIn && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 border-[3px] border-blue-600 shadow-2xl animate-fade-in-up space-y-10 my-8 text-start">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-black flex items-center gap-3 text-gray-900">
                                    <FileText className="text-blue-600" size={32} />
                                    צ'ק-אין עבור {showCheckIn.model}
                                </h2>
                                <p className="text-gray-400 font-bold text-sm mt-1 uppercase tracking-widest">מספר רישוי: {showCheckIn.plate}</p>
                            </div>
                            <button onClick={() => setShowCheckIn(null)} className="text-gray-400 hover:text-black transition-colors"><X size={32} /></button>
                        </div>

                        <form onSubmit={handleCheckInSubmit} className="space-y-8">
                            <div className="space-y-5">
                                <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] px-2">{t('personalDetails')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <input required className="w-full bg-gray-100 border-2 border-transparent rounded-2xl p-5 pl-14 text-sm font-black shadow-inner focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder={t('fullName')} value={checkInForm.fullName} onChange={e => setCheckInForm({ ...checkInForm, fullName: e.target.value })} />
                                        <UserCircle2 className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                                    </div>
                                    <div className="relative">
                                        <input required className="w-full bg-gray-100 border-2 border-transparent rounded-2xl p-5 pl-14 text-sm font-black shadow-inner focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder={t('phone')} value={checkInForm.phone} onChange={e => setCheckInForm({ ...checkInForm, phone: e.target.value })} />
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                                    </div>
                                </div>
                                <div className="relative">
                                    <input className="w-full bg-gray-100 border-2 border-transparent rounded-2xl p-5 pl-14 text-sm font-black shadow-inner focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder={t('address')} value={checkInForm.address} onChange={e => setCheckInForm({ ...checkInForm, address: e.target.value })} />
                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] px-2">נתוני נסיעה</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input required className="w-full bg-gray-100 border-2 border-transparent rounded-2xl p-5 text-sm font-black shadow-inner focus:bg-white focus:border-blue-600 outline-none" placeholder={t('mileage')} value={checkInForm.mileage} onChange={e => setCheckInForm({ ...checkInForm, mileage: e.target.value })} />
                                    <input required className="w-full bg-red-50 border-2 border-red-100 rounded-2xl p-5 text-sm font-black shadow-inner focus:bg-white focus:border-red-500 outline-none text-red-900" placeholder={t('carCode')} value={checkInForm.carCode} onChange={e => setCheckInForm({ ...checkInForm, carCode: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] px-2">מהות הביקור</h3>
                                <textarea required className="w-full bg-gray-100 border-2 border-transparent rounded-2xl p-6 text-sm font-bold shadow-inner h-28 focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder={t('faultDescription')} value={checkInForm.faultDescription} onChange={e => setCheckInForm({ ...checkInForm, faultDescription: e.target.value })} />

                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 mb-3 uppercase tracking-widest px-2">{t('preferredPayment')}</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { id: 'cash', label: t('cash') },
                                            { id: 'creditCard', label: t('creditCard') },
                                            { id: 'bit', label: t('bit') },
                                            { id: 'bankTransfer', label: t('bankTransfer') }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setCheckInForm({ ...checkInForm, preferredPayment: p.id })}
                                                className={`py-4 rounded-2xl text-[11px] font-black border-2 transition-all shadow-sm ${checkInForm.preferredPayment === p.id ? 'bg-black border-black text-white scale-[1.03]' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                                <CheckCircle2 size={28} />
                                שלח פרטים ותפוס תור בקבלה
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Documents Section */}
            <section className="bg-white rounded-[2.5rem] p-8 border-2 border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8 px-1">
                    <FileText className="text-blue-500" size={24} />
                    <h3 className="font-black text-2xl tracking-tight text-gray-900">{t('myDocuments')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { id: 'carLicense', label: t('carLicense'), icon: <Car size={22} /> },
                        { id: 'insurance', label: t('insuranceDoc'), icon: <Shield size={22} /> },
                        { id: 'idCard', label: t('idCardDoc'), icon: <UserCircle2 size={22} /> },
                    ].map(doc => (
                        <div key={doc.id} className="relative group overflow-hidden bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center text-center transition-all hover:border-black/10 hover:bg-white hover:shadow-md">
                            <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center transition-colors ${user?.documents?.[doc.id] ? 'bg-green-100 text-green-600 shadow-sm' : 'bg-white text-gray-300 shadow-sm'}`}>
                                {doc.icon}
                            </div>
                            <div className="text-sm font-black text-gray-800 mb-2">{doc.label}</div>
                            <button
                                onClick={() => handleDocUpload(doc.id as any)}
                                className={`text-[11px] font-black px-6 py-2.5 rounded-full transition-all ${user?.documents?.[doc.id] ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-800 shadow-md'}`}
                            >
                                {user?.documents?.[doc.id] ? 'הוחלף' : t('upload')}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tasks Section */}
            <section className="space-y-6">
                <h3 className="font-black text-2xl text-gray-900 px-4 tracking-tight">הטיפולים שלי</h3>
                {myTasks.length > 0 ? myTasks.map(task => {
                    const pendingProposals = task.proposals?.filter(p => p.status === ProposalStatus.PENDING_CUSTOMER) || [];

                    return (
                        <div key={task.id} className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 md:p-10 shadow-md space-y-8 transition-all hover:shadow-xl hover:border-gray-200 text-start">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                        <div className="bg-yellow-400 border-[3px] border-black rounded-xl px-4 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                            <span className="font-mono text-sm font-black tracking-widest text-black">{task.vehicle?.plate || '---'}</span>
                                        </div>
                                        <span className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                            {t(task.status === TaskStatus.IN_PROGRESS ? 'inProgress' : task.status.toLowerCase())}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-3xl text-gray-900 tracking-tighter">{task.title}</h4>
                                    <p className="text-gray-500 font-bold text-base mt-2 uppercase tracking-widest">{task.vehicle?.model}</p>
                                </div>
                                <button className="w-fit p-5 bg-gray-100 text-gray-700 rounded-2xl hover:bg-black hover:text-white transition-all shadow-md active:scale-95">
                                    <Phone size={28} />
                                </button>
                            </div>

                            {/* Proposal Alerts */}
                            {pendingProposals.length > 0 && (
                                <div className="bg-orange-50 border-[3px] border-orange-200 rounded-[2.5rem] p-8 space-y-6 animate-pulse-slow">
                                    <div className="flex items-center gap-3 text-orange-900 font-black text-lg uppercase tracking-widest">
                                        <AlertCircle size={28} className="text-orange-600" />
                                        דיווח מהשטח: דרוש אישור עבודה
                                    </div>

                                    {pendingProposals.map(p => (
                                        <div key={p.id} className="bg-white rounded-[2rem] p-8 border-2 border-orange-100 shadow-lg">
                                            <p className="text-gray-900 text-xl font-bold mb-6 leading-relaxed">{p.description}</p>
                                            <div className="flex justify-between items-center bg-orange-50 p-6 rounded-2xl mb-8 border-2 border-orange-100 shadow-inner">
                                                <span className="text-xs font-black text-orange-800 uppercase tracking-widest">עלות משוערת</span>
                                                <span className="font-black text-4xl text-gray-900">₪{p.price}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => handleProposalResponse(task.id, p.id, true)}
                                                    className="bg-green-700 text-white py-5 rounded-2xl font-black text-base shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Check size={20} /> {t('approve')} לביצוע
                                                </button>
                                                <button
                                                    onClick={() => handleProposalResponse(task.id, p.id, false)}
                                                    className="bg-white border-2 border-gray-200 text-gray-400 py-5 rounded-2xl font-black text-base hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <X size={20} /> {t('reject')}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Customer Request Section */}
                            {showRequestForm === task.id ? (
                                <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 md:p-10 space-y-8 animate-fade-in-up shadow-2xl">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-black text-base uppercase tracking-widest text-blue-400">בקשה חדשה לצוות</h4>
                                        <button onClick={() => setShowRequestForm(null)} className="text-gray-500 hover:text-white transition-colors"><X size={28} /></button>
                                    </div>
                                    <textarea
                                        className="w-full bg-white/10 border-none rounded-2xl p-6 text-lg font-bold placeholder:text-white/20 focus:ring-2 focus:ring-blue-500 outline-none h-32 transition-all shadow-inner"
                                        placeholder="מה תרצה שנוסיף לטיפול? (למשל: נורת מנוע דולקת...)"
                                        value={requestText}
                                        onChange={e => setRequestText(e.target.value)}
                                    />
                                    <div className="flex gap-4">
                                        <button onClick={() => setCapturedImage('mock')} className={`flex-1 p-6 rounded-2xl border-2 transition-all shadow-lg flex items-center justify-center gap-3 ${capturedImage ? 'bg-blue-600 border-blue-600' : 'border-white/10 hover:bg-white/20 text-white/60'}`}>
                                            <Camera size={26} />
                                            <span className="font-black text-xs uppercase tracking-widest">צרף תמונה</span>
                                        </button>
                                        <button onClick={() => setIsRecording(!isRecording)} className={`flex-1 p-6 rounded-2xl border-2 transition-all shadow-lg flex items-center justify-center gap-3 ${isRecording ? 'bg-red-600 border-red-600 animate-pulse' : hasAudio ? 'bg-green-600 border-green-600' : 'border-white/10 hover:bg-white/20 text-white/60'}`}>
                                            {isRecording ? <Square size={26} /> : <Mic size={26} />}
                                            <span className="font-black text-xs uppercase tracking-widest">הקלטת קול</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => submitCustomerRequest(task.id)}
                                        className="w-full bg-white text-black py-6 rounded-2xl font-black text-lg shadow-2xl hover:bg-gray-100 active:scale-[0.98] transition-all"
                                    >
                                        שלח עדכון למוסך
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowRequestForm(task.id)}
                                    className="w-full py-6 border-[3px] border-dashed border-gray-100 rounded-[2rem] text-gray-400 font-black text-base flex items-center justify-center gap-4 hover:border-black hover:text-black hover:bg-gray-50 transition-all shadow-inner active:scale-[0.99]"
                                >
                                    <PlusCircle size={24} />
                                    יש לי בקשה נוספת לטיפול
                                </button>
                            )}

                            {/* Payment Alert */}
                            {task.status === TaskStatus.CUSTOMER_APPROVAL && pendingProposals.length === 0 && (
                                <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white space-y-8 shadow-2xl animate-fade-in-up border-b-[8px] border-blue-900">
                                    <div className="flex items-center gap-5">
                                        <div className="bg-white/20 p-5 rounded-3xl shadow-inner">
                                            <CheckCircle2 size={40} strokeWidth={3} />
                                        </div>
                                        <div className="text-start">
                                            <h5 className="font-black text-xs uppercase tracking-widest text-blue-200 mb-1">העבודה הושלמה בהצלחה!</h5>
                                            <p className="font-black text-3xl">הרכב שלך מוכן ומחכה לך</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/10 p-8 rounded-2xl border border-white/10 shadow-inner">
                                        <span className="text-xs font-black text-blue-100 uppercase tracking-widest">סך הכל לתשלום</span>
                                        <span className="text-5xl font-black">₪{task.price || 450}</span>
                                    </div>
                                    <button
                                        onClick={() => handlePay(task.id)}
                                        disabled={!!processingId}
                                        className="w-full bg-white text-blue-700 h-20 rounded-2xl font-black text-2xl shadow-2xl hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                                    >
                                        <CreditCard size={32} />
                                        {processingId === task.id ? 'מעבד תשלום...' : 'שלם עכשיו'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 shadow-inner flex flex-col items-center">
                        <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 text-gray-200">
                            <Car size={48} />
                        </div>
                        <p className="text-gray-400 font-black text-lg">אין לך טיפולים פעילים כרגע.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default CustomerDashboard;
