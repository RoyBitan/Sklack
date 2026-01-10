import React from 'react';
import { Clock, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PendingApprovalView: React.FC = () => {
    const { profile } = useAuth();

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-8 animate-fade-in-up">
            <div className="w-full max-w-2xl card-premium p-12 md:p-20 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-orange-400 to-orange-600"></div>

                <div className="flex flex-col items-center mb-12">
                    <div className="bg-orange-100 text-orange-600 p-10 rounded-[2.5rem] mb-8 shadow-xl animate-pulse-slow">
                        <Clock size={80} />
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter mb-6 leading-tight text-gray-900">
                        בקשתך ממתינה לאישור
                    </h2>
                    <p className="text-gray-500 font-bold text-lg max-w-md mx-auto leading-relaxed">
                        מנהל המוסך יאשר את הצטרפותך בקרוב. תקבל גישה מלאה למערכת לאחר האישור.
                    </p>
                </div>

                <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-6">
                    <div className="flex items-center gap-4 text-start">
                        <div className="bg-green-100 text-green-600 p-4 rounded-xl">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-black text-gray-900">בקשתך נשלחה בהצלחה</div>
                            <div className="text-xs text-gray-500 font-bold mt-1">מנהל המוסך קיבל התראה</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-start">
                        <div className="bg-blue-100 text-blue-600 p-4 rounded-xl">
                            <Shield size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-black text-gray-900">פרטיך מאובטחים</div>
                            <div className="text-xs text-gray-500 font-bold mt-1">כל המידע מוצפן ומוגן</div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-6 bg-orange-50 rounded-[1.5rem] border border-orange-100">
                    <p className="text-xs font-black text-orange-800 uppercase tracking-widest">
                        שם משתמש: {profile?.full_name}
                    </p>
                </div>

                <p className="text-xs text-gray-400 font-bold mt-8">
                    זמן המתנה משוער: 1-24 שעות
                </p>
            </div>
        </div>
    );
};

export default PendingApprovalView;
