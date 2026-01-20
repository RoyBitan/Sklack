import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../contexts/DataContext';
import { Priority, Task, TaskStatus } from '../types';

interface EditTaskModalProps {
    task: Task;
    onClose: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose }) => {
    const { refreshData } = useData();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [isUrgent, setIsUrgent] = useState(task.priority === Priority.URGENT || task.priority === Priority.CRITICAL);
    const [status, setStatus] = useState<TaskStatus>(task.status);
    const [year, setYear] = useState(task.vehicle_year || '');
    const [immobilizer, setImmobilizer] = useState(task.immobilizer_code || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error: updateError } = await supabase
                .from('tasks')
                .update({
                    title,
                    description,
                    priority: isUrgent ? Priority.URGENT : Priority.NORMAL,
                    status,
                    vehicle_year: year,
                    immobilizer_code: immobilizer,
                    updated_at: new Date().toISOString()
                })
                .eq('id', task.id);

            if (updateError) throw updateError;

            await refreshData();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'שגיאה בעדכון המשימה');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up">
            <div className="bg-white w-full h-full sm:h-auto sm:w-full sm:max-w-2xl sm:rounded-[2rem] shadow-2xl flex flex-col transition-all duration-300">
                <div className="px-6 py-5 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-white sm:rounded-t-[2rem] sticky top-0 z-10 shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tighter">עריכת משימה</h2>
                        <p className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mt-1">עדכון פרטי טיפול ורכב</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-black hover:text-white transition-all active:scale-90 touch-target">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-8">
                    <form id="edit-task-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">כותרת הטיפול</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="input-premium px-4 py-3 text-base rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">שנתון רכב</label>
                                <input
                                    type="text"
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                    className="input-premium px-4 py-3 text-base rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">אימובילייזר / קודנית</label>
                                <input
                                    type="text"
                                    value={immobilizer}
                                    onChange={e => setImmobilizer(e.target.value)}
                                    className="input-premium px-4 py-3 text-base rounded-xl font-mono text-center tracking-widest"
                                    placeholder="1234"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">סטטוס</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as TaskStatus)}
                                className="input-premium font-bold"
                            >
                                {Object.values(TaskStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">תיאור והערות</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="input-premium h-32 py-4 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 px-1 uppercase tracking-widest text-start">דחיפות</label>
                            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${isUrgent ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isUrgent ? 'border-red-500 bg-red-500 text-white' : 'border-gray-300 bg-white'}`}>
                                    {isUrgent && <Check size={14} strokeWidth={4} />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isUrgent}
                                    onChange={e => setIsUrgent(e.target.checked)}
                                    className="hidden"
                                />
                                <span className={`font-black ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                                    {isUrgent ? 'דחוף מאוד' : 'רגיל'}
                                </span>
                            </label>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-6 rounded-[1.5rem] flex items-center gap-4 border border-red-100">
                                <AlertCircle size={24} />
                                <p className="text-sm font-black">{error}</p>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 sm:p-8 border-t border-gray-100 bg-white sticky bottom-0 z-10 shrink-0 mb-safe">
                    <button
                        form="edit-task-form"
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-3 touch-target"
                    >
                        {loading ? 'שומר...' : <><Save size={20} /> <span className="font-black text-lg">שמור שינויים</span></>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditTaskModal;
