import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Car, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { JobStatus } from '../types';

export const AdminDashboard = () => {
  const { currentUser, createGarage, jobs, addJob, users } = useStore();
  const [garageName, setGarageName] = useState('');
  const [garageIdInput, setGarageIdInput] = useState('');
  
  // Job Creation
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // If no garage, show setup
  if (!currentUser?.garageId) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ברוך הבא ל-Sklack</h2>
        <p className="text-gray-500 mb-8">כמנהל, עליך להקים סביבת מוסך חדשה כדי להתחיל.</p>
        
        <div className="space-y-4 text-right">
          <Input label="שם המוסך" value={garageName} onChange={e => setGarageName(e.target.value)} placeholder="לדוגמה: מוסך הצפון" />
          <Input label="מזהה ייחודי (ID) לחיבור צוות ולקוחות" value={garageIdInput} onChange={e => setGarageIdInput(e.target.value)} placeholder="לדוגמה: GARAGE-2024" />
          <Button 
            className="w-full"
            disabled={!garageName || !garageIdInput}
            onClick={() => createGarage(garageName, garageIdInput)}
          >
            צור סביבת מוסך
          </Button>
        </div>
      </div>
    );
  }

  // Filter jobs for this garage
  const myJobs = jobs.filter(j => j.garageId === currentUser.garageId);
  const pendingJobs = myJobs.filter(j => j.status === 'pending');
  const activeJobs = myJobs.filter(j => j.status === 'in_progress');
  const completedJobs = myJobs.filter(j => j.status === 'completed');

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    addJob(newPlate, newDesc);
    setNewPlate('');
    setNewDesc('');
    setIsAddingJob(false);
  };

  return (
    <div className="space-y-8">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm text-gray-500 font-medium">סה״כ מטלות</p>
           <p className="text-3xl font-bold text-gray-800 mt-2">{myJobs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm text-gray-500 font-medium">ממתין לטיפול</p>
           <p className="text-3xl font-bold text-orange-600 mt-2">{pendingJobs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm text-gray-500 font-medium">בטיפול כרגע</p>
           <p className="text-3xl font-bold text-blue-600 mt-2">{activeJobs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm text-gray-500 font-medium">הסתיים היום</p>
           <p className="text-3xl font-bold text-green-600 mt-2">{completedJobs.length}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">לוח עבודה</h2>
        <Button onClick={() => setIsAddingJob(true)} className="gap-2">
          <Plus size={18} />
          מטלה חדשה
        </Button>
      </div>

      {/* New Job Modal (Inline for simplicity) */}
      {isAddingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">הוספת עבודה לצוות</h3>
            <form onSubmit={handleAddJob} className="space-y-4">
              <Input 
                label="מספר רכב" 
                placeholder="00-000-00" 
                value={newPlate}
                onChange={e => setNewPlate(e.target.value)}
                required
                autoFocus
              />
              <Input 
                label="תיאור תקלה / טיפול" 
                placeholder="לדוגמה: החלפת שמן ופילטרים" 
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                required
              />
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsAddingJob(false)} className="flex-1">ביטול</Button>
                <Button type="submit" className="flex-1">שגר לצוות</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">מספר רכב</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">תיאור</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">סטטוס</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">מטפל</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">זמן יצירה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {myJobs.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="px-6 py-10 text-center text-gray-500">אין עבודות במערכת</td>
                 </tr>
              ) : myJobs.map(job => {
                const assignedStaff = users.find(u => u.id === job.assignedTo);
                return (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-800">{job.vehiclePlate}</td>
                    <td className="px-6 py-4 text-gray-600">{job.description}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {assignedStaff ? assignedStaff.name : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(job.createdAt).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: JobStatus }) => {
  const styles = {
    pending: 'bg-orange-50 text-orange-700 border-orange-100',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-100',
    completed: 'bg-green-50 text-green-700 border-green-100'
  };
  
  const labels = {
    pending: 'ממתין',
    in_progress: 'בטיפול',
    completed: 'הסתיים'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]} inline-flex items-center gap-1`}>
      {status === 'pending' && <AlertCircle size={12} />}
      {status === 'in_progress' && <Clock size={12} />}
      {status === 'completed' && <CheckCircle2 size={12} />}
      {labels[status]}
    </span>
  );
};