import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import { Car, Users, User, QrCode, Copy, Check, Plus, Shield, ShieldCheck, UserCircle, Search, Trash2, Edit2 } from 'lucide-react';
import { formatLicensePlate } from '../utils/formatters';
import AddVehicleModal from './AddVehicleModal';
import InviteMemberModal from './InviteMemberModal';
import EditGarageCodeModal from './EditGarageCodeModal';
import LoadingSpinner from './LoadingSpinner';
import { UserRole, MembershipStatus } from '../types';
import QRCode from 'qrcode';

type GarageTab = 'VEHICLES' | 'TEAM' | 'CUSTOMERS';

const GarageView: React.FC = () => {
    const { profile } = useAuth();
    const { vehicles, loading: dataLoading, refreshData, removeVehicle } = useData();
    const [activeTab, setActiveTab] = useState<GarageTab>('VEHICLES');
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showEditCodeModal, setShowEditCodeModal] = useState(false);
    const [orgMembers, setOrgMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        if (activeTab === 'TEAM' || activeTab === 'CUSTOMERS') {
            fetchMembers();
        }
        // Generate QR code whenever garage_code is available
        if (profile?.organization?.garage_code) {
            QRCode.toDataURL(profile.organization.garage_code, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            }).then(setQrCodeUrl).catch(console.error);
        }
    }, [activeTab, profile?.org_id, profile?.organization?.garage_code]);

    const fetchMembers = async () => {
        if (!profile?.org_id) return;
        setLoadingMembers(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('org_id', profile.org_id)
                .order('created_at', { ascending: false });
            if (data) setOrgMembers(data);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleCopyCode = async () => {
        const garageCode = profile?.organization?.garage_code;
        if (garageCode) {
            try {
                await navigator.clipboard.writeText(garageCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = garageCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        }
    };

    const handleCodeUpdateSuccess = async (newCode: string) => {
        // Regenerate QR code with new code
        try {
            const newQrUrl = await QRCode.toDataURL(newCode, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            setQrCodeUrl(newQrUrl);

            // Refresh profile to get updated garage code
            window.location.reload();
        } catch (error) {
            console.error('Error regenerating QR code:', error);
        }
    };

    // Filtered lists
    const filteredVehicles = vehicles.filter(v =>
        v.plate.includes(searchQuery) || v.model.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const teamMembers = orgMembers.filter(m =>
        (m.role === UserRole.SUPER_MANAGER || m.role === UserRole.DEPUTY_MANAGER || m.role === UserRole.TEAM) &&
        m.membership_status === MembershipStatus.APPROVED
    );

    const customers = orgMembers.filter(m =>
        m.role === UserRole.CUSTOMER &&
        m.membership_status === MembershipStatus.APPROVED
    );

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case UserRole.SUPER_MANAGER:
            case UserRole.DEPUTY_MANAGER:
                return (
                    <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <ShieldCheck size={12} /> מנהל
                    </span>
                );
            case UserRole.TEAM:
                return (
                    <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <Users size={12} /> עובד
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <User size={12} /> לקוח
                    </span>
                );
        }
    };

    if (dataLoading && activeTab === 'VEHICLES') return <LoadingSpinner message="טוען נתונים..." />;

    return (
        <div className="space-y-6 animate-fade-in-up pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1">
                        מוסך {profile?.organization?.name || 'שלי'}
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                        ניהול כולל של הרכבים, הצוות והלקוחות
                    </p>
                </div>
            </div>

            {/* QR Code Section - ALWAYS VISIBLE AT TOP */}
            <div className="bg-gradient-to-br from-black via-gray-900 to-black rounded-[2rem] p-8 md:p-10 text-white relative overflow-hidden border border-gray-800">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    {/* QR Code */}
                    {qrCodeUrl && (
                        <div className="bg-white p-4 rounded-2xl shadow-2xl">
                            <img
                                src={qrCodeUrl}
                                alt="QR Code"
                                className="w-48 h-48"
                            />
                        </div>
                    )}

                    {/* Garage Code Display */}
                    <div className="space-y-3 w-full max-w-md">
                        <div className="flex items-center justify-center gap-2 text-blue-400 font-black text-xs uppercase tracking-[0.2em]">
                            <QrCode size={16} />
                            קוד המוסך
                        </div>

                        <div className="relative">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="font-mono text-4xl font-black tracking-[0.3em] text-white">
                                    {profile?.organization?.garage_code || '-----'}
                                </div>
                            </div>

                            {/* Edit Button - Only for Super Managers */}
                            {profile?.role === UserRole.SUPER_MANAGER && (
                                <button
                                    onClick={() => setShowEditCodeModal(true)}
                                    className="absolute -top-2 -left-2 bg-white text-black p-2 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                                    title="ערוך קוד מוסך"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopyCode}
                            className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-xl py-3 px-6 font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            {copied ? (
                                <>
                                    <Check size={18} className="text-green-400" />
                                    <span>הועתק!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    <span>העתק קוד</span>
                                </>
                            )}
                        </button>

                        {/* Hebrew Caption */}
                        <p className="text-white/60 text-sm font-bold leading-relaxed px-4">
                            סרוק את הברקוד או הזן את קוד המוסך כדי להצטרף
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end">
                {activeTab === 'VEHICLES' && (
                    <button
                        onClick={() => setShowAddVehicle(true)}
                        className="btn-primary flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus size={20} />
                        <span>הוסף רכב</span>
                    </button>
                )}
                {activeTab === 'TEAM' && (
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="btn-primary flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus size={20} />
                        <span>הזמן איש צוות</span>
                    </button>
                )}
                {activeTab === 'CUSTOMERS' && (
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="btn-primary flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus size={20} />
                        <span>הזמן לקוח</span>
                    </button>
                )}
            </div>

            {/* Sub Navigation */}
            <div className="bg-white p-1.5 rounded-2xl flex shadow-sm border border-gray-100 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('VEHICLES')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap px-4 ${activeTab === 'VEHICLES' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <Car size={18} />
                    רכבים ({vehicles.length})
                </button>
                <button
                    onClick={() => setActiveTab('TEAM')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap px-4 ${activeTab === 'TEAM' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <Shield size={18} />
                    צוות ({teamMembers.length})
                </button>
                <button
                    onClick={() => setActiveTab('CUSTOMERS')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap px-4 ${activeTab === 'CUSTOMERS' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    <Users size={18} />
                    לקוחות ({customers.length})
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[500px] p-6 md:p-8">

                {/* VEHICLES TAB */}
                {activeTab === 'VEHICLES' && (
                    <div className="space-y-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="חיפוש לפי מספר רישוי או דגם..."
                                className="input-premium pl-12 h-14 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredVehicles.map(v => (
                                <div key={v.id} className="group border-2 border-gray-50 hover:border-black rounded-[2rem] p-6 transition-all duration-300 hover:shadow-lg relative bg-gray-50/50 hover:bg-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-yellow-400 border border-black px-3 py-1 rounded-lg text-black font-mono font-black tracking-widest text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            {formatLicensePlate(v.plate)}
                                        </div>
                                        <button
                                            onClick={() => { if (window.confirm('למחוק רכב זה?')) removeVehicle(v.plate); }}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <h3 className="font-black text-lg text-gray-900 mb-1">{v.model}</h3>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <span>{v.year}</span>
                                        <span>•</span>
                                        <span>{v.color}</span>
                                    </div>
                                    {/* @ts-ignore */}
                                    {v.owner && (
                                        <div className="mt-4 flex items-center gap-2 py-2 px-3 bg-white rounded-xl border border-gray-100 w-fit">
                                            <UserCircle size={16} className="text-gray-400" />
                                            <span className="text-xs font-bold text-gray-600">{v.owner.full_name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {filteredVehicles.length === 0 && (
                                <div className="col-span-full text-center py-20 text-gray-400">
                                    לא נמצאו רכבים
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TEAM TAB */}
                {activeTab === 'TEAM' && (
                    <div className="space-y-6">
                        {/* Team Members List */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-gray-900 px-2">חברי הצוות ({teamMembers.length})</h3>

                            {loadingMembers ? (
                                <div className="text-center py-12 text-gray-400">טוען...</div>
                            ) : teamMembers.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-gray-400 font-bold">אין עדיין חברי צוות</p>
                                </div>
                            ) : (
                                teamMembers.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-md">
                                                {member.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900">{member.full_name || 'ללא שם'}</div>
                                                <div className="text-xs text-gray-500 font-bold">{member.phone}</div>
                                            </div>
                                        </div>
                                        {getRoleBadge(member.role)}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* CUSTOMERS TAB */}
                {activeTab === 'CUSTOMERS' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customers.map(member => (
                                <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all">
                                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center font-black text-lg">
                                        {member.full_name?.charAt(0) || 'C'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{member.full_name || 'ללא שם'}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{member.phone || 'ללא טלפון'}</div>
                                    </div>
                                    <div>
                                        {getRoleBadge(member.role)}
                                    </div>
                                </div>
                            ))}
                            {customers.length === 0 && (
                                <div className="col-span-full text-center py-20 bg-gray-50 rounded-2xl">
                                    <User size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-gray-400 font-bold">עדיין אין לקוחות רשומים</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddVehicle && (
                <AddVehicleModal
                    onClose={() => setShowAddVehicle(false)}
                    onSuccess={() => { refreshData(); }}
                />
            )}
            {showInviteModal && (
                <InviteMemberModal
                    onClose={() => setShowInviteModal(false)}
                />
            )}
            {showEditCodeModal && profile?.organization?.garage_code && (
                <EditGarageCodeModal
                    currentCode={profile.organization.garage_code}
                    onClose={() => setShowEditCodeModal(false)}
                    onSuccess={handleCodeUpdateSuccess}
                />
            )}
        </div>
    );
};

export default GarageView;
