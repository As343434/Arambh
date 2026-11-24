import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Download, KeyRound, Search, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { exportToCsv } from '../services/erpService';
import { AuditLog } from '../types';

interface LoginEventRecord {
  id: string;
  emailMasked: string;
  emailHash: string;
  outcome: 'success' | 'failure' | 'locked';
  reason?: string;
  uid?: string | null;
  timestamp?: any;
}

export const AuditLogs: React.FC = () => {
  const [tab, setTab] = useState<'audit' | 'logins'>('audit');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    const unsubAudit = onSnapshot(
      collection(db, 'auditLogs'),
      s => {
        const list = s.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
        list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setLogs(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubLogins = onSnapshot(
      collection(db, 'loginEvents'),
      s => {
        const list = s.docs.map(d => ({ id: d.id, ...d.data() } as LoginEventRecord));
        list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setLoginEvents(list);
      },
      () => {}
    );

    return () => {
      unsubAudit();
      unsubLogins();
    };
  }, []);

  const modules = useMemo(() => Array.from(new Set(logs.map(l => l.module).filter(Boolean))), [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (moduleFilter && l.module !== moduleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.actorName?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.details?.toLowerCase().includes(q) ||
          l.module?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, moduleFilter, search]);

  const filteredLogins = useMemo(() => {
    if (!search.trim()) return loginEvents;
    const q = search.toLowerCase();
    return loginEvents.filter(
      e =>
        e.emailMasked?.toLowerCase().includes(q) ||
        e.outcome?.toLowerCase().includes(q) ||
        e.reason?.toLowerCase().includes(q)
    );
  }, [loginEvents, search]);

  if (loading) return <div className="h-64 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & System Audit Logs"
        subtitle="Immutable record of institutional actions, RBAC changes, and authentication attempts."
        actions={
          <button
            type="button"
            onClick={() =>
              tab === 'audit'
                ? exportToCsv(
                    'university_audit_logs.csv',
                    filtered.map(l => ({
                      Timestamp: l.timestamp?.toDate ? l.timestamp.toDate().toISOString() : '',
                      Actor: l.actorName,
                      Role: l.actorRole,
                      Module: l.module,
                      Action: l.action,
                      TargetID: l.targetId || '',
                      Details: l.details
                    }))
                  )
                : exportToCsv(
                    'university_login_events.csv',
                    filteredLogins.map(e => ({
                      Timestamp: e.timestamp?.toDate ? e.timestamp.toDate().toISOString() : '',
                      MaskedEmail: e.emailMasked,
                      EmailHash: e.emailHash,
                      Outcome: e.outcome,
                      Reason: e.reason || '',
                      UID: e.uid || ''
                    }))
                  )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Audit Events" value={logs.length} icon={ShieldCheck} tone="indigo" />
        <StatCard label="Modules Monitored" value={modules.length} icon={ShieldCheck} tone="emerald" />
        <StatCard label="Auth Attempts Logged" value={loginEvents.length} icon={KeyRound} />
      </div>

      <SegmentedTabs
        active={tab}
        onChange={v => setTab(v as any)}
        tabs={[
          { id: 'audit', label: 'System Audit Trail', count: filtered.length },
          { id: 'logins', label: 'Login Security Events', count: filteredLogins.length }
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            maxLength={100}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'audit' ? 'Filter by actor, action, or details...' : 'Filter by masked email, outcome, or reason...'}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          />
        </div>
        {tab === 'audit' && (
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          >
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {tab === 'audit' ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Actor</th>
                  <th className="py-3 px-4 font-semibold">Module</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {filtered.slice(0, 150).map(l => (
                  <tr key={l.id}>
                    <td className="py-3 px-4 font-mono text-[#52525B] whitespace-nowrap">
                      {l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-medium">{l.actorName} <span className="text-zinc-400">({l.actorRole})</span></td>
                    <td className="py-3 px-4 font-semibold text-[#111111] dark:text-zinc-200">{l.module}</td>
                    <td className="py-3 px-4 font-mono">{l.action}</td>
                    <td className="py-3 px-4 text-[#52525B] dark:text-zinc-300">{l.details}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-zinc-400">No audit trail events recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Account (Masked)</th>
                  <th className="py-3 px-4 font-semibold">Hash Digest</th>
                  <th className="py-3 px-4 font-semibold">Outcome</th>
                  <th className="py-3 px-4 font-semibold">Reason Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {filteredLogins.slice(0, 150).map(ev => (
                  <tr key={ev.id}>
                    <td className="py-3 px-4 font-mono text-[#52525B] whitespace-nowrap">
                      {ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono">{ev.emailMasked}</td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{ev.emailHash?.slice(0, 12)}…</td>
                    <td className="py-3 px-4"><StatusText status={ev.outcome === 'success' ? 'verified' : ev.outcome === 'locked' ? 'suspended' : 'rejected'} /></td>
                    <td className="py-3 px-4 font-mono text-[#52525B]">{ev.reason || '—'}</td>
                  </tr>
                ))}
                {filteredLogins.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-zinc-400">No login security events recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
