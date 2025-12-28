import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Car, Clock, CheckCircle2, Wrench, AlertCircle, Plus } from 'lucide-react';
import { Job } from '../types';

export const ClientDashboard = () => {
  const { currentUser, joinGarage, vehicles, addVehicle, jobs } = useStore();
  const [joinId, setJoinId] = useState('');
  const [showAddCar, setShowAddCar] = useState(false);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');

  // 1. Join Garage Phase
  if (!currentUser?.garageId) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">שלום, {currentUser?.name}</h2>
        <p className="text-gray-500 mb-6">כדי לראות את סטטוס הרכב שלך, אנא הזן את קוד המוסך.</p>
        <div className="flex gap-2">
          <Input 
            label="" 
            placeholder="קוד מוסך (לדוגמה G-101)" 
            value={joinId} 
            onChange={e => setJoinId(e.target.value)} 
            className="flex-1"
          />
          <Button onClick={() => {
             if (!joinGarage(joinId)) alert('לא נמצא מוסך עם קוד זה');
          }}>התחבר</Button>
        </div>
      </div>
    );
  }

  // 2. Add Vehicle Phase
  const myVehicles = vehicles.filter(v => v.ownerId === currentUser.id && v.garageId === currentUser.garageId);

  if (myVehicles.length === 0 || showAddCar) {
    return (
      <div className="max-w-md mx-auto mt-8">
         <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">{myVehicles.length === 0 ? 'הוספת רכב ראשון' : 'הוספת רכב נוסף'}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              addVehicle(plate, model);
              setShowAddCar(false);
            }} className="space-y-4">
              <Input label="מספר רכב" value={plate} onChange={e => setPlate(e.target.value)} required placeholder="00-000-00" />
              <Input label="דגם רכב" value={model} onChange={e => setModel(e.target.value)} required placeholder="לדוגמה: מאזדה 3" />
              <div className="flex gap-2 mt-4">
                {myVehicles.length > 0 && <Button type="button" variant="ghost" onClick={() => setShowAddCar(false)}>ביטול</Button>}
                <Button type="submit" className="flex-1">שמור רכב</Button>
              </div>
            </form>
         </div>
      </div>
    );
  }

  // 3. View Status Phase
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">הרכבים שלי</h2>
        <Button variant="secondary" size="sm" onClick={() => setShowAddCar(true)}>
          <Plus size={16} className="ml-2" />
          הוסף רכב
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myVehicles.map(v => {
          // Find active jobs for this vehicle
          const vehicleJobs = jobs.filter(j => j.vehiclePlate === v.plate && j.garageId === currentUser.garageId);
          // Sort: active first
          vehicleJobs.sort((a, b) => (b.createdAt - a.createdAt));

          return (
            <div key={v.plate} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{v.model}</h3>
                    <div className="font-mono text-gray-500 mt-1 bg-gray-200/50 px-2 py-0.5 rounded inline-block text-sm">
                      {v.plate}
                    </div>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <Car size={20} />
                  </div>
                </div>
              </div>

              <div className="p-0 flex-1">
                {vehicleJobs.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    אין טיפולים רשומים לרכב זה
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {vehicleJobs.map(job => (
                      <JobStatusRow key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const JobStatusRow: React.FC<{ job: Job }> = ({ job }) => {
  const getStatusInfo = () => {
    switch (job.status) {
      case 'pending': return { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', text: 'ממתין לטיפול' };
      case 'in_progress': return { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50', text: 'הרכב בטיפול' };
      case 'completed': return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', text: 'הטיפול הסתיים' };
    }
  };

  const info = getStatusInfo();
  const Icon = info.icon;

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${info.bg} ${info.color}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{job.description}</p>
        <p className={`text-xs mt-0.5 ${info.color} font-medium`}>{info.text}</p>
      </div>
       <div className="text-xs text-gray-400">
          {new Date(job.createdAt).toLocaleDateString('he-IL')}
       </div>
    </div>
  );
};