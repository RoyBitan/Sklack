import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Language, UserRole } from '../types';
import { User, Shield, Info, Globe, Bell, Lock, Mail, Bug, FileText, LogOut, ChevronRight, Edit2, Plus } from 'lucide-react';
import { isValidPhone, normalizePhone } from '../utils/phoneUtils';
import { sanitize } from '../utils/formatters';
import { compressImage, uploadAsset } from '../utils/assetUtils';
import LoadingSpinner from './LoadingSpinner';

const LANGUAGE_LABELS: Record<string, string> = {
    [Language.HEBREW]: 'עברית (Hebrew)',
    [Language.ENGLISH]: 'English',
    [Language.ARABIC]: 'العربية (Arabic)',
    [Language.RUSSIAN]: 'Русский (Russian)',
    [Language.CHINESE]: '中文 (Chinese)',
    [Language.THAI]: 'ไทย (Thai)',
    [Language.HINDI]: 'हिन्दी (Hindi)'
};

// Sub-component to handle edit state
const ProfileEditForm: React.FC<{ user: any }> = ({ user }) => {
    const { updateUser } = useData();
    const { refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [secondaryPhone, setSecondaryPhone] = useState(user?.secondary_phone || '');
    const [showSecondary, setShowSecondary] = useState(!!user?.secondary_phone);
    const [address, setAddress] = useState(user?.address || '');
    const [nationalId, setNationalId] = useState(user?.national_id || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);

        // Validation
        if (!fullName.trim()) {
            setMessage({ type: 'error', text: 'נא להזין שם מלא' });
            setLoading(false);
            return;
        }

        const normalizedPhone = normalizePhone(phone);
        if (!isValidPhone(normalizedPhone)) {
            setMessage({ type: 'error', text: 'מספר טלפון ראשי לא תקין' });
            setLoading(false);
            return;
        }

        if (secondaryPhone) {
            const normalizedSecondary = normalizePhone(secondaryPhone);
            if (!isValidPhone(normalizedSecondary)) {
                setMessage({ type: 'error', text: 'מספר טלפון משני לא תקין' });
                setLoading(false);
                return;
            }
        }

        try {
            await updateUser(user.id, {
                full_name: sanitize(fullName),
                phone: normalizedPhone,
                secondary_phone: secondaryPhone ? normalizePhone(secondaryPhone) : null,
                address: sanitize(address),
                national_id: sanitize(nationalId)
            });
            setMessage({ type: 'success', text: 'הפרטים עודכנו בהצלחה' });
            await refreshProfile();
        } catch (err: any) {
            console.error(err);
            setMessage({ type: 'error', text: 'שגיאה בעדכון הפרטים' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">שם מלא</label>
                <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="שם מלא"
                />
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">טלפון נייד</label>
                    <input
                        type="tel"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="050-0000000"
                    />
                </div>

                <div>
                    {!secondaryPhone && !showSecondary && (
                        <button
                            onClick={() => setShowSecondary(true)}
                            className="text-blue-600 font-bold text-xs flex items-center gap-2 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        >
                            <Plus size={16} /> הוסף טלפון נוסף
                        </button>
                    )}

                    {(secondaryPhone || showSecondary) && (
                        <div className="animate-fade-in-up">
                            <label className="text-xs font-bold text-gray-500 block mb-1.5 flex justify-between">
                                <span>טלפון נוסף</span>
                                <button onClick={() => { setSecondaryPhone(''); setShowSecondary(false); }} className="text-red-500 text-[10px]">הסר</button>
                            </label>
                            <input
                                type="tel"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                                value={secondaryPhone}
                                onChange={e => setSecondaryPhone(e.target.value)}
                                placeholder="נוסף"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">כתובת מגורים</label>
                <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="עיר, רחוב, מספר בית"
                />
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">דואר אלקטרוני</label>
                <input
                    type="email"
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                    // Use useAuth hook for authenticated email
                    value={useAuth().user?.email || ''}
                    placeholder="email@example.com"
                />
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">ת.ז (National ID)</label>
                <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="123456789"
                />
            </div>

            {message && (
                <div className={`text-xs font-bold ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.text}
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
            >
                {loading ? 'שומר...' : 'עדכן פרטים'}
            </button>
        </div>
    );
}

const SettingsView: React.FC = () => {
    const { user, t, language, switchLanguage } = useApp();
    const { profile, signOut, loading: authLoading } = useAuth();
    const [pushEnabled, setPushEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingPush, setCheckingPush] = useState(true);

    if (authLoading || !user) {
        return <LoadingSpinner message="טוען הגדרות..." />;
    }

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case UserRole.SUPER_MANAGER: return 'מנהל ראשי';
            case UserRole.STAFF: return "צוות";
            case UserRole.CUSTOMER: return "לקוח";
            default: return role;
        }
    };

    // Check if push notifications are enabled
    useEffect(() => {
        const checkPushStatus = async () => {
            if (!profile?.id) return;
            try {
                const { data } = await supabase
                    .from('push_subscriptions')
                    .select('id')
                    .eq('user_id', profile.id)
                    .maybeSingle();
                setPushEnabled(!!data);
            } catch (e) {
                console.error('Error checking push status:', e);
            } finally {
                setCheckingPush(false);
            }
        };
        checkPushStatus();
    }, [profile?.id]);

    const togglePushNotifications = async () => {
        if (!profile?.id) return;

        try {
            if (pushEnabled) {
                // Disable: Delete subscription
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('user_id', profile.id);
                setPushEnabled(false);
            } else {
                // Enable: Would need to register push subscription
                // For now, just show a message
                alert('התראות דחיפה יופעלו בקרוב');
            }
        } catch (e) {
            console.error('Error toggling push:', e);
        }
    };
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;

        try {
            setLoading(true);
            const compressed = await compressImage(file, 400, 400, 0.8);
            const fileExt = file.name.split('.').pop() || 'jpg';
            const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

            const publicUrl = await uploadAsset(compressed, 'avatars', filePath);

            await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            window.location.reload();
        } catch (err) {
            console.error('Avatar upload failed', err);
            alert('העלאת תמונה נכשלה');
        } finally {
            setLoading(false);
        }
    };

    const updateNotificationSettings = async (updates: any) => {
        if (!profile?.id) return;
        try {
            const currentSettings = user?.notification_settings || { vibrate: true, sound: 'default', events: [] };
            const newSettings = { ...currentSettings, ...updates };

            await supabase
                .from('profiles')
                .update({ notification_settings: newSettings })
                .eq('id', profile.id);

            // Refresh data via context if needed, or just rely on real-time if enabled
        } catch (e) {
            console.error('Update settings failed', e);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4 pb-8">
            {/* Profile Header */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex items-center gap-6 mb-6">
                    <div className="relative group">
                        <div className="w-24 h-24 bg-gradient-to-br from-black to-gray-700 text-white rounded-full flex items-center justify-center text-4xl font-black shadow-xl overflow-hidden">
                            {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user?.full_name?.charAt?.(0) || 'U'}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 hover:scale-110 transition-transform cursor-pointer">
                            <Edit2 size={14} className="text-black" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-black text-gray-900">{user?.full_name || 'משתמש'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold uppercase">
                                {getRoleLabel(user!.role)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Group 1: Account */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">חשבון</h3>
                </div>
                <div className="p-6">
                    <ProfileEditForm user={user} />
                </div>
                <button className="w-full px-6 py-4 flex items-center justify-between border-t border-gray-100 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <Lock size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                        <span className="font-bold text-gray-700 group-hover:text-black transition-colors">שינוי סיסמה</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </button>
            </div>

            {/* Group 2: App Settings */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">הגדרות אפליקציה</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell size={20} className="text-gray-400" />
                            <span className="font-bold text-gray-700">התראות דחיפה</span>
                        </div>
                        <div className={`w-12 h-7 rounded-full transition-all ${pushEnabled ? 'bg-green-500' : 'bg-gray-300'} relative cursor-pointer`} onClick={togglePushNotifications}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${pushEnabled ? 'right-1' : 'right-6'}`}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                        <div className="flex items-center gap-3">
                            <Bell size={20} className="text-gray-400" />
                            <span className="font-bold text-gray-700">רטט</span>
                        </div>
                        <div
                            className={`w-12 h-7 rounded-full transition-all ${user?.notification_settings?.vibrate !== false ? 'bg-green-500' : 'bg-gray-300'} relative cursor-pointer`}
                            onClick={() => updateNotificationSettings({ vibrate: !user?.notification_settings?.vibrate })}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${user?.notification_settings?.vibrate !== false ? 'right-1' : 'right-6'}`}></div>
                        </div>
                    </div>

                    <div className="border-t border-gray-50 pt-4">
                        <label className="text-xs font-bold text-gray-500 block mb-2">צליל התראה</label>
                        <select
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                            value={user?.notification_settings?.sound || 'default'}
                            onChange={(e) => updateNotificationSettings({ sound: e.target.value })}
                        >
                            <option value="default">ברירת מחדל</option>
                            <option value="bell">פעמון</option>
                            <option value="digital">דיגיטלי</option>
                        </select>
                    </div>
                </div>
                <div className="border-t border-gray-100">
                    <div className="px-6 py-3">
                        <label className="text-xs font-bold text-gray-500 block mb-2">שפה</label>
                        <select
                            value={language}
                            onChange={(e) => switchLanguage(e.target.value as Language)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        >
                            {Object.values(Language).map((lang) => (
                                <option key={lang} value={lang}>
                                    {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Group 3: Information */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">מידע</h3>
                </div>
                <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <Info size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                        <span className="font-bold text-gray-700 group-hover:text-black transition-colors">אודות Sklack</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </button>
                <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <FileText size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                        <span className="font-bold text-gray-700 group-hover:text-black transition-colors">מדיניות פרטיות</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </button>
                <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <FileText size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                        <span className="font-bold text-gray-700 group-hover:text-black transition-colors">תנאי שימוש</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </button>
            </div>

            {/* Group 4: Support */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">תמיכה</h3>
                </div>
                <a
                    href="mailto:support@sklack.com"
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group border-b border-gray-100"
                >
                    <div className="flex items-center gap-3">
                        <Mail size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                        <span className="font-bold text-gray-700 group-hover:text-black transition-colors">צור קשר עם תמיכה</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </a>
                <a
                    href="mailto:bugs@sklack.com"
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <Bug size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                        <span className="font-bold text-gray-700 group-hover:text-black transition-colors">דווח על באג</span>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                </a>
            </div>

            {/* Logout Button */}
            <button
                onClick={() => {
                    console.log('Sign out button clicked (SettingsView)');
                    signOut();
                }}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl md:rounded-3xl font-black text-base transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3 cursor-pointer touch-manipulation"
            >
                <LogOut size={22} />
                <span>התנתק</span>
            </button>

            {/* Version Info */}
            <div className="text-center py-4">
                <p className="text-xs text-gray-400 font-bold">SklackOS v2.0.1</p>
                <p className="text-xs text-gray-300 mt-1">© 2026 Sklack. All rights reserved</p>
            </div>
        </div>
    );
};

export default SettingsView;