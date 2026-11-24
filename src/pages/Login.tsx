import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { normalizeRole } from '../config/rbac';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const role = normalizeRole(userData?.role);

      if (role === 'student') {
        navigate('/student-dashboard', { replace: true });
      } else {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52525B] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-zinc-100 mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to University Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#111111] dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#111111] dark:text-zinc-100">University Portal</h1>
              <p className="text-xs text-[#52525B] dark:text-zinc-400">Sign in to access your role workspace</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111111] dark:text-zinc-300 mb-1.5">University Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[#111111] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="Enter your university email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] dark:text-zinc-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[#111111] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-xs text-[#52525B] dark:text-zinc-400">
            Accounts are provisioned by University Administration or Admissions.
          </p>
        </div>
      </div>
    </div>
  );
};
