import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Wrench, CheckCircle2, Play, Car, User } from 'lucide-react';
import { Job } from '../types';

export const StaffDashboard = () => {
  const { currentUser, joinGarage, jobs, assignJob, updateJobStatus } = useStore();
  const [joinId, setJoinId] = useState('');

  // If not in a garage yet
  if (!currentUser?.garageId) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wrench size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">חיבור למוסך</h2>
        <p className="text-gray-500 mb-6">הזן את קוד המוסך שקיבלת מהמנהל כדי להתחיל לעבוד.</p>
        <div className="flex gap-2">
          <Input 
            label="" 
            placeholder="קוד מוסך" 
            value={joinId} 
            onChange={e => setJoinId(e.target.value)} 
            className="flex-1"
          />
          <Button onClick={() => {
            if(joinGarage(joinId)) {
               // Success handled by state update
            } else {
              alert('קוד מוסך לא נמצא');
            }
          }}>הצטרף</Button>
        </div>
      </div>
    );
  }

  const myJobs = jobs.filter(j => j.garageId === currentUser.garageId);
  const availableJobs = myJobs.filter(j => j.status === 'pending');
  const myActiveJobs = myJobs.filter(j => j.assignedTo === currentUser.id && j.status === 'in_progress');
  const history = myJobs.filter(j => j.assignedTo === currentUser.id && j.status === 'completed');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Column 1: Available Jobs */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-sm">{availableJobs.length}</span>
          עבודות פנויות
        </h2>
        {availableJobs.length === 0 && (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
            אין עבודות חדשות כרגע
          </div>
        )}
        {availableJobs.map(job => (
          <JobCard 
            key={job.id} 
            job={job} 
            action={
              <Button size="sm" onClick={() => assignJob(job.id)} className="w-full">
                <Play size={16} className="ml-2" />
                קח עבודה
              </Button>
            }
          />
        ))}
      </div>

      {/* Column 2: My Active Jobs */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
           <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm">{myActiveJobs.length}</span>
           בעבודה שלי
        </h2>
        {myActiveJobs.length === 0 && (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
            אינך עובד על רכב כרגע
          </div>
        )}
        {myActiveJobs.map(job => (
          <JobCard 
            key={job.id} 
            job={job} 
            isActive
            action={
              <Button 
                variant="secondary" 
                onClick={() => updateJobStatus(job.id, 'completed')}
                className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                <CheckCircle2 size={16} className="ml-2" />
                סמן כבוצע
              </Button>
            }
          />
        ))}
      </div>

      {/* Column 3: Recent History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 text-gray-400">היסטוריה (היום)</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            {history.length === 0 && (
                 <div className="p-6 text-center text-gray-400 text-sm">טרם סיימת עבודות היום</div>
            )}
            {history.map(job => (
              <div key={job.id} className="p-4 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                 <div>
                    <div className="font-mono font-bold text-gray-800">{job.vehiclePlate}</div>
                    <div className="text-sm text-gray-500 truncate max-w-[150px]">{job.description}</div>
                 </div>
                 <div className="bg-green-100 text-green-700 p-1.5 rounded-full">
                    <CheckCircle2 size={16} />
                 </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

interface JobCardProps { 
  job: Job; 
  action: React.ReactNode; 
  isActive?: boolean; 
}

const JobCard: React.FC<JobCardProps> = ({ job, action, isActive }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border transition-shadow hover:shadow-md ${isActive ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'}`}>
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-md">
        <Car size={14} className="text-gray-500" />
        <span className="font-mono font-bold text-gray-800">{job.vehiclePlate}</span>
      </div>
      <span className="text-xs text-gray-400">
        {new Date(job.createdAt).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}
      </span>
    </div>
    <h3 className="font-medium text-gray-800 mb-4">{job.description}</h3>
    {action}
  </div>
);