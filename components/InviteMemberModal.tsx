import React, { useState } from 'react';
import { X, Copy, Check, Users, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InviteMemberModalProps {
    onClose: () => void;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ onClose }) => {
    const { profile } = useAuth();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (profile?.org_id) {
            navigator.clipboard.writeText(profile.org_id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                {/* Decorative */}
                <div className="absolute top-0 left-0 w-full h-2 bg-black"></div>

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">הזמן חבר צוות</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">שתף את מזהה המוסך</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col items-center text-center gap-6 mb-8 relative overflow-hidden">
                        <div className="w-20 h-20 bg-white text-black rounded-[1.5rem] flex items-center justify-center shadow-xl">
                            <Shield size={40} />
                        </div>

                        <div>
                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">מזהה המוסך שלך (Garage ID)</div>
                            <div className="font-mono text-2xl font-black text-gray-900 tracking-widest break-all">
                                {profile?.org_id}
                            </div>
                        </div>

                        <div className="w-full h-full absolute inset-0 border-2 border-black/5 rounded-[2rem] pointer-events-none"></div>
                    </div>

                    <button
                        onClick={handleCopy}
                        className={`btn-primary w-full flex items-center justify-center gap-4 text-lg py-5 transition-all ${copied ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : ''}`}
                    >
                        {copied ? (
                            <>
                                <Check size={24} />
                                <span>הועתק בהצלחה!</span>
                            </>
                        ) : (
                            <>
                                <Copy size={24} />
                                <span>העתק מזהה</span>
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-6 font-bold leading-relaxed">
                        שלח את המזהה לעובד שלך ובקש ממנו להזין אותו<br />
                        במסך ההרשמה תחת "הצטרפות למוסך קיים".
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
