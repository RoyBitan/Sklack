import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, Plus, Users, Shield, Copy, AlertCircle, ArrowLeft, ArrowRight, LogIn, Check, X } from 'lucide-react';
import { UserRole, MembershipStatus } from '../types';

interface OrganizationViewProps {
    onboarding?: boolean;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ onboarding }) => {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const [orgName, setOrgName] = useState('');
    const [orgIdToJoin, setOrgIdToJoin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedPath, setSelectedPath] = useState<'join' | 'create' | null>(null);
    const [managerPhone, setManagerPhone] = useState(''); // New State
    const [searchMode, setSearchMode] = useState<'ID' | 'PHONE'>('ID'); // New State

    // Member Management
    const [members, setMembers] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    const isManager = profile?.role === UserRole.SUPER_MANAGER;

    useEffect(() => {
        if (profile?.org_id && !onboarding) {
            fetchMembers();
        }
    }, [profile?.org_id]);

    const fetchMembers = async () => {
        if (!profile?.org_id) return;

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('org_id', profile.org_id);

        if (data) {
            setMembers(data.filter(m => m.membership_status === MembershipStatus.APPROVED));
            setPendingRequests(data.filter(m => m.membership_status === MembershipStatus.PENDING));
        }
    };

    const handleMembershipAction = async (userId: string, status: MembershipStatus) => {
        try {
            const { error } = await supabase.from('profiles').update({ membership_status: status }).eq('id', userId);
            if (error) throw error;
            fetchMembers();
        } catch (e) {
            console.error(e);
            alert('הפעולה נכשלה');
        }
    };

    // --- CREATE Logic (Manager) ---
    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim() || !user) return;

        setLoading(true);
        setError('');

        try {
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({ name: orgName })
                .select()
                .single();

            if (orgError) throw orgError;

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    org_id: org.id,
                    role: UserRole.SUPER_MANAGER, // Auto-assign as admin
                    membership_status: MembershipStatus.APPROVED // Creator is approved automatically
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            await refreshProfile();
        } catch (err: any) {
            setError(err.message || 'כשלו ניסיונות יצירת הארגון');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- JOIN Logic (Employee/Customer) ---
    const handleJoinOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgIdToJoin.trim() || !user) return;

        setLoading(true);
        setError('');

        try {
            // 1. Verify Org Exists
            const { data: org, error: fetchError } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('id', orgIdToJoin)
                .single();

            if (fetchError || !org) {
                throw new Error('לא נמצא מוסך עם המזהה שהוזן. נא לבדוק שנית.');
            }

            // 2. Update Profile to PENDING
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    org_id: org.id,
                    membership_status: MembershipStatus.PENDING
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 3. Refresh to redirect
            await refreshProfile();

        } catch (err: any) {
            setError(err.message || 'הצטרפות למוסך נכשלה. נסה שוב.');
            setLoading(false); // Explicitly clear loading on error
        }
    };

    if (onboarding) {
        // Selection Screen - Show both options
        if (!selectedPath) {
            return (
                <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fade-in-up">
                    <div className="w-full max-w-5xl">
                        {/* Logout Button */}
                        <div className="flex justify-end mb-8">
                            <button
                                onClick={signOut}
                                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                            >
                                <ArrowLeft size={20} />
                                <span>Logout</span>
                            </button>
                        </div>

                        <div className="text-center mb-16">
                            <div className="bg-black text-white p-10 rounded-[2.5rem] mb-8 shadow-2xl inline-block">
                                <Building2 size={80} />
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter mb-4 text-gray-900">
                                ברוכים הבאים!
                            </h2>
                            <p className="text-gray-500 font-bold text-lg max-w-2xl mx-auto">
                                בחר את הפעולה המתאימה עבורך
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Join Option */}
                            <button
                                onClick={() => setSelectedPath('join')}
                                className="card-premium p-12 hover:scale-105 transition-all duration-300 group text-start"
                            >
                                <div className="bg-blue-100 text-blue-600 p-8 rounded-[2rem] mb-8 inline-block group-hover:scale-110 transition-transform">
                                    <LogIn size={48} />
                                </div>
                                <h3 className="text-3xl font-black mb-4 text-gray-900">הצטרף למוסך קיים</h3>
                                <p className="text-gray-500 font-bold leading-relaxed">
                                    יש לך מזהה מוסך? הצטרף לצוות והתחל לעבוד
                                </p>
                                <div className="mt-8 flex items-center gap-2 text-blue-600 font-black text-sm">
                                    <span>המשך</span>
                                    <ArrowRight size={20} />
                                </div>
                            </button>

                            {/* Create Option */}
                            <button
                                onClick={() => setSelectedPath('create')}
                                className="card-premium p-12 hover:scale-105 transition-all duration-300 group text-start bg-gradient-to-br from-black to-gray-800 text-white"
                            >
                                <div className="bg-white/20 p-8 rounded-[2rem] mb-8 inline-block group-hover:scale-110 transition-transform">
                                    <Plus size={48} />
                                </div>
                                <h3 className="text-3xl font-black mb-4">צור מוסך חדש</h3>
                                <p className="text-white/80 font-bold leading-relaxed">
                                    הפוך את המוסך שלך לדיגיטלי תוך פחות מדקה
                                </p>
                                <div className="mt-8 flex items-center gap-2 font-black text-sm">
                                    <span>התחל עכשיו</span>
                                    <ArrowRight size={20} />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Form Screen - Show selected form with back button
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fade-in-up">
                <div className="w-full max-w-2xl card-premium p-12 md:p-20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-3 bg-black"></div>

                    {/* Back and Logout Buttons */}
                    <div className="flex justify-between mb-8">
                        <button
                            onClick={() => setSelectedPath(null)}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                        >
                            <ArrowLeft size={20} />
                            <span>חזור</span>
                        </button>
                        <button
                            onClick={signOut}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                        >
                            <ArrowLeft size={20} />
                            <span>Logout</span>
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-16 text-center">
                        <div className="bg-black text-white p-10 rounded-[2.5rem] mb-12 shadow-2xl transition-transform hover:scale-110">
                            <Building2 size={80} />
                        </div>
                        <h2 className="text-5xl font-black tracking-tighter mb-6 leading-tight text-gray-900">
                            {selectedPath === 'create' ? 'הקמת מוסך חדש' : 'הצטרפות למוסך קיים'}
                        </h2>
                        <p className="text-gray-400 font-bold text-lg max-w-md mx-auto leading-relaxed italic">
                            {selectedPath === 'create'
                                ? 'תהליך ההקמה לוקח פחות מ-60 שניות. הפוך את המוסך שלך לדיגיטלי עוד היום.'
                                : 'הזן את המזהה (ID) שקיבלת ממנהל המוסך כדי להתחיל לעבוד.'
                            }
                        </p>
                    </div>

                    {selectedPath === 'create' ? (
                        // CREATE FORM
                        <form onSubmit={handleCreateOrg} className="space-y-12">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 mb-4 px-2 uppercase tracking-[0.3em] text-start">שם המוסך / העסק</label>
                                <input
                                    type="text"
                                    required
                                    className="input-premium h-24 text-2xl px-10"
                                    placeholder="למשל: מוסך האומנים בע''מ"
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] flex items-start gap-5 border border-red-100 animate-shake shadow-lg shadow-red-100">
                                    <AlertCircle size={28} className="shrink-0 mt-0.5" />
                                    <p className="text-lg font-black leading-tight">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !orgName.trim()}
                                className="btn-primary w-full h-24 flex items-center justify-center gap-6 text-2xl group relative overflow-hidden shadow-2xl"
                            >
                                {loading ? (
                                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>צור את המוסך שלי</span>
                                        <Plus size={32} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        // JOIN FORM
                        <form onSubmit={handleJoinOrg} className="space-y-12">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 mb-4 px-2 uppercase tracking-[0.3em] text-start">מזהה המוסך (Garage ID)</label>
                                <input
                                    type="text"
                                    required
                                    className="input-premium h-24 text-2xl px-10 font-mono tracking-widest"
                                    onChange={e => setOrgIdToJoin(e.target.value)}
                                />
                                <div className="flex justify-between mt-3 px-2">
                                    <p className="text-[10px] text-gray-400 font-bold">* בקש ממנהל המוסך את המזהה</p>
                                    <button type="button" onClick={() => setSearchMode(searchMode === 'ID' ? 'PHONE' : 'ID')} className="text-[10px] font-bold text-blue-600 underline">
                                        {searchMode === 'ID' ? 'או חפש לפי טלפון מנהל' : 'חפש לפי מזהה (ID)'}
                                    </button>
                                </div>
                                {searchMode === 'PHONE' && (
                                    <div className="mt-4 animate-fade-in-up">
                                        <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">טלפון המנהל</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="tel"
                                                className="input-premium flex-1"
                                                placeholder="050-0000000"
                                                value={managerPhone}
                                                onChange={e => setManagerPhone(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    setError('');
                                                    try {
                                                        const { data } = await supabase.rpc('get_org_by_manager_phone', { phone_text: managerPhone });
                                                        if (data && data.length > 0) {
                                                            setOrgIdToJoin(data[0].org_id); // Auto-fill first match
                                                            setSuccess(`נמצא מוסך: ${data[0].org_name}`);
                                                        } else {
                                                            setError('לא נמצא מוסך עבור מספר זה');
                                                        }
                                                    } catch (e) { setError('שגיאה בחיפוש'); }
                                                }}
                                                className="bg-black text-white px-6 rounded-[1.2rem] font-bold text-sm"
                                            >
                                                חפש
                                            </button>
                                        </div>
                                        {success && <p className="text-green-600 font-bold text-sm mt-2 px-2">{success}</p>}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] flex items-start gap-5 border border-red-100 animate-shake shadow-lg shadow-red-100">
                                    <AlertCircle size={28} className="shrink-0 mt-0.5" />
                                    <p className="text-lg font-black leading-tight">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !orgIdToJoin.trim()}
                                className="btn-primary w-full h-24 flex items-center justify-center gap-6 text-2xl group relative overflow-hidden shadow-2xl"
                            >
                                {loading ? (
                                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>הצטרף לצוות</span>
                                        <LogIn size={32} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-16 py-12 px-8 animate-fade-in-up">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b-4 border-black pb-12">
                <div>
                    <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none mb-4">ניהול מוסך</h1>
                    <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-sm">Organization & Team Settings</p>
                </div>
                {isManager && (
                    <div className="bg-black text-white px-8 py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-widest shadow-xl">
                        Admin Panel
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Org Info Card */}
                <div className="lg:col-span-2 card-premium p-12 relative group">
                    <div className="absolute top-8 right-8 text-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Building2 size={120} />
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-10 mb-12">
                        <div className="w-24 h-24 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                            <Building2 size={48} />
                        </div>
                        <div className="flex-1">
                            <div className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">שם הארגון הפעיל</div>
                            <div className="text-5xl font-black tracking-tight text-gray-900">
                                {profile?.org_id ? (success ? 'עודכן' : (profile.membership_status === MembershipStatus.PENDING ? 'בהמתנה לאישור' : (isManager ? 'המוסך של ' + profile.full_name.split(' ')[0] : 'חבר בארגון'))) : 'אין ארגון'}
                            </div>
                        </div>
                    </div>

                    <div className="p-10 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 transition-colors hover:bg-white hover:border-gray-200">
                        <div className="text-center md:text-right">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3">מזהה ארגון ייחודי (Org ID)</div>
                            <div className="font-mono text-lg font-black text-gray-400 tracking-tight">{profile?.org_id}</div>
                        </div>
                        <button
                            onClick={() => {
                                if (profile?.org_id) navigator.clipboard.writeText(profile.org_id);
                                setSuccess('הועתק');
                                setTimeout(() => setSuccess(''), 2000);
                            }}
                            className="px-10 h-16 bg-white text-black rounded-[1.2rem] shadow-xl border-2 border-black/5 hover:scale-110 active:scale-95 transition-all text-sm font-black flex items-center gap-4"
                        >
                            <Copy size={20} /> העתק מזהה
                        </button>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="card-premium p-12 flex flex-col justify-center items-center text-center group hover:bg-black hover:text-white transition-colors duration-500">
                    <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:bg-white/10 group-hover:text-white transition-colors">
                        <Users size={56} />
                    </div>
                    <div className="text-7xl font-black mb-2 tracking-tighter">{members.length}</div>
                    <div className="text-[11px] font-black text-gray-400 group-hover:text-gray-400 uppercase tracking-[0.3em]">חברים פעילים</div>
                </div>
            </div>

            {/* PENDING REQUESTS */}
            {pendingRequests.length > 0 && isManager && (
                <div className="card-premium p-12 overflow-hidden relative border-orange-200 bg-orange-50">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-3xl font-black flex items-center gap-4 text-orange-900">
                            <AlertCircle size={32} className="text-orange-600" />
                            <span className="tracking-tighter">בקשות הצטרפות ({pendingRequests.length})</span>
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black">
                                        {req.full_name[0]}
                                    </div>
                                    <div>
                                        <div className="font-black text-lg">{req.full_name}</div>
                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{req.role}</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleMembershipAction(req.id, MembershipStatus.APPROVED)}
                                        className="p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors"
                                    >
                                        <Check size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleMembershipAction(req.id, MembershipStatus.REJECTED)}
                                        className="p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIVE MEMBERS */}
            <div className="card-premium p-12 overflow-hidden relative">
                <div className="flex items-center justify-between mb-12">
                    <h3 className="text-3xl font-black flex items-center gap-6">
                        <Shield size={36} className="text-black" />
                        <span className="tracking-tighter">צוות ולקוחות</span>
                    </h3>
                    <button className="btn-primary py-4 px-8 text-sm">הזמן חבר צוות</button>
                </div>

                <div className="space-y-6">
                    {members.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 font-black uppercase tracking-widest">אין חברים להצגה</div>
                    ) : (
                        members.map(member => (
                            <div key={member.id} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 hover:bg-white hover:shadow-xl transition-all duration-300 group/row">
                                <div className="flex items-center gap-8">
                                    <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center font-black text-2xl shadow-xl transition-transform group-hover/row:scale-110">
                                        {member.full_name?.[0]}
                                    </div>
                                    <div className="text-center md:text-right">
                                        <div className="font-black text-2xl tracking-tight text-gray-900">{member.full_name}</div>
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1">{member.role}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="px-6 py-2 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-green-100 shadow-sm">
                                        {member.role === UserRole.CUSTOMER ? 'Client' : 'Staff'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizationView;