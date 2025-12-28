import React from 'react';
import { AppProvider, useStore } from './store';
import { AuthView } from './views/AuthView';
import { AdminDashboard } from './views/AdminDashboard';
import { StaffDashboard } from './views/StaffDashboard';
import { ClientDashboard } from './views/ClientDashboard';
import { Layout } from './components/Layout';
import { User } from './types';
import { RefreshCw, Code2 } from 'lucide-react';

const AppContent = () => {
  const { currentUser, users, devSwitchUser } = useStore();

  const renderView = () => {
    if (!currentUser) {
      return <AuthView />;
    }

    let content;
    switch (currentUser.role) {
      case 'admin':
        content = <AdminDashboard />;
        break;
      case 'staff':
        content = <StaffDashboard />;
        break;
      case 'client':
        content = <ClientDashboard />;
        break;
      default:
        content = <div>Role not recognized</div>;
    }

    return <Layout>{content}</Layout>;
  };

  return (
    <>
      {renderView()}
      <DevRoleSwitcher users={users} onSwitch={devSwitchUser} currentId={currentUser?.id || ''} />
    </>
  );
};

// Developer Tool: Floating Widget to switch users quickly
const DevRoleSwitcher = ({ users, onSwitch, currentId }: { users: User[], onSwitch: (id: string) => void, currentId: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans" dir="ltr">
      <div className={`
        bg-slate-900 text-white rounded-xl shadow-2xl p-4 transition-all duration-300 origin-bottom-left border border-slate-700
        ${isOpen ? 'scale-100 opacity-100 mb-4' : 'scale-0 opacity-0 mb-0 h-0 overflow-hidden'}
      `}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider border-b border-slate-700 pb-2">
          <Code2 size={14} />
          Dev Mode: Switch Role
        </div>
        <div className="space-y-1 min-w-[200px]">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => { onSwitch(u.id); setIsOpen(false); }}
              className={`w-full text-left text-sm px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${currentId === u.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-200'}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{u.name}</span>
                <span className="text-[10px] opacity-60 uppercase">{u.role}</span>
              </div>
              {currentId === u.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
            </button>
          ))}
        </div>
      </div>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-0 hover:gap-3 bg-slate-900 text-white p-3 rounded-full shadow-xl hover:bg-slate-800 transition-all duration-300 border border-slate-700"
        title="Developer Menu"
      >
        <RefreshCw size={24} className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : 'group-hover:rotate-90'}`} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-medium">
          Dev Mode
        </span>
      </button>
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;