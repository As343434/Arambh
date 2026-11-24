import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Bell, CheckCircle2, Globe, Lock, Moon, ShieldCheck, Smartphone, Sun } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { PageHeader } from '../../components/ui/DataUI';

export const StudentSettings: React.FC = () => {
  const { profile, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [assignmentReminders, setAssignmentReminders] = useState(true);
  const [examAlerts, setExamAlerts] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState<'university' | 'classmates' | 'private'>('classmates');
  const [language, setLanguage] = useState('English (US)');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const p = profile?.preferences;
    if (p) {
      setEmailNotifs(p.emailNotifs ?? true);
      setSmsNotifs(p.smsNotifs ?? false);
      setAssignmentReminders(p.assignmentReminders ?? true);
      setExamAlerts(p.examAlerts ?? true);
      setProfileVisibility(p.profileVisibility || 'classmates');
      setLanguage(p.language || 'English (US)');
      setTwoFactorEnabled(p.twoFactorEnabled ?? false);
    }
  }, [profile?.preferences]);

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    await updateDoc(doc(db, 'users', profile.uid), {
      preferences: {
        emailNotifs,
        smsNotifs,
        assignmentReminders,
        examAlerts,
        profileVisibility,
        language,
        twoFactorEnabled
      }
    });
    setBanner({ type: 'success', text: 'Notification, privacy, and localization preferences saved.' });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setBanner({ type: 'error', text: 'Passwords do not match.' });
    }
    if (newPassword.length < 6) {
      return setBanner({ type: 'error', text: 'Password must be at least 6 characters.' });
    }
    try {
      if (user) {
        await updatePassword(user, newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setBanner({ type: 'success', text: 'Account password updated successfully.' });
      }
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Please re-authenticate to update password.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Account Settings"
        subtitle="Manage appearance theme, notification channels, directory privacy, security preferences, and active sessions."
      />

      {banner && (
        <div className={`px-4 py-3 rounded-xl border text-xs flex items-center gap-2 ${
          banner.type === 'success'
            ? 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-zinc-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSavePrefs} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-5">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-[#111111]" /> Notifications &amp; Privacy</h3>
          <div className="space-y-2.5 text-xs">
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span>University &amp; Course Email Notifications</span>
              <input type="checkbox" checked={emailNotifs} onChange={e => setEmailNotifs(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span>Urgent Campus SMS Alerts</span>
              <input type="checkbox" checked={smsNotifs} onChange={e => setSmsNotifs(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span>Assignment &amp; Quiz Deadline Reminders</span>
              <input type="checkbox" checked={assignmentReminders} onChange={e => setAssignmentReminders(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span>Examination Hall &amp; Result Publication Alerts</span>
              <input type="checkbox" checked={examAlerts} onChange={e => setExamAlerts(e.target.checked)} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-medium mb-1">Directory Privacy</label>
              <select value={profileVisibility} onChange={e => setProfileVisibility(e.target.value as any)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="university">University Directory</option>
                <option value="classmates">Classmates &amp; Faculty Only</option>
                <option value="private">Private (Faculty &amp; Offices Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Preferred Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Hindi</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="flex items-center gap-2 font-medium"><ShieldCheck className="w-4 h-4 text-[#111111]" /> Two-Factor Authentication Readiness</span>
              <input type="checkbox" checked={twoFactorEnabled} onChange={e => setTwoFactorEnabled(e.target.checked)} />
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">Save Preferences</button>
          </div>
        </form>

        <div className="space-y-6">
          {/* Theme & Appearance */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-3">
            <h3 className="text-sm font-semibold">Portal Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                  theme === 'light' ? 'border-[#111111] bg-[#111111] text-white' : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <Sun className="w-4 h-4" /> Light Mode
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                  theme === 'dark' ? 'border-white bg-white text-zinc-950' : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <Moon className="w-4 h-4" /> Dark Mode
              </button>
            </div>
          </div>

          {/* Password Update */}
          <form onSubmit={handlePasswordUpdate} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-[#111111]" /> Change Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Update Password</button>
          </form>

          {/* Active Session */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-[#111111]" />
              <div>
                <p className="font-semibold">Current Authenticated Session</p>
                <p className="text-[#52525B] font-mono">{user?.email} · Last sign-in {user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Active'}</p>
              </div>
            </div>
            <span className="font-semibold text-[#111111] dark:text-zinc-200">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
