import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import Papa from 'papaparse';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  User,
  Wand2
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import {
  DEFAULT_TIMETABLE_CONFIG,
  autoGenerateTimetable,
  detectTimetableConflicts,
  exportToCsv,
  logAudit
} from '../services/erpService';
import { TimetableEntry } from '../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const Timetable: React.FC = () => {
  const { profile, isStudent, isTeacher, isParent, can } = useAuth();
  const { classes, subjects, teachers, departments, rooms, settings, users } = useUniversity();
  const canManage = can('timetable.manage');

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda' | 'monthly' | 'workload'>('grid');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Filters
  const [filterClassId, setFilterClassId] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterRoomId, setFilterRoomId] = useState('');

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [formClassId, setFormClassId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formDay, setFormDay] = useState('Monday');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formType, setFormType] = useState<'lecture' | 'lab' | 'tutorial'>('lecture');
  const [forceOverride, setForceOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  // Substitute / Reschedule Modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subEntry, setSubEntry] = useState<TimetableEntry | null>(null);
  const [subTeacherId, setSubTeacherId] = useState('');
  const [subStatus, setSubStatus] = useState<'scheduled' | 'rescheduled' | 'cancelled'>('rescheduled');
  const [subDate, setSubDate] = useState('');
  const [subNotes, setSubNotes] = useState('');

  // Auto-Generate Modal
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoClassId, setAutoClassId] = useState('');
  const [autoClearExisting, setAutoClearExisting] = useState(true);
  const [autoAllocations, setAutoAllocations] = useState<
    { subjectId: string; teacherId: string; sessionsPerWeek: number; type: 'lecture' | 'lab' | 'tutorial' }[]
  >([]);
  const [autoPreview, setAutoPreview] = useState<{ generated: Omit<TimetableEntry, 'id'>[]; unplaced: string[] } | null>(null);
  const [autoCommitting, setAutoCommitting] = useState(false);

  // CSV Upload ref
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'timetable'),
      snap => {
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Determine personal class scope for Student / Parent / Teacher
  const linkedStudent = useMemo(() => {
    if (!isParent || !profile?.parentOfStudentIds?.length) return null;
    return users.find(u => profile.parentOfStudentIds?.includes(u.uid)) || null;
  }, [isParent, profile?.parentOfStudentIds, users]);

  const myStudentClass = useMemo(() => {
    const targetUid = isStudent ? profile?.uid : linkedStudent?.uid;
    if (!targetUid) return null;
    return classes.find(c => c.students?.includes(targetUid) || c.id === (isStudent ? profile?.classId : linkedStudent?.classId)) || null;
  }, [isStudent, linkedStudent, profile?.uid, profile?.classId, classes]);

  const visibleEntries = useMemo(() => {
    let list = [...entries];
    if (!canManage) {
      if (isStudent || isParent) {
        list = myStudentClass ? list.filter(e => e.classId === myStudentClass.id) : [];
      } else if (isTeacher && profile?.uid) {
        list = list.filter(e => e.teacherId === profile.uid || e.substituteTeacherId === profile.uid);
      }
    }
    if (filterClassId) list = list.filter(e => e.classId === filterClassId);
    if (filterTeacherId) list = list.filter(e => e.teacherId === filterTeacherId || e.substituteTeacherId === filterTeacherId);
    if (filterDeptId) list = list.filter(e => e.departmentId === filterDeptId);
    if (filterRoomId) list = list.filter(e => e.roomId === filterRoomId);

    return list.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [entries, canManage, isStudent, isParent, isTeacher, profile?.uid, myStudentClass, filterClassId, filterTeacherId, filterDeptId, filterRoomId]);

  const conflictCheck = useMemo(() => {
    const rm = rooms.find(r => r.id === formRoomId);
    const cls = classes.find(c => c.id === formClassId);
    return detectTimetableConflicts(
      {
        classId: formClassId,
        className: cls?.name,
        teacherId: formTeacherId,
        roomId: formRoomId,
        room: rm?.roomNumber || rm?.name,
        day: formDay,
        startTime: formStartTime,
        endTime: formEndTime
      },
      entries,
      rooms,
      classes,
      editingEntry?.id
    );
  }, [formClassId, formTeacherId, formRoomId, formDay, formStartTime, formEndTime, entries, rooms, classes, editingEntry?.id]);

  const openCreateModal = (day = 'Monday') => {
    setEditingEntry(null);
    setFormClassId(filterClassId || classes[0]?.id || '');
    setFormSubjectId(subjects[0]?.id || '');
    setFormTeacherId(teachers[0]?.uid || '');
    setFormRoomId(rooms[0]?.id || '');
    setFormDay(day);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormType('lecture');
    setForceOverride(false);
    setModalOpen(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormClassId(entry.classId);
    setFormSubjectId(entry.subjectId);
    setFormTeacherId(entry.teacherId);
    setFormRoomId(entry.roomId || '');
    setFormDay(entry.day);
    setFormStartTime(entry.startTime);
    setFormEndTime(entry.endTime);
    setFormType(entry.type || 'lecture');
    setForceOverride(false);
    setModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictCheck.hasConflict && !forceOverride) return;
    setSaving(true);
    try {
      const cls = classes.find(c => c.id === formClassId);
      const sub = subjects.find(s => s.id === formSubjectId);
      const tea = teachers.find(t => t.uid === formTeacherId);
      const rm = rooms.find(r => r.id === formRoomId);

      const payload: Partial<TimetableEntry> = {
        classId: formClassId,
        className: cls?.name || 'Class',
        departmentId: cls?.departmentId || sub?.departmentId || '',
        mentorId: cls?.mentorId || '',
        subjectId: formSubjectId,
        subjectName: sub?.name || 'Subject',
        teacherId: formTeacherId,
        teacherName: tea?.name || 'Faculty',
        roomId: formRoomId,
        room: rm ? `${rm.roomNumber} (${rm.name})` : '',
        day: formDay,
        startTime: formStartTime,
        endTime: formEndTime,
        type: formType,
        status: editingEntry?.status || 'scheduled'
      };

      if (editingEntry) {
        await updateDoc(doc(db, 'timetable', editingEntry.id), { ...payload, updatedAt: serverTimestamp() });
        await logAudit(profile, 'UPDATE_TIMETABLE_SLOT', 'Timetable', editingEntry.id, `${payload.className} · ${payload.subjectName} (${formDay} ${formStartTime})`);
      } else {
        const ref = await addDoc(collection(db, 'timetable'), { ...payload, createdAt: serverTimestamp() });
        await logAudit(profile, 'CREATE_TIMETABLE_SLOT', 'Timetable', ref.id, `${payload.className} · ${payload.subjectName} (${formDay} ${formStartTime})`);
      }
      setModalOpen(false);
      setBanner({ type: 'success', text: editingEntry ? 'Timetable slot updated.' : 'Timetable slot scheduled.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to save timetable slot.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entry: TimetableEntry) => {
    if (!window.confirm(`Remove ${entry.subjectName} (${entry.day} ${entry.startTime})?`)) return;
    await deleteDoc(doc(db, 'timetable', entry.id));
    await logAudit(profile, 'DELETE_TIMETABLE_SLOT', 'Timetable', entry.id, `${entry.className} · ${entry.subjectName}`);
  };

  const openSubModal = (entry: TimetableEntry) => {
    setSubEntry(entry);
    setSubTeacherId(entry.substituteTeacherId || '');
    setSubStatus(entry.status || 'rescheduled');
    setSubDate(entry.rescheduledDate || '');
    setSubNotes(entry.notes || '');
    setSubModalOpen(true);
  };

  const handleSaveSubstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEntry) return;
    const subTeacher = teachers.find(t => t.uid === subTeacherId);
    await updateDoc(doc(db, 'timetable', subEntry.id), {
      status: subStatus,
      substituteTeacherId: subTeacherId || null,
      substituteTeacherName: subTeacher?.name || null,
      rescheduledDate: subDate || null,
      notes: subNotes || null,
      updatedAt: serverTimestamp()
    });
    await logAudit(profile, 'RESCHEDULE_TIMETABLE', 'Timetable', subEntry.id, `Status: ${subStatus}, Sub: ${subTeacher?.name || 'None'}`);
    setSubModalOpen(false);
    setBanner({ type: 'success', text: 'Schedule adjustment saved.' });
  };

  // Auto-generation helpers
  const openAutoGenerate = () => {
    const defaultCls = classes[0];
    setAutoClassId(defaultCls?.id || '');
    const clsSubjects = defaultCls?.subjectIds?.length
      ? subjects.filter(s => defaultCls.subjectIds?.includes(s.id))
      : subjects.slice(0, 4);
    setAutoAllocations(
      clsSubjects.map((s, idx) => ({
        subjectId: s.id,
        teacherId: teachers[idx % Math.max(1, teachers.length)]?.uid || '',
        sessionsPerWeek: s.type === 'practical' ? 2 : 3,
        type: s.type === 'practical' ? 'lab' : 'lecture'
      }))
    );
    setAutoPreview(null);
    setAutoOpen(true);
  };

  const handleClassChangeAuto = (cid: string) => {
    setAutoClassId(cid);
    const cls = classes.find(c => c.id === cid);
    const clsSubjects = cls?.subjectIds?.length ? subjects.filter(s => cls.subjectIds?.includes(s.id)) : subjects.slice(0, 4);
    setAutoAllocations(
      clsSubjects.map((s, idx) => ({
        subjectId: s.id,
        teacherId: cls?.teacherId || teachers[idx % Math.max(1, teachers.length)]?.uid || '',
        sessionsPerWeek: s.type === 'practical' ? 2 : 3,
        type: s.type === 'practical' ? 'lab' : 'lecture'
      }))
    );
    setAutoPreview(null);
  };

  const runAutoPreview = () => {
    const targetClass = classes.find(c => c.id === autoClassId);
    if (!targetClass) return;
    const baseEntries = autoClearExisting ? entries.filter(e => e.classId !== targetClass.id) : entries;
    const result = autoGenerateTimetable({
      targetClass,
      allocations: autoAllocations.filter(a => a.subjectId && a.teacherId && a.sessionsPerWeek > 0),
      existingEntries: baseEntries,
      subjects,
      teachers,
      rooms,
      classes,
      config: settings.timetableConfig || DEFAULT_TIMETABLE_CONFIG
    });
    setAutoPreview(result);
  };

  const commitAutoSchedule = async () => {
    if (!autoPreview || !autoClassId) return;
    setAutoCommitting(true);
    try {
      const batch = writeBatch(db);
      if (autoClearExisting) {
        entries.filter(e => e.classId === autoClassId).forEach(e => {
          batch.delete(doc(db, 'timetable', e.id));
        });
      }
      autoPreview.generated.forEach(item => {
        const ref = doc(collection(db, 'timetable'));
        batch.set(ref, { ...item, createdAt: serverTimestamp() });
      });
      await batch.commit();
      await logAudit(profile, 'AUTO_GENERATE_TIMETABLE', 'Timetable', autoClassId, `Generated ${autoPreview.generated.length} conflict-free sessions`);
      setAutoOpen(false);
      setBanner({ type: 'success', text: `Published ${autoPreview.generated.length} conflict-free weekly slots.` });
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to publish generated timetable.' });
    } finally {
      setAutoCommitting(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async res => {
        const rows = res.data as any[];
        let imported = 0;
        let skipped = 0;
        const working = [...entries];
        const batch = writeBatch(db);

        for (const r of rows) {
          const cls = classes.find(c => c.name.toLowerCase() === String(r.className || '').trim().toLowerCase());
          const sub = subjects.find(s =>
            s.code?.toLowerCase() === String(r.subjectCode || '').trim().toLowerCase() ||
            s.name?.toLowerCase() === String(r.subjectName || '').trim().toLowerCase()
          );
          const tea = teachers.find(t =>
            t.email?.toLowerCase() === String(r.teacherEmail || '').trim().toLowerCase() ||
            t.name?.toLowerCase() === String(r.teacherName || '').trim().toLowerCase()
          );
          const rm = rooms.find(x =>
            x.roomNumber?.toLowerCase() === String(r.room || '').trim().toLowerCase() ||
            x.name?.toLowerCase() === String(r.room || '').trim().toLowerCase()
          );
          if (!cls || !sub || !tea || !r.day || !r.startTime || !r.endTime) {
            skipped++;
            continue;
          }
          const conflict = detectTimetableConflicts(
            {
              classId: cls.id,
              teacherId: tea.uid,
              roomId: rm?.id,
              room: rm?.roomNumber || r.room,
              day: r.day,
              startTime: r.startTime,
              endTime: r.endTime
            },
            working,
            rooms,
            classes
          );
          if (conflict.hasConflict) {
            skipped++;
            continue;
          }
          const newDoc: Omit<TimetableEntry, 'id'> = {
            classId: cls.id,
            className: cls.name,
            departmentId: cls.departmentId || '',
            subjectId: sub.id,
            subjectName: sub.name,
            teacherId: tea.uid,
            teacherName: tea.name,
            roomId: rm?.id || '',
            room: rm ? `${rm.roomNumber} (${rm.name})` : (r.room || ''),
            day: r.day,
            startTime: r.startTime,
            endTime: r.endTime,
            type: (r.type as any) || 'lecture',
            status: 'scheduled'
          };
          const ref = doc(collection(db, 'timetable'));
          batch.set(ref, { ...newDoc, createdAt: serverTimestamp() });
          working.push({ id: ref.id, ...newDoc });
          imported++;
        }

        if (imported > 0) {
          await batch.commit();
          await logAudit(profile, 'IMPORT_TIMETABLE_CSV', 'Timetable', 'bulk', `Imported ${imported} slots (${skipped} skipped)`);
        }
        setBanner({ type: imported > 0 ? 'success' : 'error', text: `CSV Import: ${imported} scheduled, ${skipped} skipped due to missing match or conflict.` });
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    });
  };

  // Faculty workload computation from visible/all entries
  const workloadByTeacher = useMemo(() => {
    const map = new Map<string, { teacherName: string; hours: number; sessions: number; target: number }>();
    teachers.forEach(t => {
      map.set(t.uid, {
        teacherName: t.name,
        hours: 0,
        sessions: 0,
        target: t.weeklyWorkloadTargetHours || 16
      });
    });
    entries.filter(e => e.status !== 'cancelled').forEach(e => {
      const targetId = e.substituteTeacherId || e.teacherId;
      const cur = map.get(targetId) || { teacherName: e.teacherName || 'Faculty', hours: 0, sessions: 0, target: 16 };
      const [sh, sm] = (e.startTime || '09:00').split(':').map(Number);
      const [eh, em] = (e.endTime || '10:00').split(':').map(Number);
      const hrs = Math.max(0.5, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
      cur.hours += hrs;
      cur.sessions += 1;
      map.set(targetId, cur);
    });
    return Array.from(map.entries()).map(([uid, v]) => ({ uid, ...v })).sort((a, b) => b.hours - a.hours);
  }, [entries, teachers]);

  const weeklyHoursCount = useMemo(() => {
    return visibleEntries.filter(e => e.status !== 'cancelled').length;
  }, [visibleEntries]);

  if (loading) {
    return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable & Scheduling Engine"
        subtitle={
          isStudent || isParent
            ? `Weekly schedule for ${myStudentClass?.name || 'your assigned section'}`
            : 'Conflict-aware weekly academic schedule, room allocation, substitutions, and automated slot generation.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  'university_timetable.csv',
                  visibleEntries.map(e => ({
                    Day: e.day,
                    StartTime: e.startTime,
                    EndTime: e.endTime,
                    Class: e.className,
                    Subject: e.subjectName,
                    Teacher: e.substituteTeacherName ? `${e.substituteTeacherName} (Sub for ${e.teacherName})` : e.teacherName,
                    Room: e.room || '',
                    Type: e.type || 'lecture',
                    Status: e.status || 'scheduled'
                  }))
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#3F3F46] dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            {canManage && (
              <>
                <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#3F3F46] dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-slate-800"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import CSV
                </button>
                <button
                  type="button"
                  onClick={openAutoGenerate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Auto-Generate
                </button>
                <button
                  type="button"
                  onClick={() => openCreateModal('Monday')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Slot
                </button>
              </>
            )}
          </div>
        }
      />

      {banner && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs flex items-center justify-between ${
            banner.type === 'success'
              ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-zinc-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {banner.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {banner.text}
          </span>
          <button onClick={() => setBanner(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Weekly Sessions" value={weeklyHoursCount} icon={Calendar} tone="indigo" hint="Active scheduled lectures & labs" />
        <StatCard label="Rescheduled / Cancelled" value={visibleEntries.filter(e => e.status && e.status !== 'scheduled').length} icon={RefreshCw} tone="amber" hint="With substitute or adjusted date" />
        <StatCard label="Classrooms & Labs" value={rooms.length} icon={MapPin} tone="emerald" hint="Configured physical venues" />
        <StatCard label="Slot Duration" value={`${settings.timetableConfig?.slotDurationMinutes || 60}m`} icon={Clock} hint={`${settings.timetableConfig?.dayStartTime || '09:00'} – ${settings.timetableConfig?.dayEndTime || '16:00'}`} />
      </div>

      {visibleEntries.some(e => e.status === 'rescheduled' || e.status === 'cancelled') && (
        <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-[#111111] dark:text-zinc-300 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Schedule Updates & Substitutions
          </p>
          <div className="space-y-1 text-xs text-[#111111] dark:text-zinc-200">
            {visibleEntries
              .filter(e => e.status === 'rescheduled' || e.status === 'cancelled')
              .slice(0, 5)
              .map(e => (
                <p key={e.id}>
                  <strong className="font-mono">{e.day} {e.startTime}</strong> · {e.subjectName} —{' '}
                  <span className="capitalize font-semibold">{e.status}</span>
                  {e.substituteTeacherName ? ` (Substitute: ${e.substituteTeacherName})` : ''}
                  {e.rescheduledDate ? ` on ${e.rescheduledDate}` : ''}
                  {e.notes ? ` — ${e.notes}` : ''}
                </p>
              ))}
          </div>
        </div>
      )}

      {/* View & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-4">
        <SegmentedTabs
          active={viewMode}
          onChange={v => setViewMode(v as any)}
          tabs={[
            { id: 'grid', label: 'Weekly Grid' },
            { id: 'agenda', label: 'Day Agenda' },
            { id: 'monthly', label: 'Monthly Calendar' },
            ...(canManage ? [{ id: 'workload', label: 'Faculty Workload' }] : [])
          ]}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          {canManage && (
            <>
              <select
                value={filterDeptId}
                onChange={e => setFilterDeptId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select
                value={filterClassId}
                onChange={e => setFilterClassId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={filterTeacherId}
                onChange={e => setFilterTeacherId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="">All Faculty</option>
                {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
              </select>
              <select
                value={filterRoomId}
                onChange={e => setFilterRoomId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="">All Rooms</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} · {r.name}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Weekly Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {DAYS.map(day => {
            const dayEntries = visibleEntries.filter(e => e.day === day);
            return (
              <div key={day} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] flex flex-col">
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#111111] dark:text-zinc-200" />
                    <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{day}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400 tabular-nums">{dayEntries.length} slots</span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => openCreateModal(day)}
                        className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-slate-800 text-[#111111] dark:text-zinc-200"
                        title={`Add slot on ${day}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  {dayEntries.length > 0 ? dayEntries.map(entry => {
                    const sub = subjects.find(s => s.id === entry.subjectId);
                    const cls = classes.find(c => c.id === entry.classId);
                    const tea = teachers.find(t => t.uid === entry.teacherId);
                    return (
                      <div
                        key={entry.id}
                        className={`p-3.5 rounded-lg border ${
                          entry.status === 'cancelled'
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 opacity-75'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-semibold text-[#111111] dark:text-zinc-200 tabular-nums">
                            {entry.startTime} – {entry.endTime}
                          </span>
                          <div className="flex items-center gap-2">
                            {entry.status && entry.status !== 'scheduled' && <StatusText status={entry.status} />}
                            {entry.room && (
                              <span className="text-[11px] font-mono text-[#52525B] dark:text-zinc-400 truncate max-w-[110px]">
                                {entry.room}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm font-semibold text-[#111111] dark:text-zinc-100 mt-1">
                          {entry.subjectName || sub?.name || 'Subject'}
                          {entry.type && <span className="ml-1.5 text-[11px] font-normal text-[#52525B]">({entry.type})</span>}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#52525B] dark:text-zinc-400">
                          <span>{entry.className || cls?.name || 'Class'}</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {entry.substituteTeacherName
                              ? `${entry.substituteTeacherName} (Sub)`
                              : (entry.teacherName || tea?.name || 'Faculty')}
                          </span>
                        </div>

                        {canManage && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-200/70 dark:border-zinc-700/60 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openSubModal(entry)}
                              className="text-[11px] font-medium text-[#27272A] dark:text-zinc-300 hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Substitute/Status
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              className="text-[11px] font-medium text-[#52525B] dark:text-slate-300 hover:underline flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry)}
                              className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-zinc-400 dark:text-[#52525B] py-8 text-center">No lectures scheduled</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day Agenda View */}
      {viewMode === 'agenda' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
                  selectedDay === d
                    ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white border-[#111111] dark:border-white'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-[#52525B] dark:text-slate-300 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-[#52525B]">
                  <th className="py-3 pr-4 font-semibold">Time</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Class / Section</th>
                  <th className="py-3 px-4 font-semibold">Faculty</th>
                  <th className="py-3 px-4 font-semibold">Venue</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {canManage && <th className="py-3 pl-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {visibleEntries.filter(e => e.day === selectedDay).map(entry => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 font-mono text-xs tabular-nums">{entry.startTime} – {entry.endTime}</td>
                    <td className="py-3 px-4 font-medium text-[#111111] dark:text-zinc-100">{entry.subjectName}</td>
                    <td className="py-3 px-4 text-[#52525B] dark:text-slate-300">{entry.className}</td>
                    <td className="py-3 px-4 text-[#52525B] dark:text-slate-300">{entry.substituteTeacherName || entry.teacherName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#52525B]">{entry.room || '—'}</td>
                    <td className="py-3 px-4"><StatusText status={entry.status || 'scheduled'} /></td>
                    {canManage && (
                      <td className="py-3 pl-4 text-right space-x-2">
                        <button onClick={() => openEditModal(entry)} className="text-xs text-[#111111] hover:underline">Edit</button>
                        <button onClick={() => handleDeleteEntry(entry)} className="text-xs text-rose-600 hover:underline">Remove</button>
                      </td>
                    )}
                  </tr>
                ))}
                {visibleEntries.filter(e => e.day === selectedDay).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-zinc-400">No sessions scheduled on {selectedDay}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Calendar View */}
      {viewMode === 'monthly' && (() => {
        const year = monthCursor.getFullYear();
        const month = monthCursor.getMonth();
        const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0..Sun=6
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-[#52525B]">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((dayNum, idx) => {
                if (!dayNum) return <div key={`empty-${idx}`} className="min-h-[84px] rounded-lg bg-zinc-50/50 dark:bg-zinc-800/20" />;
                const dateObj = new Date(year, month, dayNum);
                const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const weekday = dayNames[dateObj.getDay()];
                const daySlots = visibleEntries.filter(e => e.day === weekday || e.rescheduledDate === isoDate);
                return (
                  <div key={isoDate} className="min-h-[90px] rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50/40 dark:bg-zinc-800/30 flex flex-col gap-1">
                    <span className="text-[11px] font-mono font-semibold text-[#52525B] dark:text-slate-300">{dayNum}</span>
                    {daySlots.slice(0, 3).map(sl => (
                      <div
                        key={sl.id}
                        className={`text-[10px] leading-tight px-1.5 py-1 rounded truncate ${
                          sl.status === 'cancelled'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 line-through'
                            : sl.status === 'rescheduled'
                              ? 'bg-zinc-100 dark:bg-amber-950/60 text-[#27272A] dark:text-zinc-300'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200'
                        }`}
                        title={`${sl.startTime} ${sl.subjectName} (${sl.room || 'TBA'})`}
                      >
                        {sl.startTime} {sl.subjectName}
                      </div>
                    ))}
                    {daySlots.length > 3 && (
                      <span className="text-[10px] text-zinc-400">+{daySlots.length - 3} more</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Faculty Workload Matrix */}
      {viewMode === 'workload' && canManage && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
          <h3 className="text-base font-semibold text-[#111111] dark:text-zinc-100 mb-4">Weekly Faculty Teaching Load</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-[#52525B]">
                  <th className="py-3 pr-4 font-semibold">Faculty Member</th>
                  <th className="py-3 px-4 font-semibold">Sessions / Wk</th>
                  <th className="py-3 px-4 font-semibold">Scheduled Hours</th>
                  <th className="py-3 px-4 font-semibold">Weekly Target</th>
                  <th className="py-3 pl-4 font-semibold">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {workloadByTeacher.map(w => {
                  const pct = Math.min(100, Math.round((w.hours / Math.max(1, w.target)) * 100));
                  return (
                    <tr key={w.uid}>
                      <td className="py-3 pr-4 font-medium">{w.teacherName}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{w.sessions}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{w.hours.toFixed(1)}h</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{w.target}h</td>
                      <td className="py-3 pl-4 w-56">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${pct > 95 ? 'bg-zinc-1000' : 'bg-[#111111] dark:bg-white dark:text-zinc-950'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono tabular-nums w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {workloadByTeacher.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">No faculty workload records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {visibleEntries.length === 0 && viewMode === 'grid' && !canManage && (
        <EmptyState
          icon={Calendar}
          title="No Timetable Slots Found"
          description="Your timetable slots will appear here once Academic Scheduling publishes your class schedule."
        />
      )}

      {/* Add / Edit Slot Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry ? 'Edit Timetable Slot' : 'Schedule Timetable Slot'}
        subtitle="Automatic teacher, section, room, and seat-capacity conflict detection."
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          {conflictCheck.hasConflict && (
            <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Scheduling Conflict Detected
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {conflictCheck.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <label className="flex items-center gap-2 pt-1 font-medium cursor-pointer">
                <input type="checkbox" checked={forceOverride} onChange={e => setForceOverride(e.target.checked)} />
                Administrative override (allow conflict)
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">Class / Section</label>
              <select required value={formClassId} onChange={e => setFormClassId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">Subject</label>
              <select required value={formSubjectId} onChange={e => setFormSubjectId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">Faculty / Instructor</label>
              <select required value={formTeacherId} onChange={e => setFormTeacherId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">Room / Lab</label>
              <select value={formRoomId} onChange={e => setFormRoomId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} · {r.name} (Cap: {r.capacity})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">Day</label>
              <select value={formDay} onChange={e => setFormDay(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">Session Type</label>
              <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="lecture">Lecture</option>
                <option value="lab">Practical / Lab</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">Start Time</label>
              <input type="time" required value={formStartTime} onChange={e => setFormStartTime(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] dark:text-slate-300 mb-1">End Time</label>
              <input type="time" required value={formEndTime} onChange={e => setFormEndTime(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (conflictCheck.hasConflict && !forceOverride)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingEntry ? 'Save Changes' : 'Schedule Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Substitution / Reschedule Modal */}
      <Modal
        open={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        title="Reschedule / Assign Substitute Teacher"
        subtitle={subEntry ? `${subEntry.className} · ${subEntry.subjectName} (${subEntry.day} ${subEntry.startTime})` : ''}
      >
        <form onSubmit={handleSaveSubstitution} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Slot Status</label>
            <select value={subStatus} onChange={e => setSubStatus(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="scheduled">Scheduled (Active)</option>
              <option value="rescheduled">Rescheduled / Substitute</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Substitute Faculty (Optional)</label>
            <select value={subTeacherId} onChange={e => setSubTeacherId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">No Substitute</option>
              {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Effective Date (Optional)</label>
            <input type="date" value={subDate} onChange={e => setSubDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Adjustment Note</label>
            <input type="text" value={subNotes} onChange={e => setSubNotes(e.target.value)} placeholder="e.g. Prof. Rao covering lecture" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSubModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">Apply Adjustment</button>
          </div>
        </form>
      </Modal>

      {/* Auto-Generate Timetable Modal */}
      <Modal
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        title="Intelligent Timetable Generator"
        subtitle="Automatically allocates weekly lectures and labs without faculty, room, or section conflicts."
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Target Class / Section</label>
              <select
                value={autoClassId}
                onChange={e => handleClassChangeAuto(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={autoClearExisting} onChange={e => setAutoClearExisting(e.target.checked)} />
                Replace existing timetable slots for this class
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#3F3F46] dark:text-slate-300">Subject & Faculty Weekly Allocations</p>
              <button
                type="button"
                onClick={() =>
                  setAutoAllocations(prev => [
                    ...prev,
                    { subjectId: subjects[0]?.id || '', teacherId: teachers[0]?.uid || '', sessionsPerWeek: 3, type: 'lecture' }
                  ])
                }
                className="text-xs font-medium text-[#111111] dark:text-zinc-200 hover:underline"
              >
                + Add Subject Row
              </button>
            </div>

            {autoAllocations.map((alloc, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-50 dark:bg-zinc-800/70 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <select
                  value={alloc.subjectId}
                  onChange={e => setAutoAllocations(prev => prev.map((a, i) => (i === idx ? { ...a, subjectId: e.target.value } : a)))}
                  className="col-span-4 px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                >
                  <option value="">Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select
                  value={alloc.teacherId}
                  onChange={e => setAutoAllocations(prev => prev.map((a, i) => (i === idx ? { ...a, teacherId: e.target.value } : a)))}
                  className="col-span-4 px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                >
                  <option value="">Teacher</option>
                  {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                </select>
                <select
                  value={alloc.type}
                  onChange={e => setAutoAllocations(prev => prev.map((a, i) => (i === idx ? { ...a, type: e.target.value as any } : a)))}
                  className="col-span-2 px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                >
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                  <option value="tutorial">Tutorial</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={alloc.sessionsPerWeek}
                  onChange={e => setAutoAllocations(prev => prev.map((a, i) => (i === idx ? { ...a, sessionsPerWeek: Number(e.target.value) } : a)))}
                  className="col-span-1 px-2 py-1.5 text-xs text-center font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setAutoAllocations(prev => prev.filter((_, i) => i !== idx))}
                  className="col-span-1 text-rose-500 hover:text-rose-600 flex justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={runAutoPreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-[#111111]"
            >
              <Wand2 className="w-3.5 h-3.5" /> Generate Preview
            </button>
          </div>

          {autoPreview && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3.5 space-y-2.5 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#111111] dark:text-zinc-200">
                  Generated {autoPreview.generated.length} conflict-free sessions
                </p>
                {autoPreview.unplaced.length > 0 && (
                  <p className="text-xs text-[#27272A] dark:text-zinc-300">Unplaced: {autoPreview.unplaced.join(', ')}</p>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                {autoPreview.generated.map((g, i) => (
                  <div key={i} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono">{g.day} · {g.startTime}–{g.endTime}</span>
                    <span className="font-medium">{g.subjectName}</span>
                    <span className="text-[#52525B]">{g.teacherName}</span>
                    <span className="font-mono text-zinc-400">{g.room}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={commitAutoSchedule}
                  disabled={autoCommitting || autoPreview.generated.length === 0}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50"
                >
                  {autoCommitting ? 'Publishing...' : 'Publish Timetable'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
