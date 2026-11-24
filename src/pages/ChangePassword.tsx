import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

export const ChangePassword: React.FC = () => {
  const { user, isStudent } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (newPassword.length < 6) {
      return setError('Password should be at least 6 characters');
    }

    setLoading(true);
    try {
      if (user) {
        await updatePassword(user, newPassword);
        await setDoc(doc(db, 'users', user.uid), { isFirstLogin: false }, { merge: true });
        navigate(isStudent ? '/student-dashboard' : '/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. You may need to re-authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#111111] dark:text-zinc-100">Security Update Required</h2>
          <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1.5">
            Please replace your initial password before continuing to your university portal.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#3F3F46] dark:text-slate-300 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F3F46] dark:text-slate-300 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
