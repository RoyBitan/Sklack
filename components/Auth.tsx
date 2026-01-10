import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, ArrowLeft, Briefcase, Users, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SklackLogo from './SklackLogo';
import { UserRole } from '../types';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.SUPER_MANAGER);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (isLogin) {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (authError) throw authError;
            } else {
                const { data, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: selectedRole
                        }
                    }
                });
                if (authError) throw authError;

                if (data.user) {
                    setMessage('נרשמת בהצלחה! בדוק את הדוא"ל שלך לאישור החשבון.');
                }
            }
        } catch (err: any) {
            setError(err.message || 'אירעה שגיאה בתהליך ההתחברות');
        } finally {
            setLoading(false);
        }
    };

    const RoleOption = ({ role, icon: Icon, label, desc }: { role: UserRole, icon: any, label: string, desc: string }) => (
        <button
            type="button"
            onClick={() => setSelectedRole(role)}
            className={`flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all w-full ${selectedRole === role
                ? 'bg-black text-white border-black shadow-xl scale-105'
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                }`}
        >
            <Icon size={24} />
            <div className="text-sm font-black tracking-tight">{label}</div>
            <div className={`text-[9px] font-bold uppercase tracking-widest ${selectedRole === role ? 'text-gray-400' : 'text-gray-300'}`}>{desc}</div>
        </button>
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8f9fa] font-heebo">
            <div className="w-full max-w-xl card-premium p-10 md:p-14 animate-fade-in-up relative overflow-hidden">
                {/* Decorative Blur */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-black/5 rounded-full blur-3xl"></div>

                <div className="flex flex-col items-center mb-12 relative z-10 text-center">
                    <div className="bg-black text-white p-6 rounded-[2rem] mb-8 shadow-2xl transition-transform hover:scale-110">
                        <SklackLogo size={64} />
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter mb-3">Sklack</h2>
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.3em]">
                        Garage Management OS
                    </p>
                </div>

                <div className="flex bg-gray-100 p-2 rounded-[1.8rem] mb-10 border border-gray-200/30 relative z-10">
                    <button
                        onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                        className={`flex-1 flex items-center justify-center gap-3 h-14 rounded-2xl font-black transition-all duration-300 ${isLogin ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LogIn size={20} /> כניסה
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                        className={`flex-1 flex items-center justify-center gap-3 h-14 rounded-2xl font-black transition-all duration-300 ${!isLogin ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <UserPlus size={20} /> הרשמה
                    </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-8 relative z-10">
                    {!isLogin && (
                        <div className="animate-fade-in-up space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-3 px-2 uppercase tracking-widest text-start">בחר סוג משתמש</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <RoleOption role={UserRole.SUPER_MANAGER} icon={Briefcase} label="מנהל" desc="פתיחת מוסך" />
                                    <RoleOption role={UserRole.EMPLOYEE} icon={Users} label="עובד" desc="הצטרפות לצוות" />
                                    <RoleOption role={UserRole.CUSTOMER} icon={User} label="לקוח" desc="מעקב אישי" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">שם מלא</label>
                                <input
                                    type="text"
                                    required
                                    className="input-premium"
                                    placeholder="ישראל ישראלי"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">דוא"ל</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                className="input-premium ltr pr-16"
                                placeholder="name@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <Mail className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-2 px-2 uppercase tracking-widest text-start">סיסמה</label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="input-premium ltr pr-16"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-5 rounded-[1.5rem] flex items-start gap-4 border border-red-100 animate-shake">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <p className="text-xs font-black leading-relaxed">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-50 text-green-600 p-5 rounded-[1.5rem] flex items-center gap-4 border border-green-100 animate-fade-in-up">
                            <p className="text-xs font-black">{message}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-4 text-xl py-5 tracking-tight group"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span>{isLogin ? 'היכנס למערכת' : 'המשך בתהליך'}</span>
                                <ArrowLeft size={24} className="group-hover:-translate-x-2 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center relative z-10">
                    <button className="text-[10px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-[0.2em]">
                        שכחת סיסמה? אפס עכשיו
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
