import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { AdminOverview } from './admin/AdminOverview';
import { TeacherDashboard } from './teacher/Dashboard';
import { RoleDashboard } from './portals/RoleDashboards';
import { sanitizeText } from '../utils/validation';

export const Dashboard: React.FC = () => {
  const { profile, user, normalizedRole, isAdmin, isTeacher, isStudent } = useAuth();
  const [isRegisteringPending, setIsRegisteringPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleRegisterPendingProfile = async () => {
    if (!user) return;
    setIsRegisteringPending(true);
    setStatusMessage('');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        name: sanitizeText(user.displayName || user.email?.split('@')[0] || 'University User').slice(0, 80),
        role: 'unassigned',
        status: 'inactive',
        isFirstLogin: false,
        createdAt: serverTimestamp()
      });
      setStatusMessage('Pending profile submitted. An Administrator must assign your institutional role.');
    } catch (err: any) {
      console.error('Pending profile creation failed:', err?.code || 'error', err);
      setStatusMessage('Unable to register pending profile. Contact University Administration.');
    } finally {
      setIsRegisteringPending(false);
    }
  };

  if (isAdmin) return <AdminOverview />;
  if (isTeacher) return <TeacherDashboard />;
  if (isStudent) return <Navigate to="/student-dashboard" replace />;
  if (profile?.role && normalizedRole !== 'unassigned') return <RoleDashboard />;

  return (
    <div className="flex items-center justify-center min-h-[65vh] p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] text-center">
        <div className="w-14 h-14 bg-[#27272A] dark:bg-zinc-800 text-white rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#111111] dark:text-zinc-100 mb-2">Role Assignment Pending</h2>
        <p className="text-xs text-[#52525B] dark:text-zinc-400 mb-6 leading-relaxed">
          Your account (<span className="font-mono">{user?.email}</span>) is authenticated, but no institutional role has been provisioned. Roles must be assigned by University Administration or via Firebase Console for initial Super Admin setup.
        </p>

        {statusMessage && (
          <div className="mb-5 p-3.5 bg-zinc-100 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 rounded-2xl text-xs border border-zinc-200 dark:border-zinc-700">
            {statusMessage}
          </div>
        )}

        <div className="space-y-4">
          {!profile && (
            <button
              onClick={handleRegisterPendingProfile}
              disabled={isRegisteringPending}
              className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold py-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {isRegisteringPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Create Unassigned Profile Request
            </button>
          )}

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-left space-y-1">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Account Metadata</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate font-mono">UID: {user?.uid}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Profile Record: {profile ? `Present (${profile.role})` : 'Not Created'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
