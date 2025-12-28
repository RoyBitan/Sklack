import React from 'react';
import { useStore } from '../store';
import { LogOut, Settings, Menu } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, garages } = useStore();
  const currentGarage = garages.find(g => g.id === currentUser?.garageId);

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col text-right">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          <div className="flex items-center gap-4">
             {/* Logo Area */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-blue-200 shadow-lg">
                S
              </div>
              <span className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">Sklack</span>
            </div>

            {currentGarage && (
              <span className="mr-4 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100 hidden sm:inline-block">
                {currentGarage.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <div className="flex flex-col items-end mr-2">
                <span className="text-sm font-medium text-gray-900 leading-none">{currentUser?.name}</span>
                <span className="text-xs text-gray-500 mt-1">
                  {currentUser?.role === 'admin' ? 'מנהל מוסך' : currentUser?.role === 'staff' ? 'צוות טכני' : 'לקוח'}
                </span>
             </div>
             
             <button onClick={logout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="התנתק">
                <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};