import React, { useState } from 'react';
import { X, Edit2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditGarageCodeModalProps {
    currentCode: string;
    onClose: () => void;
    onSuccess: (newCode: string) => void;
}

const EditGarageCodeModal: React.FC<EditGarageCodeModalProps> = ({ currentCode, onClose, onSuccess }) => {
    const [newCode, setNewCode] = useState(currentCode);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Format validation
        const codePattern = /^[A-Z]{2}[0-9]{3}$/;
        if (!codePattern.test(newCode)) {
            setError('קוד חייב להיות 2 אותיות גדולות ו-3 ספרות (לדוגמה: AB123)');
            return;
        }

        if (newCode === currentCode) {
            setError('אנא בחר קוד שונה מהקוד הנוכחי');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error: rpcError } = await supabase
                .rpc('update_garage_code', { new_code: newCode });

            if (rpcError) throw rpcError;

            const result = data as { success: boolean; error?: string; code?: string };

            if (!result.success) {
                setError(result.error || 'שגיאה בעדכון הקוד');
                return;
            }

            onSuccess(result.code || newCode);
            onClose();
        } catch (err: any) {
            setError(err.message || 'שגיאה בעדכון הקוד');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (value: string) => {
        // Auto-uppercase and limit to 5 characters
        const formatted = value.toUpperCase().slice(0, 5);
        setNewCode(formatted);
        setError(''); // Clear error on input
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-black"></div>

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">עריכת קוד מוסך</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">שנה את הקוד</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                                קוד נוכחי
                            </label>
                            <div className="bg-gray-50 rounded-xl p-4 text-center font-mono text-2xl font-black tracking-[0.3em] text-gray-400">
                                {currentCode}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                                קוד חדש
                            </label>
                            <input
                                type="text"
                                required
                                className="input-premium h-16 text-center text-2xl font-mono tracking-[0.3em] uppercase"
                                placeholder="AB123"
                                value={newCode}
                                onChange={(e) => handleInputChange(e.target.value)}
                                maxLength={5}
                                pattern="[A-Z]{2}[0-9]{3}"
                            />
                            <p className="text-xs text-gray-400 mt-2 px-2 font-bold">
                                2 אותיות גדולות + 3 ספרות
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-red-600 text-sm font-bold">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-4 px-6 font-bold transition-all hover:bg-gray-200"
                            >
                                ביטול
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !newCode.trim() || newCode === currentCode}
                                className="flex-1 btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <span>שומר...</span>
                                ) : (
                                    <>
                                        <Check size={20} />
                                        <span>עדכן קוד</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditGarageCodeModal;
