import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority, UserRole, Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';
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
    ShieldAlert
} from 'lucide-react';
import EditTaskModal from './EditTaskModal';

interface TaskCardProps {
    task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const { profile } = useAuth();
    const { refreshData, updateTaskStatus } = useApp();
    const [expanded, setExpanded] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [assignedWorkers, setAssignedWorkers] = useState<Profile[]>([]);

    const isManager = profile?.role === UserRole.SUPER_MANAGER || profile?.role === UserRole.DEPUTY_MANAGER;
    const isEmployee = profile?.role === UserRole.EMPLOYEE;

    // Fetch assigned worker profiles
    useEffect(() => {
        const fetchWorkers = async () => {
            if (task.assigned_to && task.assigned_to.length > 0) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name, role')
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

    const handleDelete = async () => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) return;
        try {
            const { deleteTask: deleteTaskFn } = useApp();
            await deleteTaskFn(task.id);
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    const getPriorityInfo = (p: Priority) => {
        switch (p) {
            case Priority.CRITICAL: return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'קריטי' };
            case Priority.URGENT: return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'דחוף' };
            default: return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'רגיל' };
        }
    };

    const pInfo = getPriorityInfo(task.priority);

    return (
        <div className={`card-premium overflow-hidden group transition-all duration-500 ${expanded ? 'scale-[1.02] ring-2 ring-black/5' : ''}`}>
            <div className="p-5 md:p-10">
                <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-10">
                    {/* Main Info */}
                    <div className="flex-1 space-y-4 md:space-y-8">
                        <div className="flex flex-wrap items-center gap-4">
                            <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${pInfo.bg} ${pInfo.color} border-2 ${pInfo.border} shadow-sm group-hover:scale-110 transition-transform`}>
                                {pInfo.label}
                            </span>
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
                                            <span className="font-mono font-black text-base tracking-widest">{task.vehicle.plate}</span>
                                        </div>
                                        {/* @ts-ignore - joined owner field */}
                                        {task.vehicle.owner?.full_name && (
                                            <div className="flex items-center gap-2 text-gray-500 font-bold">
                                                <UserIcon size={16} />
                                                <span>{task.vehicle.owner.full_name}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {task.immobilizer_code && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-[11px] font-black text-gray-500">
                                        <ShieldAlert size={14} />
                                        <span>קודנית: {task.immobilizer_code}</span>
                                    </div>
                                )}
                            </div>

                            {/* Assigned Workers - Manager Only */}
                            {isManager && assignedWorkers.length > 0 && (
                                <div className="flex items-center gap-2 text-sm bg-blue-50/50 w-fit px-3 py-1.5 rounded-xl">
                                    <Wrench size={16} className="text-blue-500" />
                                    <span className="font-bold text-gray-600">
                                        {assignedWorkers.map(w => w.full_name).join(', ')}
                                    </span>
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
                <div className="bg-gray-50/70 p-12 border-t-2 border-gray-100 animate-fade-in-up">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                        <div className="space-y-10">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6">תיאור והערות טכנאי</label>
                                <div className="card-premium p-10 bg-white shadow-sm italic text-gray-600 text-lg leading-relaxed relative">
                                    <div className="absolute top-4 left-4 text-gray-100">
                                        <MessageCircle size={32} />
                                    </div>
                                    {task.description || 'לא הוזנו הערות נוספות למשימה זו.'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-6">פרטי רכב מלאים</label>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="card-premium p-8 flex items-center gap-6 group/item">
                                        <div className="bg-blue-50 text-blue-500 p-4 rounded-2xl group-hover/item:scale-125 transition-transform">
                                            <CarIcon size={24} />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">דגם</div>
                                            <div className="font-black text-gray-800">{task.vehicle?.model || '---'}</div>
                                        </div>
                                    </div>
                                    <div className="card-premium p-8 flex items-center gap-6 group/item">
                                        <div className="bg-purple-50 text-purple-500 p-4 rounded-2xl group-hover/item:scale-125 transition-transform">
                                            <ArrowRightLeft size={24} />
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">שנה</div>
                                            <div className="font-black text-gray-800">{task.vehicle?.year || '---'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showEditModal && <EditTaskModal task={task} onClose={() => setShowEditModal(false)} />}
        </div>
    );
};

export default TaskCard;
