import React, { useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

export const SESSION_EXPIRED_STORAGE_KEY = 'arambh_session_expired';

export const SessionTimeoutGuard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSessionExpire = useCallback(async () => {
    try {
      sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, '1');
      await signOut(auth);
    } catch (err) {
      console.error('Session timeout sign-out error:', err);
    } finally {
      navigate('/login', { replace: true, state: { sessionExpired: true } });
    }
  }, [navigate]);

  const { showWarning, secondsLeft, staySignedIn } = useIdleTimeout({
    enabled: Boolean(user),
    idleMs: 15 * 60 * 1000,
    warningMs: 60 * 1000,
    onTimeout: handleSessionExpire
  });

  if (!user || !showWarning) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#111111] dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 id="session-timeout-title" className="text-base font-bold text-[#111111] dark:text-zinc-100">
              Inactivity Session Warning
            </h2>
            <p className="text-xs text-[#52525B] dark:text-zinc-400">
              Your session has been idle for 14 minutes.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-[#111111] dark:text-zinc-200">
          For account security, you will be signed out automatically in{' '}
          <span className="font-mono font-bold tabular-nums">{secondsLeft}s</span>.
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => void handleSessionExpire()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[#52525B] dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Now
          </button>
          <button
            type="button"
            onClick={staySignedIn}
            className="px-4 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-2xl transition-colors"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
};
