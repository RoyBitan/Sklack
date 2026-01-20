import React, { useState } from 'react';
import { Task, TaskStatus, ProposalStatus } from '../types';
import { formatLicensePlate } from '../utils/formatters';
import {
    Calendar, Clock, Phone, PlusCircle, ChevronUp, ChevronDown, AlertCircle, Trash2, Edit2
} from 'lucide-react';

interface CustomerTaskCardProps {
    task: Task;
    garagePhone: string | null;
    onShowRequest: (taskId: string) => void;
    onCancel: (taskId: string) => void;
    onEdit: (task: Task) => void;
}

const serviceLabels: Record<string, string> = {
    'ROUTINE_SERVICE': 'טיפול תקופתי',
    'DIAGNOSTICS': 'אבחון ותקלה',
    'BRAKES': 'ברקסים',
    'TIRES': 'צמיגים',
    'BATTERY': 'מצבר וחשמל',
    'AIR_CONDITIONING': 'מיזוג אוויר',
    'TEST_PREP': 'הכנה לטסט',
    'OTHER': 'אחר'
};

const CustomerTaskCard: React.FC<CustomerTaskCardProps> = ({ task, garagePhone, onShowRequest, onCancel, onEdit }) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const pendingProposals = task.proposals?.filter(p => p.status === ProposalStatus.PENDING_CUSTOMER) || [];

    const getServicesLabel = () => {
        const metadata = task.metadata as any;
        const types = metadata?.serviceTypes || metadata?.selectedServices;
        if (Array.isArray(types) && types.length > 0) {
            return types.map((t: string) => serviceLabels[t] || t).join(', ');
        }
        return task.title || 'התור שלי למוסך';
    };

    // Status Mapping
    let statusText = 'ממתין';
    let statusColor = 'bg-gray-100 text-gray-700';

    if (task.status === TaskStatus.WAITING_FOR_APPROVAL) {
        statusText = 'ממתין לאישור התור';
        statusColor = 'bg-purple-100/80 text-purple-700 border border-purple-200';
    } else if (task.status === TaskStatus.SCHEDULED) {
        statusText = 'מתוזמן לעתיד';
        statusColor = 'bg-yellow-100/80 text-yellow-700 border border-yellow-200';
    } else if (task.status === TaskStatus.WAITING) {
        statusText = 'בתור: ממתין לצוות';
        statusColor = 'bg-orange-100/80 text-orange-700 border border-orange-200';
    } else if (task.status === TaskStatus.APPROVED) {
        statusText = 'הטיפול אושר';
        statusColor = 'bg-blue-100/80 text-blue-700 border border-blue-200';
    } else if (task.status === TaskStatus.IN_PROGRESS) {
        statusText = 'הרכב בטיפול';
        statusColor = 'bg-emerald-100/80 text-emerald-700 border border-emerald-200';
    } else if (task.status === TaskStatus.COMPLETED) {
        statusText = 'הטיפול הסתיים בהצלחה';
        statusColor = 'bg-green-100/80 text-green-700 border border-green-200';
    } else if (task.status === TaskStatus.CUSTOMER_APPROVAL) {
        statusText = 'דרוש אישור הלקוח';
        statusColor = 'bg-orange-100 text-orange-700';
    }

    return (
        <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group h-full text-start">
            <div className="space-y-4">
                <div className="flex justify-between items-start">
                    <div className="bg-yellow-400 border-2 border-black rounded-lg px-3 py-1.5 inline-block shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <span className="font-mono text-sm font-black tracking-widest text-black" dir="ltr">
                            {formatLicensePlate(task.vehicle?.plate || '---')}
                        </span>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                        {statusText}
                    </span>
                </div>

                <div>
                    <div>
                        <h4 className="font-black text-xl text-gray-900 leading-tight mb-1">{getServicesLabel()}</h4>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{task.vehicle?.model}</p>
                    </div>
                </div>

                {/* Appointment Details */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-2 text-center">
                    <div>
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">תאריך</span>
                        <div className="font-bold text-gray-700 text-xs flex items-center justify-center gap-1">
                            <Calendar size={12} />
                            {/* @ts-ignore */}
                            {(task.metadata as any)?.appointmentDate || new Date(task.created_at).toLocaleDateString('en-GB')}
                        </div>
                    </div>
                    <div>
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">שעה</span>
                        <div className="font-bold text-gray-700 text-xs flex items-center justify-center gap-1">
                            <Clock size={12} />
                            {/* @ts-ignore */}
                            {(task.metadata as any)?.appointmentTime || new Date(task.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    {garagePhone && (
                        <a href={`tel:${garagePhone}`} className="bg-black text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-md active:scale-95">
                            <Phone size={16} />
                            <span className="text-xs font-black">התקשר</span>
                        </a>
                    )}
                    <button
                        onClick={() => onShowRequest(task.id)}
                        className="bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        <PlusCircle size={16} />
                        <span className="text-xs font-black">בקשה</span>
                    </button>
                </div>

                {/* Details Toggle */}
                <button
                    onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                    className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <span>פרטי תור</span>
                    {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isDetailsOpen && (
                    <div className="mt-2 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-2 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <span>סוג שירות:</span>
                            <span className="font-bold text-gray-800 text-end pl-2">
                                {getServicesLabel()}
                            </span>
                        </div>
                        {/* @ts-ignore */}
                        {task.metadata?.currentMileage && (
                            <div className="flex justify-between">
                                <span>קילומטראז':</span>
                                {/* @ts-ignore */}
                                <span className="font-bold text-gray-800">{task.metadata.currentMileage} km</span>
                            </div>
                        )}
                        {/* @ts-ignore */}
                        {task.metadata?.paymentMethod && (
                            <div className="flex justify-between">
                                <span>תשלום:</span>
                                <span className="font-bold text-gray-800">
                                    {/* @ts-ignore */}
                                    {task.metadata.paymentMethod === 'CREDIT_CARD' ? 'אשראי' : task.metadata.paymentMethod === 'CASH' ? 'מזומן' : 'אחר'}
                                </span>
                            </div>
                        )}

                        {task.description && (
                            <div className="bg-gray-50 p-3 rounded-lg mt-2">
                                <span className="block text-[10px] uppercase tracking-widest mb-1">תיאור תקלה:</span>
                                {task.description}
                            </div>
                        )}

                        {/* Edit/Cancel Actions */}
                        <div className="flex gap-2 mt-4 pt-2 border-t border-gray-100">
                            <button
                                onClick={() => onEdit(task)}
                                className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100"
                            >
                                <Edit2 size={14} /> ערוך פרטים
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('האם אתה בטוח שברצונך לבטל את התור?')) onCancel(task.id);
                                }}
                                className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-100"
                            >
                                <Trash2 size={14} /> בטל תור
                            </button>
                        </div>
                    </div>
                )}

                {/* Pending Proposals Alert */}
                {pendingProposals.length > 0 && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mt-4 animate-pulse-slow">
                        <div className="flex items-center gap-2 text-orange-800 font-black text-xs uppercase tracking-widest mb-2">
                            <AlertCircle size={14} />
                            ממתין לאישור
                        </div>
                        <button
                            onClick={() => {/* Expand or navigate to proposal view - simplified for card */ }}
                            className="w-full bg-orange-500 text-white text-xs font-black py-2 rounded-lg"
                        >
                            צפה ב-{pendingProposals.length} הצעות
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerTaskCard;
