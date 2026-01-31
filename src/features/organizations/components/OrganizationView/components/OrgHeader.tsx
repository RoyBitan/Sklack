import React from "react";

interface OrgHeaderProps {
  isManager: boolean;
}

export const OrgHeader: React.FC<OrgHeaderProps> = ({ isManager }) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b-4 border-black pb-12">
      <div>
        <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none mb-4">
          ניהול מוסך
        </h1>
        <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-sm">
          Organization & Team Settings
        </p>
      </div>
      {isManager && (
        <div className="bg-black text-white px-8 py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-widest shadow-xl">
          Admin Panel
        </div>
      )}
    </div>
  );
};
