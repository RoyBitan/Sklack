import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
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
    const [priority, setPriority] = useState<Priority>(task.priority);
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
                    priority,
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

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/40 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter">עריכת משימה</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">עדכון פרטי כרטיס עבודה</p>
                    </div>
                    <button onClick={onClose} className="p-4 bg-gray-50 rounded-[1.5rem] hover:bg-black hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                    <form id="edit-task-form" onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">כותרת הטיפול</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="input-premium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">שנתון רכב</label>
                                <input
                                    type="text"
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                    className="input-premium"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 mb-3 px-2 uppercase tracking-[0.3em] text-start">קודנית</label>
                                <input
                                    type="text"
                                    value={immobilizer}
                                    onChange={e => setImmobilizer(e.target.value)}
                                    className="input-premium font-mono text-center tracking-widest"
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
                            <div className="bg-red-50 text-red-600 p-6 rounded-[1.5rem] flex items-center gap-4 border border-red-100">
                                <AlertCircle size={24} />
                                <p className="text-sm font-black">{error}</p>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-8 border-t border-gray-100 bg-white">
                    <button
                        form="edit-task-form"
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-3"
                    >
                        {loading ? 'שומר...' : <><Save size={20} /> <span className="font-black text-lg">שמור שינויים</span></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditTaskModal;
