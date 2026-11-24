import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowLeft, Clock } from 'lucide-react';
import { normalizeRole } from '../config/rbac';
import { logLoginEvent } from '../services/erpService';
import { mapAuthError, validateEmail } from '../utils/validation';
import { SESSION_EXPIRED_STORAGE_KEY } from '../components/SessionTimeoutGuard';

const LOCKOUT_STORAGE_KEY = 'arambh_login_lockout_v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}

function readLockoutState(): LockoutState {
  try {
    const raw = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as LockoutState;
    if (parsed.lockedUntil && Date.now() >= parsed.lockedUntil) {
      sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
      return { attempts: 0, lockedUntil: null };
    }
    return {
      attempts: Number(parsed.attempts) || 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : null
    };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function writeLockoutState(state: LockoutState) {
  try {
    if (state.attempts === 0 && !state.lockedUntil) {
      sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
    } else {
      sessionStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota issues
  }
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockout, setLockout] = useState<LockoutState>(() => readLockoutState());
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    lockout.lockedUntil ? Math.max(0, lockout.lockedUntil - Date.now()) : 0
  );

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const flagFromState = Boolean((location.state as any)?.sessionExpired);
    let flagFromStorage = false;
    try {
      flagFromStorage = sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY) === '1';
      if (flagFromStorage) sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);
    } catch {
      flagFromStorage = false;
    }
    if (flagFromState || flagFromStorage) {
      setSessionExpiredNotice(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (!lockout.lockedUntil) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const diff = (lockout.lockedUntil || 0) - Date.now();
      if (diff <= 0) {
        const cleared = { attempts: 0, lockedUntil: null };
        writeLockoutState(cleared);
        setLockout(cleared);
        setRemainingMs(0);
        setError('');
      } else {
        setRemainingMs(diff);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [lockout.lockedUntil]);

  const isLocked = Boolean(lockout.lockedUntil && remainingMs > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setError('');
    setSessionExpiredNotice(false);

    const trimmedEmail = email.trim();
    const emailErr = validateEmail(trimmedEmail, true);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (!password || password.length > 128) {
      setError('Password must be between 1 and 128 characters.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      const cleared = { attempts: 0, lockedUntil: null };
      writeLockoutState(cleared);
      setLockout(cleared);

      void logLoginEvent(trimmedEmail, 'success', user.uid, 'authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const role = normalizeRole(userData?.role);

      if (userData?.isFirstLogin) {
        navigate('/change-password', { replace: true });
      } else if (role === 'student') {
        navigate('/student-dashboard', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err?.code || 'auth_error', err);
      const nextAttempts = lockout.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        const nextState = { attempts: nextAttempts, lockedUntil };
        writeLockoutState(nextState);
        setLockout(nextState);
        setRemainingMs(LOCKOUT_DURATION_MS);
        setError('Too many failed sign-in attempts. Sign-in is temporarily locked for 15 minutes.');
        void logLoginEvent(trimmedEmail, 'locked', null, 'lockout_triggered');
      } else {
        const nextState = { attempts: nextAttempts, lockedUntil: null };
        writeLockoutState(nextState);
        setLockout(nextState);
        setError(`${mapAuthError(err)} (${MAX_ATTEMPTS - nextAttempts} attempts remaining)`);
        void logLoginEvent(trimmedEmail, 'failure', null, String(err?.code || 'invalid_credentials').slice(0, 60));
      }
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

        {sessionExpiredNotice && (
          <div className="mb-5 p-3.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-start gap-2.5 text-[#111111] dark:text-zinc-200 text-xs">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Session expired due to 15 minutes of inactivity. Please sign in again.</p>
          </div>
        )}

        {isLocked && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Account Sign-In Locked</p>
              <p className="mt-0.5">
                Retry available in <span className="font-mono font-bold tabular-nums">{formatCountdown(remainingMs)}</span>.
              </p>
            </div>
          </div>
        )}

        {error && !isLocked && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-[#111111] dark:text-zinc-300 mb-1.5">University Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                maxLength={254}
                disabled={isLocked || loading}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[#111111] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50"
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
                maxLength={128}
                disabled={isLocked || loading}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[#111111] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {isLocked
              ? `Locked (${formatCountdown(remainingMs)})`
              : loading
              ? 'Signing in...'
              : 'Sign In'}
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
