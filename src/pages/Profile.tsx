import React, { useMemo, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { AlertCircle, Building2, CheckCircle2, Lock, Mail, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { ROLE_METADATA } from '../config/rbac';
import { PageHeader } from '../components/ui/DataUI';
import { StudentProfile } from './student/StudentProfile';
import { mapReauthPasswordError, validatePasswordStrength } from '../utils/validation';

export const Profile: React.FC = () => {
  const { profile, user, normalizedRole, isStudent } = useAuth();
  const { departments, offices, teams } = useUniversity();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const strength = useMemo(
    () => validatePasswordStrength(newPassword, confirmPassword, currentPassword),
    [newPassword, confirmPassword, currentPassword]
  );

  if (isStudent) {
    return <StudentProfile />;
  }

  const roleMeta = ROLE_METADATA[normalizedRole];
  const dept = departments.find(d => d.id === profile?.departmentId);
  const office = offices.find(o => o.id === profile?.officeId);
  const team = teams.find(t => t.id === profile?.teamId);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
        setSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError('Unable to verify active account session.');
      }
    } catch (err: any) {
      console.error('Profile password update error:', err?.code || 'password_error', err);
      setError(mapReauthPasswordError(err));
    } finally {
      setLoading(false);
    }
  };

  const progressPct = Math.min(100, Math.round((strength.score / strength.checks.length) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="My Profile & Security" subtitle="Review your institutional assignment and update credentials." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[#111111] dark:text-zinc-200 font-bold text-2xl mx-auto mb-4">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h3 className="text-base font-bold text-[#111111] dark:text-zinc-100">{profile?.name || 'User'}</h3>
          <p className="text-xs text-[#111111] dark:text-zinc-200 font-medium mt-0.5">{roleMeta?.label || normalizedRole}</p>

          <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 text-left text-xs text-[#52525B] dark:text-zinc-300">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="font-mono">ID: {profile?.employeeId || profile?.rollNo || profile?.uid?.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{profile?.email}</span>
            </div>
            {dept && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">Dept: {dept.name}</span>
              </div>
            )}
            {office && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">Office: {office.name}</span>
              </div>
            )}
            {team && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">Team: {team.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#111111] dark:text-zinc-200" />
            Change Password
          </h3>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-start gap-2.5 text-[#111111] dark:text-zinc-200 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3F3F46] dark:text-zinc-300 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                maxLength={128}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Verify current password"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F3F46] dark:text-zinc-300 mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Minimum 8 characters (12+ recommended)"
              />
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-2xl space-y-2">
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
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
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
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Repeat new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
