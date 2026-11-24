import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { AlertCircle, Building2, CheckCircle2, Lock, Mail, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { ROLE_METADATA } from '../config/rbac';
import { PageHeader } from '../components/ui/DataUI';
import { StudentProfile } from './student/StudentProfile';

export const Profile: React.FC = () => {
  const { profile, user, normalizedRole, isStudent } = useAuth();
  const { departments, offices, teams } = useUniversity();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. You may need to re-authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="My Profile & Security" subtitle="Review your institutional assignment and update credentials." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
          <div className="w-20 h-20 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[#111111] dark:text-zinc-200 font-bold text-2xl mx-auto mb-4">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h3 className="text-base font-bold text-[#111111] dark:text-zinc-100">{profile?.name || 'User'}</h3>
          <p className="text-xs text-[#111111] dark:text-zinc-200 font-medium mt-0.5">{roleMeta?.label || normalizedRole}</p>

          <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 text-left text-xs text-[#52525B] dark:text-slate-300">
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

        <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#111111] dark:text-zinc-200" />
            Change Password
          </h3>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-start gap-2.5 text-[#111111] dark:text-zinc-200 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3F3F46] dark:text-slate-300 mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F3F46] dark:text-slate-300 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
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
