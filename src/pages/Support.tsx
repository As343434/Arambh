import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, LifeBuoy, Plus } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { Modal, PageHeader, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { SupportTicket } from '../types';

export const Support: React.FC = () => {
  const { profile, can } = useAuth();
  const { employees } = useUniversity();
  const canManage = can('support.manage');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState<SupportTicket['category']>('academic');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isGrievance, setIsGrievance] = useState(false);

  const [resolveTarget, setResolveTarget] = useState<SupportTicket | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    const ticketQ = canManage
      ? collection(db, 'supportTickets')
      : profile?.uid
      ? query(collection(db, 'supportTickets'), where('userId', '==', profile.uid))
      : null;
    if (!ticketQ) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      ticketQ,
      s => {
        setTickets(s.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [canManage, profile?.uid]);

  const visibleTickets = useMemo(() => {
    let list = canManage ? tickets : tickets.filter(t => t.userId === profile?.uid);
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    return list;
  }, [tickets, canManage, profile?.uid, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const ticketNo = `TKT-${Date.now().toString().slice(-6)}`;
    const ref = await addDoc(collection(db, 'supportTickets'), {
      ticketNo,
      userId: profile.uid,
      userName: profile.name,
      userRole: profile.role,
      category,
      priority,
      subject,
      description,
      isGrievance,
      status: 'open',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_SUPPORT_TICKET', 'Support', ref.id, `${ticketNo}: ${subject}`);
    setCreateOpen(false);
    setSubject('');
    setDescription('');
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    await updateDoc(doc(db, 'supportTickets', resolveTarget.id), {
      status: 'resolved',
      resolutionNote,
      assignedTo: assignedTo || profile?.name || ''
    });
    await logAudit(profile, 'RESOLVE_SUPPORT_TICKET', 'Support', resolveTarget.id, resolveTarget.ticketNo);
    setResolveTarget(null);
    setResolutionNote('');
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Support & Grievance Redressal"
        subtitle="Helpdesk tickets, IT/facility issues, and formal grievance tracking with resolution audit."
        actions={
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
            <Plus className="w-3.5 h-3.5" /> Raise Ticket / Grievance
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Open Tickets" value={visibleTickets.filter(t => t.status === 'open').length} icon={LifeBuoy} tone="amber" />
        <StatCard label="Formal Grievances" value={visibleTickets.filter(t => t.isGrievance).length} icon={AlertCircle} tone="rose" />
        <StatCard label="Resolved" value={visibleTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="flex gap-2">
        {['all', 'open', 'in_progress', 'resolved'].map(st => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize ${
              statusFilter === st
                ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white border-[#111111] dark:border-white'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[#52525B] dark:text-slate-300'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
        {visibleTickets.map(t => (
          <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-[#111111] dark:text-zinc-200">{t.ticketNo}</span>
                <span className="capitalize text-[#52525B]">{t.category} · {t.priority} priority</span>
                {t.isGrievance && <span className="font-semibold text-rose-600 dark:text-rose-400">· Formal Grievance</span>}
                <StatusText status={t.status} />
              </div>
              <h4 className="text-sm font-semibold">{t.subject}</h4>
              <p className="text-xs text-[#52525B] dark:text-zinc-400">{t.description}</p>
              {t.resolutionNote && (
                <p className="text-xs text-[#111111] dark:text-zinc-200">Resolution: {t.resolutionNote}</p>
              )}
            </div>
            {canManage && t.status !== 'resolved' && (
              <button
                type="button"
                onClick={() => { setResolveTarget(t); setAssignedTo(t.assignedTo || profile?.name || ''); }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white shrink-0"
              >
                Resolve Ticket
              </button>
            )}
          </div>
        ))}
        {visibleTickets.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No support tickets found.</p>}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Submit Support Ticket or Grievance">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="academic">Academic</option>
                <option value="it">IT & Portal Access</option>
                <option value="finance">Finance & Billing</option>
                <option value="hostel">Hostel</option>
                <option value="transport">Transport</option>
                <option value="grievance">Grievance Committee</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-medium mb-1">Subject</label><input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide complete details..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={isGrievance} onChange={e => setIsGrievance(e.target.checked)} />
            Flag as a formal institutional grievance
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Ticket</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resolveTarget} onClose={() => setResolveTarget(null)} title={`Resolve ${resolveTarget?.ticketNo || ''}`}>
        <form onSubmit={handleResolve} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Assigned Handler</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value={profile?.name || ''}>{profile?.name} (Self)</option>
              {employees.map(e => <option key={e.uid} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <textarea required rows={3} value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} placeholder="Resolution summary and action taken..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResolveTarget(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Mark Resolved</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
