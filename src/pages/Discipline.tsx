import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { AlertOctagon, CheckCircle2, Plus, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { DisciplineRecord } from '../types';

export const Discipline: React.FC = () => {
  const { profile, can, canViewField } = useAuth();
  const { students } = useUniversity();
  const allowed = can('discipline.manage') && canViewField('disciplinary');

  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Code of Conduct');
  const [severity, setSeverity] = useState<DisciplineRecord['severity']>('minor');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'disciplineRecords'),
      s => {
        setRecords(s.docs.map(d => ({ id: d.id, ...d.data() } as DisciplineRecord)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [allowed]);

  if (!allowed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Disciplinary Records Restricted"
        description="Student conduct & disciplinary records are restricted from your assigned RBAC role."
      />
    );
  }

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find(s => s.uid === studentId);
    if (!stu) return;
    const ref = await addDoc(collection(db, 'disciplineRecords'), {
      studentId: stu.uid,
      studentName: stu.name,
      rollNo: stu.rollNo || '',
      incidentDate,
      category,
      severity,
      description,
      actionTaken,
      reportedBy: profile?.name || profile?.uid || 'Proctor',
      status: 'open'
    });
    await logAudit(profile, 'LOG_DISCIPLINE_INCIDENT', 'Discipline', ref.id, `${stu.name} (${severity})`);
    setModalOpen(false);
    setDescription('');
    setActionTaken('');
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Conduct & Discipline"
        subtitle="Proctorial incident logging, severity grading, corrective action tracking, and case closure."
        actions={
          <button type="button" onClick={() => { setStudentId(students[0]?.uid || ''); setModalOpen(true); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
            <Plus className="w-3.5 h-3.5" /> Log Incident
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Cases" value={records.length} icon={AlertOctagon} tone="indigo" />
        <StatCard label="Open Cases" value={records.filter(r => r.status === 'open').length} icon={ShieldAlert} tone="rose" />
        <StatCard label="Resolved" value={records.filter(r => r.status === 'resolved').length} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
        {records.map(r => (
          <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-sm">{r.studentName}</span>
                <span className="font-mono text-zinc-400">{r.rollNo}</span>
                <span className="capitalize text-[#27272A] dark:text-zinc-300 font-semibold">{r.severity}</span>
                <span className="font-mono text-zinc-400">{r.incidentDate}</span>
                <StatusText status={r.status} />
              </div>
              <p className="text-xs text-[#52525B] dark:text-slate-300 mt-1">{r.category}: {r.description}</p>
              <p className="text-xs text-[#52525B] mt-0.5">Action Taken: {r.actionTaken} (Reported by {r.reportedBy})</p>
            </div>
            {r.status === 'open' && (
              <button
                type="button"
                onClick={() => updateDoc(doc(db, 'disciplineRecords', r.id), { status: 'resolved' })}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white shrink-0"
              >
                Resolve Case
              </button>
            )}
          </div>
        ))}
        {records.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No disciplinary records logged.</p>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Disciplinary Incident">
        <form onSubmit={handleLog} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Student</label>
              <select required value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {students.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.rollNo || s.email})</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium mb-1">Incident Date</label><input type="date" required value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Category</label><input type="text" required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div>
              <label className="block text-xs font-medium mb-1">Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
              </select>
            </div>
          </div>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Incident details..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <input type="text" required value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="Warning issued / Proctor committee referral..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Record</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
