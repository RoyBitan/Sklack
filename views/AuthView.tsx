import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Role } from '../types';
import { Wrench, Shield, Users } from 'lucide-react';

export const AuthView = () => {
  const { login, register } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('client');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const success = await login(phone, password);
        if (!success) alert('פרטים שגויים');
      } else {
        await register(name, phone, password, role);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const RoleCard = ({ r, icon: Icon, label }: { r: Role; icon: any; label: string }) => (
    <div 
      onClick={() => setRole(r)}
      className={`
        cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
        ${role === r 
          ? 'border-blue-600 bg-blue-50 text-blue-700' 
          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50'}
      `}
    >
      <Icon size={24} className="mb-2" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Graphic */}
        <div className="bg-blue-600 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <h1 className="text-3xl font-bold mb-2 relative z-10">Sklack</h1>
          <p className="text-blue-100 relative z-10">מערכת מתקדמת לניהול מוסך</p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex-1 pb-4 text-sm font-medium transition-colors ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setIsLogin(true)}
            >
              התחברות
            </button>
            <button
              className={`flex-1 pb-4 text-sm font-medium transition-colors ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setIsLogin(false)}
            >
              הרשמה
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                 <label className="block text-sm font-medium text-gray-700 mb-1">בחר סוג משתמש</label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <RoleCard r="admin" icon={Shield} label="מנהל" />
                  <RoleCard r="staff" icon={Wrench} label="צוות" />
                  <RoleCard r="client" icon={Users} label="לקוח" />
                </div>
                <Input 
                  label="שם מלא" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </>
            )}
            
            <Input 
              label="מספר טלפון" 
              type="tel"
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
            />
            
            <Input 
              label="סיסמא" 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />

            <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
              {isLogin ? 'התחבר' : 'צור חשבון'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};