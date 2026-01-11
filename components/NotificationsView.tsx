import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Bell, Clock, Briefcase, Car, AlertCircle, CheckCircle2 } from 'lucide-react';

const NotificationsView: React.FC = () => {
    const { navigateTo } = useApp();
    const { notifications, markNotificationRead } = useData();

    const handleNotificationClick = async (n: any) => {
        if (!n.is_read) {
            await markNotificationRead(n.id);
        }

        navigateTo('DASHBOARD');

        // Scroll to task if relevant
        if (n.task_id) {
            setTimeout(() => {
                const element = document.getElementById(`task-${n.task_id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-emerald-500', 'ring-offset-4');
                    setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-emerald-500', 'ring-offset-4');
                    }, 3000);
                }
            }, 100);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Bell className="text-black" />
                    התראות
                </h2>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                    {notifications.length} הודעות
                </span>
            </div>

            <div className="space-y-3">
                {notifications.length > 0 ? notifications.map(n => (
                    <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer hover:scale-[1.01] active:scale-95 ${n.is_read ? 'bg-white border-gray-100 opacity-80 shadow-sm' : 'bg-white border-black shadow-md'}`}
                    >
                        <div className="flex gap-4">
                            <div className={`mt-1 p-3 rounded-2xl ${(n.title || '').includes('משימה') ? 'bg-blue-50 text-blue-600' :
                                    (n.title || '').includes('הצעה') ? 'bg-orange-50 text-orange-600' :
                                        (n.title || '').includes('אישור') ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                                }`}>
                                {(n.title || '').includes('משימה') && <Briefcase size={20} />}
                                {(n.title || '').includes('הצעה') && <AlertCircle size={20} />}
                                {(n.title || '').includes('אישור') && <CheckCircle2 size={20} />}
                                {!['משימה', 'הצעה', 'אישור'].some(k => (n.title || '').includes(k)) && <Bell size={20} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-black text-gray-900 leading-none">{n.title}</h4>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(n.created_at).toLocaleTimeString('he-IL', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">{n.message}</p>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                        <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200 shadow-inner">
                            <Bell size={32} />
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">אין התראות חדשות</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;