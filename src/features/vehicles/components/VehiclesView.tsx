import React, { useEffect, useState } from "react";
import { useAuth } from "@/features/auth";
import { supabase } from "@/services/api/client";
import { Vehicle } from "@/types";
import { Car, Plus, Search, User as UserIcon } from "lucide-react";
import { formatLicensePlate } from "@/shared/utils/formatters";
import AddVehicleModal from "./AddVehicleModal";
import { useDebounce } from "use-debounce";

const VehiclesView: React.FC = () => {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchVehicles = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("org_id", profile.org_id);

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [profile?.org_id]);

  const filteredVehicles = vehicles.filter((v) =>
    v.plate.includes(debouncedSearchQuery) ||
    v.model.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">מאגר רכבים</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
            ניהול צי הרכבים במוסך
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-3"
        >
          <Plus size={24} /> הוסף רכב
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="חיפוש לפי מספר רישוי או דגם..."
          className="input-premium pl-14"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search
          className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400"
          size={24}
        />
      </div>

      {loading
        ? (
          <div className="col-span-full text-center py-20 font-black text-gray-300 uppercase tracking-widest animate-pulse-slow">
            טוען רכבים...
          </div>
        )
        : filteredVehicles.length > 0
        ? (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden grid grid-cols-1 gap-6">
              {filteredVehicles.map((v) => (
                <div key={v.id} className="card-premium p-8 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-black group-hover:text-white transition-all duration-500">
                      <Car size={32} />
                    </div>
                    <div className="bg-[#FFE600] border-2 border-black rounded-lg px-4 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <span className="font-mono font-black text-lg tracking-widest">
                        {formatLicensePlate(v.plate)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black mb-1">{v.model}</h3>
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
                    {v.year || "-"} • {v.color || "-"}
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <UserIcon size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {v.owner_name || "לקוח מזדמן"}
                      </span>
                    </div>
                    <button className="text-[10px] font-black underline uppercase tracking-widest hover:text-blue-600 transition-colors">
                      פרטים
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden col-span-full">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      לוחית רישוי
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      דגם ושנה
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      צבע
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      VIN / שלדה
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      בעלים
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredVehicles.map((v) => (
                    <tr
                      key={v.id}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="font-mono font-black text-sm bg-[#FFE600] inline-block px-3 py-1 rounded-md border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {formatLicensePlate(v.plate)}
                        </div>
                      </td>
                      <td className="px-8 py-6 font-black text-gray-900">
                        {v.model} {v.year ? `(${v.year})` : ""}
                      </td>
                      <td className="px-8 py-6 text-sm text-gray-500">
                        {v.color || "-"}
                      </td>
                      <td className="px-8 py-6 font-mono text-xs text-gray-400">
                        {v.vin || "-"}
                      </td>
                      <td className="px-8 py-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <UserIcon size={14} className="text-gray-400" />
                          <span className="font-black text-gray-800">
                            {v.owner_name || "לקוח מזדמן"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button className="text-xs font-black underline hover:text-blue-600">
                          ערוך
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
        : (
          <div className="col-span-full card-premium p-20 text-center text-gray-300 font-black uppercase tracking-widest">
            אין רכבים רשומים במערכת
          </div>
        )}

      {showAddModal && (
        <AddVehicleModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchVehicles();
          }}
        />
      )}
    </div>
  );
};

export default VehiclesView;
