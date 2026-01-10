import React, { useState } from 'react';
import NotificationBell from './NotificationBell';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, TaskStatus, Priority, Task } from '../types';
import TaskCard from './TaskCard';
import { Plus, Search, Clock, Wrench, CheckCircle2, UserPlus, Edit, Trash2 } from 'lucide-react';
import CreateTaskModal from './CreateTaskModal';
import InviteMemberModal from './InviteMemberModal';
import EditTaskModal from './EditTaskModal';

const ManagerDashboard: React.FC = () => {
    const { tasks, loading, deleteTask } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const getStatusLabel = (s: TaskStatus) => {
        switch (s) {
            case TaskStatus.WAITING: return 'ממתין';
            case TaskStatus.IN_PROGRESS: return 'בטיפול';
            case TaskStatus.COMPLETED: return 'הושלם';
            case TaskStatus.CUSTOMER_APPROVAL: return 'אישור לקוח';
            case TaskStatus.PAUSED: return 'מושהה';
            default: return s;
        }
    };

    const getPriorityLabel = (p: Priority) => {
        switch (p) {
            case Priority.NORMAL: return 'רגיל';
            case Priority.URGENT: return 'דחוף';
            case Priority.CRITICAL: return 'קריטי';
            default: return p;
        }
    };

    const stats = {
        waiting: tasks.filter(t => t.status === TaskStatus.WAITING).length,
        inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    };

    const filteredTasks = tasks.filter(t => {
        const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.vehicle?.plate.includes(searchQuery) ||
            t.vehicle?.model.includes(searchQuery);
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-8 md:space-y-12 animate-fade-in-up">
            {/* Stats Overview - Now Clickable on Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                <button
                    onClick={() => setStatusFilter(TaskStatus.WAITING)}
                    className={`card-premium p-6 md:p-10 flex items-center gap-4 md:gap-8 group transition-all ${statusFilter === TaskStatus.WAITING ? 'ring-2 ring-orange-500 scale-105' : ''
                        }`}
                >
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-orange-50 text-orange-600 rounded-[1.5rem] flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
                        <Clock size={28} className="md:w-10 md:h-10" />
                    </div>
                    <div>
                        <div className="text-3xl md:text-5xl font-black tracking-tighter">{stats.waiting}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">ממתינים</div>
                    </div>
                </button>

                <button
                    onClick={() => setStatusFilter(TaskStatus.IN_PROGRESS)}
                    className={`card-premium p-6 md:p-10 flex items-center gap-4 md:gap-8 group transition-all ${statusFilter === TaskStatus.IN_PROGRESS ? 'ring-2 ring-blue-500 scale-105' : ''
                        }`}
                >
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
                        <Wrench size={28} className="md:w-10 md:h-10" />
                    </div>
                    <div>
                        <div className="text-3xl md:text-5xl font-black tracking-tighter">{stats.inProgress}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">בטיפול</div>
                    </div>
                </button>

                <button
                    onClick={() => setStatusFilter(TaskStatus.COMPLETED)}
                    className={`card-premium p-6 md:p-10 flex items-center gap-4 md:gap-8 group transition-all ${statusFilter === TaskStatus.COMPLETED ? 'ring-2 ring-green-500 scale-105' : ''
                        }`}
                >
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-green-50 text-green-600 rounded-[1.5rem] flex items-center justify-center shadow-inner transition-transform group-hover:scale-110">
                        <CheckCircle2 size={28} className="md:w-10 md:h-10" />
                    </div>
                    <div>
                        <div className="text-3xl md:text-5xl font-black tracking-tighter">{stats.completed}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">הושלמו</div>
                    </div>
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-center sticky top-16 md:top-28 z-40 bg-[#f8f9fa]/80 backdrop-blur-xl py-4 -my-4">
                <div className="relative flex-1 w-full group">
                    <input
                        type="text"
                        placeholder="חיפוש משימה, לוחית רישוי או דגם..."
                        className="input-premium pl-12 md:pl-16 pr-5 md:pr-8 h-14 md:h-20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                </div>

                <div className="flex bg-white p-2 md:p-2.5 rounded-xl md:rounded-[1.5rem] shadow-sm border border-gray-100 h-12 md:h-20 items-center overflow-x-auto max-w-full">
                    {(['ALL', TaskStatus.WAITING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px - 4 md: px - 8 h - full rounded - lg md: rounded - xl text - xs font - black transition - all duration - 300 whitespace - nowrap ${statusFilter === f ? 'bg-black text-white shadow-xl scale-105' : 'text-gray-400 hover:text-black'} `}
                        >
                            {f === 'ALL' ? 'הכל' : f === TaskStatus.WAITING ? 'ממתין' : f === TaskStatus.IN_PROGRESS ? 'בטיפול' : 'הושלם'}
                        </button>
                    ))}
                </div>

                {/* Hide Invite Button on Mobile */}
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="hidden lg:flex h-20 px-8 bg-white border-2 border-dashed border-gray-300 rounded-[1.5rem] text-gray-400 font-black hover:border-black hover:text-black hover:bg-white transition-all items-center gap-3 whitespace-nowrap"
                >
                    <UserPlus size={24} />
                    <span>הזמן עובד</span>
                </button>

                {/* Desktop New Task Button */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="hidden md:flex btn-primary h-20 items-center gap-4 whitespace-nowrap px-10 shadow-2xl"
                >
                    <Plus size={28} /> משימה חדשה
                </button>
            </div>

            {/* Task List */}
            <div className="pb-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 animate-pulse-slow">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-6"></div>
                        <div className="font-black text-gray-400 uppercase tracking-[0.3em]">מעדכן משימות...</div>
                    </div>
                ) : filteredTasks.length > 0 ? (
                    <>
                        {/* Mobile View: Cards */}
                        <div className="md:hidden space-y-4">
                            {filteredTasks.map(task => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">משימה</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">רכב</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">סטטוס</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">דחיפות</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">תאריך</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredTasks.map(task => (
                                        <tr key={task.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-6 font-black text-gray-900">{task.title}</td>
                                            <td className="px-8 py-6">
                                                {task.vehicle ? (
                                                    <div>
                                                        <div className="font-mono font-black text-sm">{task.vehicle.plate}</div>
                                                        <div className="text-xs text-gray-400">{task.vehicle.model}</div>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 text-[10px] font-bold rounded-full ${task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                                    task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {getStatusLabel(task.status)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-[10px] font-bold ${task.priority === Priority.CRITICAL ? 'text-red-600' :
                                                    task.priority === Priority.URGENT ? 'text-orange-600' :
                                                        'text-blue-600'
                                                    }`}>
                                                    {getPriorityLabel(task.priority)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-sm text-gray-500">
                                                {new Date(task.created_at).toLocaleDateString('he-IL')}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setEditingTask(task)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                                                        title="ערוך"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
                                                                deleteTask(task.id);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                                                        title="מחק"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="card-premium p-20 md:p-40 text-center flex flex-col items-center group">
                        <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2rem] flex items-center justify-center mb-8 transition-transform group-hover:rotate-12">
                            <Search size={48} />
                        </div>
                        <div className="text-gray-400 font-black uppercase tracking-[0.2em] text-xl">
                            לא נמצאו משימות תואמות
                        </div>
                        <button
                            onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                            className="mt-8 text-black font-black text-xs uppercase tracking-widest border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
                        >
                            נקה את כל המסננים
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile FAB - Floating Action Button */}
            <button
                onClick={() => setShowAddModal(true)}
                className="md:hidden fab"
                aria-label="הוסף משימה חדשה"
            >
                <Plus size={28} strokeWidth={3} />
            </button>

            {/* Modals */}
            {showAddModal && <CreateTaskModal onClose={() => setShowAddModal(false)} />}
            {showInviteModal && <InviteMemberModal onClose={() => setShowInviteModal(false)} />}
            {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />}
        </div>
    );
};

export default ManagerDashboard;
