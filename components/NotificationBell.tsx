import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    type: string;
    url?: string;
    task_id?: string;
}

const NotificationBell: React.FC = () => {
    const { profile } = useAuth();
    const { navigateTo } = useApp();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // A clean notification sound
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        if (!profile?.id) return;

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }

        // Handle Deep Linking
        if (notif.url) {
            setIsOpen(false);

            // Simple hash translation or custom logic
            if (notif.url.includes('/#/status/')) {
                // Public status or customer status view
                window.location.hash = notif.url.replace('/#', '#');
            } else if (notif.url.includes('/#/task/')) {
                // Admin task view - navigate to DASHBOARD or specialized view if exists
                // For now, redirect to dashboard which might filter by taskId if implemented
                navigateTo('DASHBOARD');
            } else if (notif.url.includes('/#/appointments')) {
                navigateTo('APPOINTMENTS');
            }
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error('Failed to mark read', e);
        }
    };

    const markAllRead = async () => {
        if (!profile?.id) return;
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', profile.id)
                .eq('is_read', false);

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error('Failed to mark all read', e);
        }
    };

    useEffect(() => {
        if (!profile?.id) return;

        fetchNotifications();

        // Realtime Subscription
        const channel = supabase
            .channel('notifications_bell')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // User preferences from AppContext (user.notification_settings)
                    // Note: In a real app, you'd fetch this from the user object in useApp()
                    // Assuming defaults or fetched settings

                    // Sound alert
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.error('Audio play failed', e));
                    }

                    // Haptic feedback
                    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                        try {
                            window.navigator.vibrate([200, 100, 200]);
                        } catch (e) {
                            // Ignore vibration errors
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all duration-300"
            >
                <Bell size={22} className={unreadCount > 0 ? 'animate-bounce' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-lg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-14 left-0 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in-up origin-top-left">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-gray-900 tracking-tight">התראות</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                סמן הכל כנקרא
                            </button>
                        )}
                    </div>

                    <div className="max-h-[25rem] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell size={32} className="mx-auto text-gray-200 mb-3" />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">אין התראות חדשות</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-5 border-b border-gray-50 hover:bg-gray-50 transition-all cursor-pointer ${!n.is_read ? 'bg-blue-50/20' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                            <h4 className={`text-sm ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>
                                                {n.title}
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">
                                            {new Date(n.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


export default NotificationBell;
