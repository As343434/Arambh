import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, StatCard } from '../components/ui/DataUI';
import { ExamSchedule, UniversityEvent } from '../types';

export const CalendarPage: React.FC = () => {
  const { can } = useAuth();
  const { academicEvents } = useUniversity();
  const canManage = can('academics.manage');

  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [campusEvents, setCampusEvents] = useState<UniversityEvent[]>([]);
  const [filterType, setFilterType] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'holiday' | 'exam' | 'semester_start' | 'event' | 'deadline'>('event');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'examSchedules'), s => setExamSchedules(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamSchedule))), () => {});
    const u2 = onSnapshot(collection(db, 'universityEvents'), s => setCampusEvents(s.docs.map(d => ({ id: d.id, ...d.data() } as UniversityEvent))), () => {});
    return () => { u1(); u2(); };
  }, []);

  const mergedItems = useMemo(() => {
    const list: { id: string; source: 'academic' | 'exam' | 'campus'; title: string; type: string; startDate: string; endDate: string; description: string }[] = [
      ...academicEvents.map(a => ({ id: a.id, source: 'academic' as const, title: a.title, type: a.type, startDate: a.startDate, endDate: a.endDate, description: a.description })),
      ...examSchedules.map(e => ({ id: e.id, source: 'exam' as const, title: `${e.examTitle || 'Exam'}: ${e.subjectName}`, type: 'exam', startDate: e.date, endDate: e.date, description: `${e.className} · ${e.startTime}–${e.endTime} (${e.roomName})` })),
      ...campusEvents.map(c => ({ id: c.id, source: 'campus' as const, title: c.title, type: 'event', startDate: c.date, endDate: c.date, description: `${c.venue} · ${c.description}` }))
    ];
    return list
      .filter(i => filterType === 'all' || i.type === filterType)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [academicEvents, examSchedules, campusEvents, filterType]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'academicEvents'), {
      title,
      type,
      startDate,
      endDate: endDate || startDate,
      description
    });
    setModalOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="University Academic Calendar"
        subtitle="Unified institutional schedule combining term dates, holidays, examinations, and campus events."
        actions={
          canManage ? (
            <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Plus className="w-3.5 h-3.5" /> Add Calendar Milestone
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Academic Milestones" value={academicEvents.length} icon={Calendar} tone="indigo" />
        <StatCard label="Exam Papers Scheduled" value={examSchedules.length} icon={Calendar} tone="amber" />
        <StatCard label="Campus Events" value={campusEvents.length} icon={Calendar} tone="emerald" />
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'semester_start', 'exam', 'holiday', 'deadline', 'event'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize ${
              filterType === t
                ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white border-[#111111] dark:border-white'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[#52525B] dark:text-slate-300'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {mergedItems.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {mergedItems.map(item => (
            <div key={`${item.source}-${item.id}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-4">
                <div className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-center min-w-[96px]">
                  <p className="font-mono text-xs font-bold text-[#111111] dark:text-zinc-200">{item.startDate}</p>
                  {item.endDate && item.endDate !== item.startDate && (
                    <p className="font-mono text-[10px] text-zinc-400">to {item.endDate}</p>
                  )}
                </div>
                <div>
                  <span className="text-[11px] uppercase font-semibold text-zinc-400">{item.type.replace('_', ' ')}</span>
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-xs text-[#52525B] mt-0.5">{item.description}</p>
                </div>
              </div>
              {canManage && item.source === 'academic' && (
                <button onClick={() => deleteDoc(doc(db, 'academicEvents', item.id))} className="text-zinc-400 hover:text-rose-500 self-end sm:self-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Calendar} title="Calendar Clear" description="No academic milestones or exams match the active filter." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Academic Calendar Milestone">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Title</label><input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Type</label><select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"><option value="semester_start">Semester Start</option><option value="exam">Examination</option><option value="holiday">Holiday</option><option value="deadline">Deadline</option><option value="event">Event</option></select></div>
            <div><label className="block text-xs font-medium mb-1">Start Date</label><input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Milestone notes..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Milestone</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
