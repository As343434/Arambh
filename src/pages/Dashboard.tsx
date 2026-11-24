import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { AdminOverview } from './admin/AdminOverview';
import { TeacherDashboard } from './teacher/Dashboard';
import { RoleDashboard } from './portals/RoleDashboards';

export const Dashboard: React.FC = () => {
  const { profile, user, isAdmin, isTeacher, isStudent } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState('');

  const handleInitializeSuperAdmin = async () => {
    if (!user) return;
    setIsInitializing(true);
    setError('');
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'Super Administrator',
          role: 'super_admin',
          roles: ['super_admin'],
          status: 'active',
          isFirstLogin: false,
          createdAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Super Admin role.');
    } finally {
      setIsInitializing(false);
    }
  };

  if (isAdmin) return <AdminOverview />;
  if (isTeacher) return <TeacherDashboard />;
  if (isStudent) return <Navigate to="/student-dashboard" replace />;
  if (profile?.role) return <RoleDashboard />;

  return (
    <div className="flex items-center justify-center min-h-[65vh] p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] text-center">
        <div className="w-14 h-14 bg-[#27272A] dark:bg-zinc-800 text-white rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#111111] dark:text-zinc-100 mb-2">Role Assignment Pending</h2>
        <p className="text-xs text-[#52525B] dark:text-zinc-400 mb-6 leading-relaxed">
          Your account (<span className="font-mono">{user?.email}</span>) is authenticated, but no institutional role profile has been linked yet.
        </p>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleInitializeSuperAdmin}
            disabled={isInitializing}
            className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {isInitializing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Initialize as Super Admin
          </button>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-left space-y-1">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Account Metadata</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate font-mono">UID: {user?.uid}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">Profile Record: {profile ? 'Present' : 'Not Created'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
