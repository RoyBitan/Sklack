
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { TaskStatus } from '../types';
import TaskCard from './TaskCard';
import { Briefcase, ListTodo, Sun, Layers, CheckCircle } from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
    const { tasks, user, t } = useApp();
    const [view, setView] = useState<'MY_TASKS' | 'OPEN' | 'HISTORY'>('MY_TASKS');

    // Filter tasks assigned to me that are IN_PROGRESS
    const activeTasks = tasks.filter(t => t.assigned_to?.includes(user?.id || '') && t.status === TaskStatus.IN_PROGRESS);

    // Filter tasks assigned to me that are still WAITING (The Queue)
    const myQueue = tasks.filter(t => t.assigned_to?.includes(user?.id || '') && t.status === TaskStatus.WAITING);

    // Filter open tasks (unassigned or assigned to others but waiting)
    const openTasks = tasks.filter(t => t.status === TaskStatus.WAITING);

    // Filter completed tasks assigned to me
    const completedTasks = tasks.filter(t => t.assigned_to?.includes(user?.id || '') && t.status === TaskStatus.COMPLETED);

    const hasActiveTask = activeTasks.length > 0;

    return (
        <div className="pb-20 space-y-4 md:space-y-6">

            {/* Welcome Header */}
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none"></div>

                <div className="relative p-5 md:p-8">
                    <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-1">
                        <Sun size={16} />
                        <span>יום עבודה נעים!</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">שלום, {user?.name.split(' ')[0]}</h1>
                    <p className="text-blue-100 opacity-90 text-sm md:text-base max-w-sm">
                        יש לך <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">{activeTasks.length}</span> משימות פעילות היום
                        {myQueue.length > 0 && ` + ${myQueue.length} בתור`}
                    </p>
                </div>
            </div>

            {/* View Switcher */}
            <div className="bg-gray-100/80 p-1.5 rounded-xl md:rounded-2xl flex gap-1 shadow-inner border border-gray-200/50">
                <button
                    onClick={() => setView('MY_TASKS')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${view === 'MY_TASKS'
                        ? 'bg-white text-blue-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                >
                    <Briefcase size={16} className={view === 'MY_TASKS' ? 'text-blue-500' : 'text-gray-400'} />
                    משימות שלי
                    <span className={`text-xs px-2 py-0.5 rounded-full ${view === 'MY_TASKS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                        {activeTasks.length + myQueue.length}
                    </span>
                </button>
                <button
                    onClick={() => setView('OPEN')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${view === 'OPEN'
                        ? 'bg-white text-blue-700 shadow-[0_2px_8_rgba(0,0,0,0.08)] ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                >
                    <ListTodo size={16} className={view === 'OPEN' ? 'text-blue-500' : 'text-gray-400'} />
                    קריאות פתוחות
                    <span className={`text-xs px-2 py-0.5 rounded-full ${view === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                        {openTasks.length}
                    </span>
                </button>
                <button
                    onClick={() => setView('HISTORY')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg md:rounded-xl transition-all duration-300 ${view === 'HISTORY'
                        ? 'bg-white text-blue-700 shadow-[0_2px_8_rgba(0,0,0,0.08)] ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                >
                    <CheckCircle size={16} className={view === 'HISTORY' ? 'text-blue-500' : 'text-gray-400'} />
                    היסטוריה
                    <span className={`text-xs px-2 py-0.5 rounded-full ${view === 'HISTORY' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                        {completedTasks.length}
                    </span>
                </button>
            </div>

            <div className="space-y-4 md:space-y-6 animate-fade-in-up">
                {view === 'MY_TASKS' && (
                    <>
                        {/* Active Section */}
                        {activeTasks.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                                    <Briefcase size={14} /> בטיפול כרגע
                                </div>
                                {activeTasks.map(task => (
                                    <TaskCard key={task.id} task={task} />
                                ))}
                            </div>
                        )}

                        {/* Queue Section */}
                        {myQueue.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <div className="flex items-center gap-2 px-2 text-gray-400 font-black text-xs uppercase tracking-widest">
                                    <Layers size={14} /> הבאות בתור עבורך
                                </div>
                                {myQueue.map(task => (
                                    <TaskCard key={task.id} task={task} />
                                ))}
                            </div>
                        )}

                        {activeTasks.length === 0 && myQueue.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl md:rounded-3xl border border-dashed border-gray-200 shadow-sm">
                                <div className="bg-green-50 text-green-500 p-4 rounded-full mb-4">
                                    <Briefcase size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">הכל נקי!</h3>
                                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">אין לך משימות פעילות כרגע. כל הכבוד!</p>
                                <button onClick={() => setView('OPEN')} className="mt-4 text-blue-600 font-medium text-sm hover:underline">
                                    בדוק אם יש קריאות חדשות
                                </button>
                            </div>
                        )}
                    </>
                )}

                {view === 'OPEN' && (
                    <>
                        {openTasks.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl">
                                <p className="text-gray-500">אין קריאות פתוחות כרגע</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4">
                            {openTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                />
                            ))}
                        </div>
                    </>
                )}

                {view === 'HISTORY' && (
                    <>
                        {completedTasks.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl">
                                <p className="text-gray-500">אין משימות שהושלמו</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4">
                            {completedTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmployeeDashboard;
