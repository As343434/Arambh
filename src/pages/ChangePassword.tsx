import React, { useState } from 'react';
  import { updatePassword } from 'firebase/auth';
  import { doc, setDoc } from 'firebase/firestore';
  import { useAuth } from '../contexts/AuthContext';
  import { auth, db } from '../firebase';
  import { Lock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
  import { motion } from 'motion/react';
  import { useNavigate } from 'react-router-dom';

  export const ChangePassword: React.FC = () => {
    const { profile, user } = useAuth();
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
          
          // Update isFirstLogin flag in Firestore
          // Use setDoc with merge: true instead of updateDoc to handle cases where doc might not exist
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            isFirstLogin: false
          }, { merge: true });

          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to update password. You may need to re-authenticate.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[32px] shadow-xl p-8 border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Security Update Required</h2>
            <p className="text-slate-500 mt-2">Please change your password before continuing to your dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="New password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update & Continue'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  };
