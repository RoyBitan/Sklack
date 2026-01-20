import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority, UserRole, Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import {
    Clock,
    Wrench,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    MessageCircle,
    Play,
    Check,
    User as UserIcon,
    Car as CarIcon,
    Calendar,
    ArrowRightLeft,
    ChevronRight,
    Edit2,
    Trash2,
    Undo2,
    RotateCcw,
    ShieldAlert,
    X,
    ChevronLeft,
    Phone,
    ClipboardList,
    Activity
} from 'lucide-react';
import EditTaskModal from './EditTaskModal';
import { formatLicensePlate } from '../utils/formatters';

interface TaskCardProps {
    task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const { profile } = useAuth();
    const { refreshData, updateTaskStatus, claimTask, releaseTask, deleteTask: deleteTaskFn, approveTask } = useData();
    const { navigateTo, setSelectedTaskId } = useApp();
    const [expanded, setExpanded] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [assignedWorkers, setAssignedWorkers] = useState<Profile[]>([]);

    const isManager = profile?.role === UserRole.SUPER_MANAGER || profile?.role === UserRole.DEPUTY_MANAGER;
    const isTeam = profile?.role === UserRole.TEAM;

    // Fetch assigned worker profiles
    useEffect(() => {
        const fetchWorkers = async () => {
            if (task.assigned_to && task.assigned_to.length > 0) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, role, phone')
                    .in('id', task.assigned_to);
                if (data) setAssignedWorkers(data as Profile[]);
            }
        };
        fetchWorkers();
    }, [task.assigned_to]);

    const updateStatus = async (newStatus: TaskStatus) => {
        setUpdating(true);
        try {
            await updateTaskStatus(task.id, newStatus);
        } catch (err) {
            console.error('Failed to update task status:', err);
        } finally {
            setUpdating(false);
        }
    };

    const handleClaim = async () => {
        setUpdating(true);
        try {
            await claimTask(task.id);
        } catch (err) {
            console.error('Claim failed', err);
        } finally {
            setUpdating(false);
        }
    };

    const handleRelease = async () => {
        if (!window.confirm('האם אתה בטוח שברצונך לשחרר משימה זו חזרה למאגר?')) return;
        setUpdating(true);
        try {
            await releaseTask(task.id);
        } catch (err) {
            console.error('Release failed', err);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) return;
        try {
            await deleteTaskFn(task.id);
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    const getPriorityInfo = (p: Priority) => {
        // Simple logic: Urgent/Critical get red border. Normal gets nothing.
        const isUrgent = p === Priority.URGENT || p === Priority.CRITICAL;
        if (isUrgent) {
            return { ring: 'shadow-[0_0_30px_rgba(220,38,38,0.3)]', border: 'border-2 border-red-500' };
        }
        return { ring: '', border: 'border border-gray-100' };
    };

    const pInfo = getPriorityInfo(task.priority);

    return (
        <div id={`task-${task.id}`} className={`card-premium overflow-hidden group transition-all duration-500 ${expanded ? 'scale-[1.02] shadow-2xl z-10' : ''} ${pInfo.border} ${pInfo.ring}`}>
            <div className="p-5 md:p-10">
                <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-10">
                    {/* Main Info */}
                    <div className="flex-1 space-y-4 md:space-y-8">
                        <div className="flex flex-wrap items-center gap-4">
                            {isManager && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-gray-900 tracking-tighter leading-tight group-hover:translate-x-1 transition-transform">{task.title}</h3>

                            <div className="flex flex-wrap items-center gap-4">
                                {task.vehicle && (
                                    <>
                                        <div className="text-lg font-black text-gray-400 italic"> {task.vehicle.model}</div>
                                        <div className="bg-[#FFE600] border-2 border-black rounded-lg px-3 py-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                            <span className="font-mono font-black text-base tracking-widest">{formatLicensePlate(task.vehicle.plate)}</span>
                                        </div>
                                    </>
                                )}

                                {/* WORKER BADGE - Real-time indicator for Admins/Team */}
                                {(isManager || isTeam) && assignedWorkers.length > 0 && (
                                    <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1.5 rounded-full shadow-lg border-2 border-white animate-pulse-subtle">
                                        <Wrench size={14} className="animate-spin-slow" />
                                        <span className="text-xs font-black tracking-tight whitespace-nowrap">
                                            {assignedWorkers[0].full_name} בטיפול
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* 'More Details' Button - Static Action for Admins/Staff */}
                            {(isManager || isTeam) && (
                                <div className="mt-4 border-t border-gray-50 pt-4 flex gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTaskId(task.id);
                                            navigateTo('TASK_DETAIL');
                                        }}
                                        className="flex-1 bg-purple-50 text-purple-700 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 hover:bg-purple-600 hover:text-white transition-all border border-purple-100 shadow-md active:scale-95 group/btn"
                                    >
                                        <Activity size={18} className="text-purple-500 group-hover/btn:text-white transition-colors" />
                                        <span>פרטים מלאים וניהול</span>
                                        <ChevronLeft size={16} className="mr-auto opacity-50" />
                                    </button>
                                </div>
                            )}

                            {/* Assigned Workers - Manager & Team Only */}
                            {(isManager || isTeam) && assignedWorkers.length > 0 && (
                                <div className="flex flex-col gap-2 mt-4">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">בטיפול ע"י:</div>
                                    <div className="flex items-center gap-3 text-sm bg-blue-50 w-fit px-4 py-2 rounded-2xl border border-blue-100 shadow-sm">
                                        <Wrench size={16} className="text-blue-500" />
                                        <span className="font-black text-gray-700">
                                            {assignedWorkers.map(w => w.full_name).join(', ')}
                                        </span>
                                        {isManager && assignedWorkers[0]?.phone && (
                                            <a
                                                href={`tel:${assignedWorkers[0].phone}`}
                                                className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-95"
                                                title={`התקשר ל${assignedWorkers[0].full_name}`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.82 12.82 0 0 0 .57 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.57A2 2 0 0 1 22 16.92z" /></svg>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Admin Actions for Appointment Requests or New Check-ins */}
                            {isManager && task.status === TaskStatus.WAITING_FOR_APPROVAL && (
                                <div className="flex flex-wrap gap-3 mt-4 animate-fade-in-up">
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const now = new Date();
                                            const today = now.toISOString().split('T')[0];
                                            const requestedDate = (task.metadata as any)?.appointmentDate || today;

                                            if (requestedDate === today) {
                                                const sendNow = window.confirm('האם להעביר את המשימה ללוח העבודה של הצוות עכשיו?');
                                                if (sendNow) {
                                                    await approveTask(task.id, true);
                                                } else {
                                                    const reminder = window.prompt('הזן שעה לתזכורת (HH:mm):', '10:00');
                                                    if (reminder) {
                                                        const [hours, minutes] = reminder.split(':');
                                                        const reminderDate = new Date();
                                                        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                                        await approveTask(task.id, false, reminderDate.toISOString());
                                                    } else {
                                                        await approveTask(task.id, false);
                                                    }
                                                }
                                            } else {
                                                await approveTask(task.id, false);
                                                alert(`המשימה תוזמנה לתאריך ${requestedDate}`);
                                            }
                                        }}
                                        className="bg-green-600 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-green-700 transition-all shadow-xl active:scale-95"
                                    >
                                        <CheckCircle2 size={18} /> אשר בקשה
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('האם לדחות את הבקשה? המשימה תבוטל.')) {
                                                updateTaskStatus(task.id, TaskStatus.CANCELLED);
                                            }
                                        }}
                                        className="bg-red-500 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg active:scale-95"
                                    >
                                        <AlertCircle size={18} /> דחה
                                    </button>
                                </div>
                            )}

                            {/* Worker Workflow Buttons */}
                            {isTeam && (
                                <div className="flex flex-wrap gap-3 mt-4">
                                    {!task.assigned_to?.includes(profile?.id || '') ? (
                                        <button
                                            onClick={handleClaim}
                                            disabled={updating}
                                            title="שייך אליי"
                                            className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95"
                                        >
                                            <Play size={24} fill="white" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleRelease}
                                            disabled={updating}
                                            title="שחרר משימה"
                                            className="w-14 h-14 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-all hover:scale-110 active:scale-95"
                                        >
                                            <RotateCcw size={24} />
                                        </button>
                                    )}

                                    {task.assigned_to?.includes(profile?.id || '') && task.status !== TaskStatus.COMPLETED && (
                                        <button
                                            onClick={() => updateStatus(TaskStatus.COMPLETED)}
                                            disabled={updating}
                                            title="סיים טיפול"
                                            className="h-14 px-8 bg-green-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-600 transition-all shadow-[0_4px_12px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95"
                                        >
                                            <CheckCircle2 size={24} />
                                            סיים טיפול
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Secondary Info */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 md:gap-6 border-t lg:border-t-0 lg:border-r border-gray-100 pt-4 md:pt-8 lg:pt-0 lg:pr-10">
                        <div className="text-right">
                            <div className="text-[9px] md:text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1 md:mb-2">זמן פתיחה</div>
                            <div className="flex items-center gap-1 md:gap-2 text-base md:text-xl font-black text-gray-900">
                                <Clock size={16} className="text-gray-300 md:w-5 md:h-5" />
                                {new Date(task.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-[9px] md:text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1 md:mb-2">תאריך</div>
                            <div className="flex items-center gap-1 md:gap-2 text-base md:text-xl font-black text-gray-900">
                                <Calendar size={16} className="text-gray-300 md:w-5 md:h-5" />
                                {new Date(task.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="bg-gray-50/70 p-6 md:p-12 border-t-2 border-gray-100 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
                        <div className="space-y-8">
                            {/* Customer Details */}
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4">פרטי לקוח</label>
                                <div className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                        <UserIcon size={24} />
                                    </div>
                                    <div>
                                        {/* @ts-ignore */}
                                        <div className="font-black text-lg text-gray-900">{task.vehicle?.owner?.full_name || 'לקוח מזדמן'}</div>
                                        {/* @ts-ignore */}
                                        <div className="text-sm font-bold text-gray-400 font-mono">{task.vehicle?.owner?.phone || '---'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Kodanit / Immobilizer Privacy Logic */}
                            {(() => {
                                const kodanitValue = task.immobilizer_code || task.vehicle?.kodanit;
                                const isOwner = profile?.id === task.vehicle?.owner_id;
                                const isAssignedStaff = isTeam && task.assigned_to?.includes(profile?.id || '') && task.status !== TaskStatus.COMPLETED;
                                const canSeeKodanit = isManager || isOwner || isAssignedStaff;

                                if (kodanitValue && canSeeKodanit) {
                                    return (
                                        <div className="animate-fade-in">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-4">קודנית (Secret Code)</label>
                                            <div className="bg-gray-900 text-white p-6 rounded-[2rem] shadow-xl flex items-center gap-4 border-l-8 border-red-500">
                                                <ShieldAlert size={24} className="text-red-500" />
                                                <div className="font-mono text-3xl font-black tracking-[0.3em]">{kodanitValue}</div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold mt-2 pr-2">קוד זה גלוי לך כיוון שהמשימה משוייכת אליך או שהנך בעל הרכב/מנהל</p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6">פרטי רכב מלאים</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                        <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Make, Model & Year</div>
                                        <div className="font-black text-gray-800">{task.vehicle?.model} {task.vehicle?.year ? `(${task.vehicle.year})` : ''}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                        <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Color</div>
                                        <div className="font-black text-gray-800">{task.vehicle?.color || '---'}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                        <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Fuel Type</div>
                                        <div className="font-black text-gray-800">{task.vehicle?.fuel_type || '---'}</div>
                                    </div>
                                    {/* More details tab content inside basic grid for expansion ease */}
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                        <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">VIN / Chassis</div>
                                        <div className="font-mono text-[10px] font-black text-gray-800 uppercase">{task.vehicle?.vin || '---'}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                        <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Engine Code</div>
                                        <div className="font-mono text-[10px] font-black text-gray-800 uppercase">{task.vehicle?.engine_model || '---'}</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                        <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Next Test</div>
                                        <div className="font-black text-gray-800">{task.vehicle?.registration_valid_until || '---'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Check-In Details / Metadata */}
                            {isManager && (task.metadata as any)?.type && (
                                <div className="animate-fade-in-up">
                                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] block mb-4">פרטי צ'ק-אין / בקשת תור</label>
                                    <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100/50 space-y-4 shadow-inner">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">מועד מבוקש</div>
                                                <div className="font-black text-gray-800 flex items-center gap-2">
                                                    <Calendar size={14} className="text-blue-500" />
                                                    {(task.metadata as any)?.appointmentDate || 'לא צוין'} {(task.metadata as any)?.appointmentTime || ''}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">קילומטראז'</div>
                                                <div className="font-black text-gray-800 flex items-center gap-2">
                                                    <Clock size={14} className="text-blue-500" />
                                                    {(task.metadata as any)?.currentMileage || (task.metadata as any)?.mileage || '---'} KM
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">סוג שירות</div>
                                                <div className="font-black text-gray-800 flex items-center gap-2">
                                                    <Wrench size={14} className="text-blue-500" />
                                                    {Array.isArray((task.metadata as any)?.serviceTypes) ? (task.metadata as any).serviceTypes.join(', ') : (task.metadata as any)?.serviceType || 'כללי'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">צורת תשלום</div>
                                                <div className="font-black text-gray-800 flex items-center gap-2">
                                                    <MessageCircle size={14} className="text-blue-500" />
                                                    {(task.metadata as any)?.paymentMethod === 'CREDIT_CARD' ? 'אשראי' : (task.metadata as any)?.paymentMethod === 'CASH' ? 'מזומן' : 'אחר'}
                                                </div>
                                            </div>
                                        </div>
                                        {((task.metadata as any)?.faultDescription || (task.metadata as any)?.description) && (
                                            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">תיאור התקלה / בקשה</div>
                                                <div className="text-sm font-bold text-gray-700 leading-relaxed italic">
                                                    "{(task.metadata as any)?.faultDescription || (task.metadata as any)?.description}"
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6">תיאור והערות טכנאי</label>
                                <div className="card-premium p-8 bg-white shadow-sm italic text-gray-600 text-lg leading-relaxed relative min-h-[150px]">
                                    <MessageCircle size={24} className="text-gray-200 absolute top-4 left-4" />
                                    {task.description || 'לא הוזנו הערות נוספות למשימה זו.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showEditModal && <EditTaskModal task={task} onClose={() => setShowEditModal(false)} />}
            {showEditModal && <EditTaskModal task={task} onClose={() => setShowEditModal(false)} />}
        </div>
    );
};

export default TaskCard;
