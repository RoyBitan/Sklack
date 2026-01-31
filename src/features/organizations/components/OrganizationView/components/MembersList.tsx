import React from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Shield,
} from "lucide-react";
import { Invitation, Profile, UserRole } from "@/types";

interface MembersListProps {
  members: Profile[];
  isManager: boolean;
  expandedMember: string | null;
  setExpandedMember: (id: string | null) => void;
  promoteToAdmin: (id: string) => Promise<void>;
  invitePhone: string;
  setInvitePhone: (phone: string) => void;
  handleInvite: (e?: React.FormEvent) => void;
  loading: boolean;
}

export const MembersList: React.FC<MembersListProps> = ({
  members,
  isManager,
  expandedMember,
  setExpandedMember,
  promoteToAdmin,
  invitePhone,
  setInvitePhone,
  handleInvite,
  loading,
}) => {
  return (
    <div className="card-premium p-12 overflow-hidden relative">
      <div className="flex items-center justify-between mb-12">
        <h3 className="text-3xl font-black flex items-center gap-6">
          <Shield size={36} className="text-black" />
          <span className="tracking-tighter">צוות ולקוחות</span>
        </h3>
        {isManager && (
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="050-0000000"
              className="input-premium py-2 px-4 h-12 text-sm"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
            />
            <button
              onClick={handleInvite}
              disabled={loading || !invitePhone.trim()}
              className="bg-black text-white px-6 rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all"
            >
              הזמן למוסך
            </button>
          </div>
        )}
      </div>
      <div className="space-y-6">
        {members.length === 0
          ? (
            <div className="text-center py-10 text-gray-400 font-black uppercase tracking-widest">
              אין חברים להצגה
            </div>
          )
          : members.map((member) => (
            <div key={member.id} className="flex flex-col w-full">
              <div
                className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 hover:bg-white hover:shadow-xl transition-all duration-300 group/row cursor-pointer"
                onClick={() =>
                  setExpandedMember(
                    expandedMember === member.id ? null : member.id,
                  )}
              >
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center font-black text-2xl shadow-xl transition-transform group-hover/row:scale-110">
                    {member.full_name?.[0]}
                  </div>
                  <div className="text-center md:text-right">
                    <div className="font-black text-2xl tracking-tight text-gray-900">
                      {member.full_name}
                    </div>
                    <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                      {member.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-6 py-2 ${
                      member.role === UserRole.CUSTOMER
                        ? "bg-blue-50 text-blue-600 border-blue-100"
                        : "bg-green-50 text-green-600 border-green-100"
                    } text-[10px] font-black rounded-full uppercase tracking-widest border shadow-sm`}
                  >
                    {member.role === UserRole.CUSTOMER ? "Client" : "Staff"}
                  </span>
                  {isManager && member.role === UserRole.STAFF && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(`האם לקדם את ${member.full_name} למנהל?`)
                        ) {
                          promoteToAdmin(member.id);
                        }
                      }}
                      className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-blue-700 shadow-md active:scale-95 transition-all"
                      title="קדם למנהל"
                    >
                      <Shield size={14} /> קדם
                    </button>
                  )}
                  {expandedMember === member.id
                    ? <ChevronUp size={20} className="text-gray-300" />
                    : <ChevronDown size={20} className="text-gray-300" />}
                </div>
              </div>

              {expandedMember === member.id && (
                <div className="mt-4 p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] animate-fade-in-up space-y-8">
                  {/* Admin Power: Promote Staff */}
                  {isManager && member.role === UserRole.STAFF && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-blue-50 rounded-[1.8rem] border border-blue-100">
                      <div className="text-start">
                        <div className="font-black text-blue-900">
                          קידום למנהל
                        </div>
                        <div className="text-xs text-blue-700/60 font-bold">
                          הענק למשתמש זה גישה מלאה ללוח הבקרה והניהול
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(`האם לקדם את ${member.full_name} למנהל?`)
                          ) {
                            promoteToAdmin(member.id);
                          }
                        }}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
                      >
                        <Shield size={18} /> קדם למנהל
                      </button>
                    </div>
                  )}

                  {/* Document Management Section */}
                  {isManager && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">
                        <FileText size={14} /> מסמכי לקוח / עובד
                      </div>

                      {member.documents &&
                          Object.keys(member.documents).length > 0
                        ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(
                              member.documents as Record<string, string>,
                            ).map(([type, url]) => (
                              <div
                                key={type}
                                className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col gap-4"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {type}
                                  </div>
                                  <div className="flex gap-2">
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 bg-white rounded-lg shadow-sm hover:scale-110 transition-transform"
                                      title="צפה"
                                    >
                                      <ExternalLink size={16} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                        : (
                          <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              לא נמצאו מסמכים
                            </span>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};
