import React, { useState } from 'react';
import { Vehicle } from '../types';
import { Trash2, Sparkles, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { formatLicensePlate } from '../utils/formatters';

interface VehicleCardProps {
    vehicle: Vehicle;
    onDelete: () => void;
    onCheckIn: () => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onDelete, onCheckIn }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group h-full">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="text-start">
                        <div className="bg-yellow-400 border-2 border-black rounded-lg px-3 py-1.5 inline-block shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 group-hover:-translate-y-1 transition-transform">
                            <span className="font-mono text-sm font-black tracking-widest text-black" dir="ltr">
                                {formatLicensePlate(vehicle.plate)}
                            </span>
                        </div>
                        <h4 className="font-black text-xl text-gray-900">{vehicle.model}</h4>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                            {vehicle.year} • {vehicle.color}
                        </p>
                    </div>
                    <button
                        onClick={onDelete}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="מחק רכב"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                {/* Quick Toggle for Details */}
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors mb-4"
                >
                    {showDetails ? 'פחות פרטים' : 'פרטים נוספים'}
                    {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Expanded Details */}
                {showDetails && (
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3 text-start animate-fade-in text-xs border border-gray-100">
                        <div>
                            <span className="block text-gray-400 text-[10px] font-bold">קודנית</span>
                            <span className="font-mono font-bold text-gray-700">{vehicle.kodanit || '---'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-400 text-[10px] font-bold">מנוע</span>
                            <span className="font-mono font-bold text-gray-700">{vehicle.engine_model || '---'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-400 text-[10px] font-bold">VIN</span>
                            <span className="font-mono font-bold text-gray-700 truncate" title={vehicle.vin || ''}>{vehicle.vin || '---'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-400 text-[10px] font-bold">טסט עד</span>
                            <span className="font-mono font-bold text-gray-700" dir="ltr">{vehicle.registration_valid_until || '---'}</span>
                        </div>
                        <div>
                            <span className="block text-gray-400 text-[10px] font-bold">דלק</span>
                            <span className="font-bold text-gray-700">{vehicle.fuel_type || '---'}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-2">
                <button
                    onClick={onCheckIn}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95"
                >
                    <Sparkles size={16} /> צ'ק-אין / הזמן תור
                </button>
            </div>
        </div>
    );
};

export default VehicleCard;
