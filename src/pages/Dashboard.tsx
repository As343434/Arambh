import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboard } from './admin/Dashboard';
import { TeacherDashboard } from './teacher/Dashboard';
import { StudentDashboard } from './student/Dashboard';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState('');

  const handleInitializeAdmin = async () => {
    if (!user) return;
    setIsInitializing(true);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'Initial Admin',
        role: 'admin',
        isFirstLogin: false,
        createdAt: serverTimestamp()
      });
      // The AuthContext listener will pick up the change and refresh the UI
    } catch (err: any) {
      setError(err.message || 'Failed to initialize admin role.');
    } finally {
      setIsInitializing(false);
    }
  };

  if (profile?.role === 'admin') return <AdminDashboard />;
  if (profile?.role === 'teacher') return <TeacherDashboard />;
  if (profile?.role === 'student') return <StudentDashboard />;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6">
          Your account ({user?.email}) is authenticated but has no role assigned.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleInitializeAdmin}
            disabled={isInitializing}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
          >
            {isInitializing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
            Initialize as Admin
          </button>
          
          <div className="p-4 bg-slate-50 rounded-2xl text-left">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Debug Information</p>
            <div className="space-y-1">
              <p className="text-sm text-slate-600 truncate"><strong>UID:</strong> {user?.uid}</p>
              <p className="text-sm text-slate-600"><strong>Profile Found:</strong> {profile ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400 italic">
          Click the button above to grant your current account the 'admin' role. 
          In a production environment, this would be restricted.
        </p>
      </div>
    </div>
  );
};
