import React from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { MembershipStatus, Profile } from "@/types";

interface PendingRequestsListProps {
  pendingRequests: Profile[];
  handleMembershipAction: (userId: string, status: MembershipStatus) => void;
}

export const PendingRequestsList: React.FC<PendingRequestsListProps> = ({
  pendingRequests,
  handleMembershipAction,
}) => {
  return (
    <div className="card-premium p-12 overflow-hidden relative border-orange-200 bg-orange-50">
      <h3 className="text-3xl font-black flex items-center gap-4 text-orange-900 mb-8">
        <AlertCircle size={32} className="text-orange-600" />בקשות הצטרפות
        ({pendingRequests.length})
      </h3>
      <div className="space-y-4">
        {pendingRequests.map((req) => (
          <div
            key={req.id}
            className="bg-white p-6 rounded-[1.5rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm border border-orange-100"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-start flex-1">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black shrink-0">
                {req.full_name?.[0]}
              </div>
              <div>
                <div className="font-black text-lg">{req.full_name}</div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  {req.role}
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <button
                onClick={() =>
                  handleMembershipAction(req.id, MembershipStatus.APPROVED)}
                className="w-full md:w-auto p-4 md:p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors flex items-center justify-center gap-2 font-bold md:font-normal"
              >
                <Check size={20} />
                <span className="md:hidden">אשר</span>
              </button>
              <button
                onClick={() =>
                  handleMembershipAction(req.id, MembershipStatus.REJECTED)}
                className="w-full md:w-auto p-4 md:p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2 font-bold md:font-normal"
              >
                <X size={20} />
                <span className="md:hidden">דחה</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
