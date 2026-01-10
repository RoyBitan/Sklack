import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Bell, Clock, Briefcase, Car, AlertCircle, CheckCircle2 } from 'lucide-react';

const NotificationsView: React.FC = () => {
  const { notifications, user, t } = useApp();

  const myNotifications = notifications.filter(n => 
    n.recipientId === user?.id || (n.recipientRole?.includes(user?.role!))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Bell className="text-black" />
            התראות
          </h2>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
            {myNotifications.length} הודעות
          </span>
      </div>

      <div className="space-y-3">
          {myNotifications.length > 0 ? myNotifications.map(n => (
              <div key={n.id} className={`p-5 rounded-[1.5rem] border transition-all ${n.read ? 'bg-white border-gray-100 opacity-80' : 'bg-white border-black shadow-md'}`}>
                  <div className="flex gap-4">
                      <div className={`mt-1 p-3 rounded-2xl ${
                          n.title.includes('משימה') ? 'bg-blue-50 text-blue-600' :
                          n.title.includes('הצעה') ? 'bg-orange-50 text-orange-600' :
                          n.title.includes('אישור') ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                      }`}>
                          {n.title.includes('משימה') && <Briefcase size={20} />}
                          {n.title.includes('הצעה') && <AlertCircle size={20} />}
                          {n.title.includes('אישור') && <CheckCircle2 size={20} />}
                          {!['משימה', 'הצעה', 'אישור'].some(k => n.title.includes(k)) && <Bell size={20} />}
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                              <h4 className="font-black text-gray-900 leading-none">{n.title}</h4>
                              <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(n.timestamp).toLocaleTimeString('he-IL', { hour12: false, hour: '2-digit', minute: '2-digit' })}
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