import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { mapReauthPasswordError, validatePasswordStrength } from '../utils/validation';

export const ChangePassword: React.FC = () => {
  const { user, isStudent } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const strength = useMemo(
    () => validatePasswordStrength(newPassword, confirmPassword, currentPassword),
    [newPassword, confirmPassword, currentPassword]
  );

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      return setError('Current password is required to verify your identity.');
    }
    if (!strength.valid && strength.error) {
      return setError(strength.error);
    }

    setLoading(true);
    try {
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        await setDoc(doc(db, 'users', user.uid), { isFirstLogin: false }, { merge: true });
        navigate(isStudent ? '/student-dashboard' : '/dashboard', { replace: true });
      } else {
        setError('Unable to verify active account session.');
      }
    } catch (err: any) {
      console.error('Password change error:', err?.code || 'password_error', err);
      setError(mapReauthPasswordError(err));
    } finally {
      setLoading(false);
    }
  };

  const progressPct = Math.min(100, Math.round((strength.score / strength.checks.length) * 100));

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#111111] dark:text-zinc-100">Security Update Required</h2>
          <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1.5">
            Verify your current password and set a strong replacement password before continuing.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#3F3F46] dark:text-zinc-300 mb-1.5">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                maxLength={128}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Enter current password"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F3F46] dark:text-zinc-300 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Minimum 8 characters (12+ recommended)"
              />
            </div>
          </div>

          {/* Live Password Strength Meter & Checklist */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#52525B] dark:text-zinc-400">Password Strength</span>
              <span className="font-mono font-bold text-[#111111] dark:text-zinc-100">{strength.strengthLabel}</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#111111] dark:bg-white transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <ul className="space-y-1 pt-1">
              {strength.checks.map(check => (
                <li
                  key={check.id}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    check.met ? 'text-[#111111] dark:text-zinc-100 font-medium' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${check.met ? 'text-[#111111] dark:text-white' : 'text-zinc-300 dark:text-zinc-600'}`} />
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F3F46] dark:text-zinc-300 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Repeat new password"
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
