import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileEdit,
  Percent,
  Users
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { exportToCsv, logAudit } from '../services/erpService';
import { Attendance as AttendanceType, AttendanceCorrection, TimetableEntry } from '../types';

export const Attendance: React.FC = () => {
  const { profile, isStudent, isTeacher, isParent, can } = useAuth();
  const { classes, subjects, settings, students, users } = useUniversity();
  const canMark = can('attendance.mark');

  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(canMark ? 'mark' : isStudent ? 'subjects' : 'overview');
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Marking state
  const [markDate, setMarkDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = useState<'lecture' | 'daily' | 'practical'>('lecture');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [records, setRecords] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [filterClassId, setFilterClassId] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Correction modal (student)
  const [corrOpen, setCorrOpen] = useState(false);
  const [corrDate, setCorrDate] = useState(new Date().toISOString().split('T')[0]);
  const [corrSubjectId, setCorrSubjectId] = useState('');
  const [corrCurrentStatus, setCorrCurrentStatus] = useState('absent');
  const [corrRequestedStatus, setCorrRequestedStatus] = useState<'present' | 'late' | 'excused'>('present');
  const [corrReason, setCorrReason] = useState('');
  const [corrAttId, setCorrAttId] = useState('');

  const linkedStudent = useMemo(() => {
    if (!isParent || !profile?.parentOfStudentIds?.length) return null;
    return users.find(u => profile.parentOfStudentIds?.includes(u.uid)) || null;
  }, [isParent, profile?.parentOfStudentIds, users]);

  const targetStudentUid = isStudent ? profile?.uid : isParent ? linkedStudent?.uid : undefined;

  useEffect(() => {
    const attQ = targetStudentUid
      ? query(collection(db, 'attendance'), where('studentId', '==', targetStudentUid))
      : collection(db, 'attendance');
    const corrQ = targetStudentUid
      ? query(collection(db, 'attendanceCorrections'), where('studentId', '==', targetStudentUid))
      : collection(db, 'attendanceCorrections');

    const unsubAtt = onSnapshot(
      attQ,
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceType));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setAttendance(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    const unsubCorr = onSnapshot(corrQ, snap => {
      setCorrections(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceCorrection)));
    }, () => {});
    const unsubTT = onSnapshot(collection(db, 'timetable'), snap => {
      setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)));
    }, () => {});
    return () => {
      unsubAtt();
      unsubCorr();
      unsubTT();
    };
  }, [targetStudentUid]);

  const accessibleClasses = useMemo(() => {
    if (can('academics.manage') || can('reports.view')) return classes;
    if (isTeacher && profile?.uid) {
      const ttClassIds = new Set(timetable.filter(t => t.teacherId === profile.uid || t.substituteTeacherId === profile.uid).map(t => t.classId));
      return classes.filter(c => c.teacherId === profile.uid || c.mentorId === profile.uid || ttClassIds.has(c.id));
    }
    if (targetStudentUid) {
      return classes.filter(c => c.students?.includes(targetStudentUid));
    }
    return classes;
  }, [classes, timetable, isTeacher, targetStudentUid, profile?.uid, can]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId) || null, [classes, selectedClassId]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students
      .filter(s => selectedClass.students?.includes(s.uid) || s.classId === selectedClass.id)
      .sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''));
  }, [selectedClass, students]);

  const visibleAttendance = useMemo(() => {
    let list = attendance;
    if (targetStudentUid) {
      list = list.filter(a => a.studentId === targetStudentUid);
    } else if (isTeacher && !can('academics.manage') && profile?.uid) {
      const clsIds = new Set(accessibleClasses.map(c => c.id));
      list = list.filter(a => a.teacherId === profile.uid || clsIds.has(a.classId));
    }
    if (filterClassId) list = list.filter(a => a.classId === filterClassId);
    return list;
  }, [attendance, targetStudentUid, isTeacher, accessibleClasses, profile?.uid, filterClassId, can]);

  const threshold = settings.attendanceThreshold || 75;

  // Threshold warnings across students (teacher/admin) or subjects (student)
  const thresholdWarnings = useMemo(() => {
    if (targetStudentUid) {
      const bySub = new Map<string, { name: string; total: number; present: number }>();
      visibleAttendance.forEach(a => {
        const key = a.subjectId || 'general';
        const cur = bySub.get(key) || { name: a.subjectName || subjects.find(s => s.id === key)?.name || 'General Session', total: 0, present: 0 };
        cur.total += 1;
        if (a.status === 'present' || a.status === 'late' || a.status === 'excused') cur.present += 1;
        bySub.set(key, cur);
      });
      return Array.from(bySub.entries())
        .map(([id, v]) => ({ id, label: v.name, total: v.total, present: v.present, pct: Math.round((v.present / v.total) * 100) }))
        .filter(x => x.pct < threshold);
    }

    const byStudent = new Map<string, { name: string; rollNo: string; total: number; present: number }>();
    visibleAttendance.forEach(a => {
      const cur = byStudent.get(a.studentId) || {
        name: a.studentName || students.find(s => s.uid === a.studentId)?.name || 'Student',
        rollNo: a.rollNo || students.find(s => s.uid === a.studentId)?.rollNo || '',
        total: 0,
        present: 0
      };
      cur.total += 1;
      if (a.status === 'present' || a.status === 'late' || a.status === 'excused') cur.present += 1;
      byStudent.set(a.studentId, cur);
    });
    return Array.from(byStudent.entries())
      .map(([id, v]) => ({ id, label: `${v.name} (${v.rollNo || id.slice(0, 6)})`, total: v.total, present: v.present, pct: Math.round((v.present / v.total) * 100) }))
      .filter(x => x.pct < threshold);
  }, [targetStudentUid, visibleAttendance, subjects, students, threshold]);

  const stats = useMemo(() => {
    const total = visibleAttendance.length;
    const present = visibleAttendance.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'excused').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 100;
    const pendingCorr = corrections.filter(c => c.status === 'pending' && (!targetStudentUid || c.studentId === targetStudentUid)).length;
    return { total, present, pct, pendingCorr };
  }, [visibleAttendance, corrections, targetStudentUid]);

  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; present: number; absent: number; lectureTotal: number; lecturePresent: number; practicalTotal: number; practicalPresent: number }>();
    visibleAttendance.forEach(a => {
      const key = a.subjectId || 'general';
      const cur = map.get(key) || {
        name: a.subjectName || subjects.find(s => s.id === key)?.name || 'General Session',
        total: 0,
        present: 0,
        absent: 0,
        lectureTotal: 0,
        lecturePresent: 0,
        practicalTotal: 0,
        practicalPresent: 0
      };
      const attended = a.status === 'present' || a.status === 'late' || a.status === 'excused';
      cur.total += 1;
      if (attended) cur.present += 1;
      else cur.absent += 1;
      if (a.sessionType === 'practical') {
        cur.practicalTotal += 1;
        if (attended) cur.practicalPresent += 1;
      } else {
        cur.lectureTotal += 1;
        if (attended) cur.lecturePresent += 1;
      }
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      ...v,
      pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 100
    }));
  }, [visibleAttendance, subjects]);

  const markAll = (status: 'present' | 'absent' | 'late') => {
    const next: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    classStudents.forEach(s => { next[s.uid] = status; });
    setRecords(next);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !profile || Object.keys(records).length === 0) return;
    setSubmitting(true);
    try {
      const slot = timetable.find(t => t.id === selectedSlotId);
      const subId = slot?.subjectId || selectedSubjectId || '';
      const subName = slot?.subjectName || subjects.find(s => s.id === subId)?.name || 'Daily Session';
      const batch = writeBatch(db);

      Object.entries(records).forEach(([studentId, status]) => {
        const stu = students.find(s => s.uid === studentId);
        const ref = doc(collection(db, 'attendance'));
        batch.set(ref, {
          classId: selectedClass.id,
          className: selectedClass.name,
          subjectId: subId,
          subjectName: subName,
          timetableId: selectedSlotId || null,
          teacherId: profile.uid,
          studentId,
          studentName: stu?.name || 'Student',
          rollNo: stu?.rollNo || '',
          date: markDate,
          sessionType,
          status,
          remarks: remarks[studentId] || '',
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      await logAudit(profile, 'MARK_ATTENDANCE', 'Attendance', selectedClass.id, `${selectedClass.name} (${subName}) on ${markDate} for ${Object.keys(records).length} students`);
      setBanner({ type: 'success', text: `Attendance saved for ${Object.keys(records).length} student(s).` });
      setRecords({});
      setRemarks({});
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to submit attendance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const cls = accessibleClasses[0];
    const sub = subjects.find(s => s.id === corrSubjectId);
    const ref = await addDoc(collection(db, 'attendanceCorrections'), {
      attendanceId: corrAttId || null,
      studentId: profile.uid,
      studentName: profile.name,
      classId: cls?.id || profile.classId || '',
      className: cls?.name || 'Assigned Class',
      subjectId: corrSubjectId || null,
      subjectName: sub?.name || 'General',
      date: corrDate,
      currentStatus: corrCurrentStatus,
      requestedStatus: corrRequestedStatus,
      reason: corrReason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'REQUEST_ATTENDANCE_CORRECTION', 'Attendance', ref.id, `${corrDate}: ${corrCurrentStatus} -> ${corrRequestedStatus}`);
    setCorrOpen(false);
    setCorrReason('');
    setCorrAttId('');
    setBanner({ type: 'success', text: 'Attendance correction request submitted for review.' });
  };

  const handleReviewCorrection = async (corr: AttendanceCorrection, decision: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'attendanceCorrections', corr.id), {
      status: decision,
      reviewedBy: profile?.name || profile?.uid
    });
    if (decision === 'approved' && corr.attendanceId) {
      await updateDoc(doc(db, 'attendance', corr.attendanceId), {
        status: corr.requestedStatus,
        remarks: `Corrected: ${corr.reason}`
      });
    }
    await logAudit(profile, `CORRECTION_${decision.toUpperCase()}`, 'Attendance', corr.id, `${corr.studentName} (${corr.date})`);
    setBanner({ type: 'success', text: `Correction request ${decision}.` });
  };

  const visibleCorrections = useMemo(() => {
    return corrections
      .filter(c => (!targetStudentUid ? true : c.studentId === targetStudentUid))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [corrections, targetStudentUid]);

  if (loading) {
    return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance & Corrections"
        subtitle="Lecture-wise, daily, and practical attendance tracking with automated threshold alerts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  'attendance_report.csv',
                  visibleAttendance.map(a => ({
                    Date: a.date,
                    Student: a.studentName || a.studentId,
                    RollNo: a.rollNo || '',
                    Class: a.className || '',
                    Subject: a.subjectName || 'General',
                    SessionType: a.sessionType || 'lecture',
                    Status: a.status,
                    Remarks: a.remarks || ''
                  }))
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <Download className="w-3.5 h-3.5" /> Export Report
            </button>
            {isStudent && settings.allowStudentCorrectionRequests !== false && (
              <button
                type="button"
                onClick={() => setCorrOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
              >
                <FileEdit className="w-3.5 h-3.5" /> Request Correction
              </button>
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
          <span className="font-medium">{banner.text}</span>
          <button onClick={() => setBanner(null)} className="underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance Rate" value={`${stats.pct}%`} icon={Percent} tone={stats.pct >= threshold ? 'emerald' : 'rose'} hint={`Institutional minimum: ${threshold}%`} />
        <StatCard label="Present / Total" value={`${stats.present} / ${stats.total}`} icon={ClipboardCheck} tone="indigo" />
        <StatCard label="Threshold Warnings" value={thresholdWarnings.length} icon={AlertTriangle} tone={thresholdWarnings.length > 0 ? 'amber' : 'default'} hint={`Below ${threshold}% attendance`} />
        <StatCard label="Pending Corrections" value={stats.pendingCorr} icon={FileEdit} tone="default" />
      </div>

      {thresholdWarnings.length > 0 && (
        <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#111111] dark:text-zinc-300">
            <AlertTriangle className="w-4 h-4" />
            Attendance Below {threshold}% Threshold ({thresholdWarnings.length})
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-[#111111] dark:text-zinc-200">
            {thresholdWarnings.slice(0, 8).map(w => (
              <span key={w.id} className="font-mono bg-white/70 dark:bg-zinc-900/70 px-2.5 py-1 rounded-md border border-zinc-300 dark:border-amber-800">
                {w.label}: {w.pct}% ({w.present}/{w.total})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedTabs
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            ...(canMark ? [{ id: 'mark', label: 'Mark Attendance' }] : []),
            { id: 'subjects', label: 'Subject-Wise Summary', count: subjectBreakdown.length },
            { id: 'calendar', label: 'Monthly Calendar' },
            { id: 'overview', label: 'Attendance Register', count: visibleAttendance.length },
            { id: 'corrections', label: 'Correction Requests', count: visibleCorrections.length }
          ]}
        />
        {(activeTab === 'overview' || activeTab === 'subjects') && (
          <select
            value={filterClassId}
            onChange={e => setFilterClassId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            <option value="">All Classes</option>
            {accessibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Subject-Wise Breakdown */}
      {activeTab === 'subjects' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Lectures</th>
                  <th className="py-3 px-4 font-semibold">Practicals / Labs</th>
                  <th className="py-3 px-4 font-semibold">Attended / Missed</th>
                  <th className="py-3 px-4 font-semibold">Percentage</th>
                  <th className="py-3 px-4 font-semibold">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {subjectBreakdown.map(sub => (
                  <tr key={sub.id}>
                    <td className="py-3 px-4 font-medium">{sub.name}</td>
                    <td className="py-3 px-4 font-mono text-xs">{sub.lecturePresent} / {sub.lectureTotal}</td>
                    <td className="py-3 px-4 font-mono text-xs">{sub.practicalTotal > 0 ? `${sub.practicalPresent} / ${sub.practicalTotal}` : '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs">{sub.present} present · {sub.absent} missed</td>
                    <td className="py-3 px-4 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full ${sub.pct >= threshold ? 'bg-[#111111] dark:bg-white dark:text-zinc-950' : 'bg-rose-600'}`} style={{ width: `${sub.pct}%` }} />
                        </div>
                        <span className="text-xs font-mono font-semibold tabular-nums">{sub.pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={sub.pct >= threshold ? 'eligible' : 'shortage'} />
                    </td>
                  </tr>
                ))}
                {subjectBreakdown.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-zinc-400">No subject attendance recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Attendance Calendar */}
      {activeTab === 'calendar' && (() => {
        const y = calMonth.getFullYear();
        const m = calMonth.getMonth();
        const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
        const totalDays = new Date(y, m + 1, 0).getDate();
        const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
        return (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{calMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCalMonth(new Date(y, m - 1, 1))} className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Prev</button>
                <button type="button" onClick={() => setCalMonth(new Date(y, m + 1, 1))} className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Next</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-[#52525B]">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((day, idx) => {
                if (!day) return <div key={`c-${idx}`} className="min-h-[72px] rounded-lg bg-zinc-50/40 dark:bg-zinc-800/20" />;
                const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayRecs = visibleAttendance.filter(a => a.date === iso);
                return (
                  <div key={iso} className="min-h-[76px] rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 flex flex-col gap-1">
                    <span className="text-[11px] font-mono font-semibold text-[#52525B] dark:text-slate-300">{day}</span>
                    {dayRecs.slice(0, 2).map(r => (
                      <div key={r.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                        r.status === 'present' ? 'bg-zinc-100 dark:bg-zinc-800/60 text-[#111111] dark:text-zinc-200' :
                        r.status === 'absent' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' :
                        'bg-zinc-100 dark:bg-amber-950/60 text-[#27272A] dark:text-zinc-300'
                      }`}>
                        {r.subjectName || 'Session'}: {r.status}
                      </div>
                    ))}
                    {dayRecs.length > 2 && <span className="text-[10px] text-zinc-400">+{dayRecs.length - 2} more</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Mark Attendance */}
      {activeTab === 'mark' && canMark && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1">Date</label>
              <input
                type="date"
                value={markDate}
                onChange={e => setMarkDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1">Session Type</label>
              <select
                value={sessionType}
                onChange={e => setSessionType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="lecture">Lecture-wise</option>
                <option value="practical">Practical / Lab</option>
                <option value="daily">Daily Roll Call</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1">Class / Section</label>
              <select
                value={selectedClassId}
                onChange={e => {
                  setSelectedClassId(e.target.value);
                  setSelectedSlotId('');
                  setRecords({});
                }}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="">Select Class</option>
                {accessibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="">General / Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#52525B] mb-1">Timetable Slot (Optional)</label>
              <select
                value={selectedSlotId}
                onChange={e => {
                  setSelectedSlotId(e.target.value);
                  const sl = timetable.find(t => t.id === e.target.value);
                  if (sl?.subjectId) setSelectedSubjectId(sl.subjectId);
                }}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <option value="">Any / Ad-hoc</option>
                {timetable.filter(t => !selectedClassId || t.classId === selectedClassId).map(t => (
                  <option key={t.id} value={t.id}>{t.day} {t.startTime} · {t.subjectName}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedClass ? (
            classStudents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-medium text-[#52525B] flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {classStudents.length} Students in {selectedClass.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => markAll('present')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      Mark All Present
                    </button>
                    <button type="button" onClick={() => markAll('absent')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                      Mark All Absent
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-[#52525B]">
                        <th className="py-2.5 pr-4 font-semibold">Roll No</th>
                        <th className="py-2.5 px-4 font-semibold">Student Name</th>
                        <th className="py-2.5 px-4 font-semibold">Status</th>
                        <th className="py-2.5 pl-4 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                      {classStudents.map(stu => (
                        <tr key={stu.uid}>
                          <td className="py-2.5 pr-4 font-mono text-xs text-[#52525B]">{stu.rollNo || '—'}</td>
                          <td className="py-2.5 px-4 font-medium">{stu.name}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {(['present', 'absent', 'late', 'excused'] as const).map(st => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => setRecords(prev => ({ ...prev, [stu.uid]: st }))}
                                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                                    records[stu.uid] === st
                                      ? st === 'present'
                                        ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white'
                                        : st === 'absent'
                                          ? 'bg-rose-600 text-white'
                                          : st === 'late'
                                            ? 'bg-[#27272A] text-white'
                                            : 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-[#52525B] dark:text-slate-300'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 pl-4">
                            <input
                              type="text"
                              value={remarks[stu.uid] || ''}
                              onChange={e => setRemarks(prev => ({ ...prev, [stu.uid]: e.target.value }))}
                              placeholder="Optional note"
                              className="w-full max-w-[200px] px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    disabled={submitting || Object.keys(records).length === 0}
                    onClick={handleSaveAttendance}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : `Submit Attendance (${Object.keys(records).length})`}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState title="No Students Enrolled" description="Assign students to this class in Academic Structure or Users first." />
            )
          ) : (
            <EmptyState icon={ClipboardCheck} title="Select a Class" description="Choose a class/section above to load its student roster and mark attendance." />
          )}
        </div>
      )}

      {/* Register History */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  {!isStudent && <th className="py-3 px-4 font-semibold">Student</th>}
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold">Subject / Session</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Remarks</th>
                  {isStudent && <th className="py-3 px-4 font-semibold text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {visibleAttendance.slice(0, 100).map(rec => (
                  <tr key={rec.id}>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums">{rec.date}</td>
                    {!isStudent && (
                      <td className="py-3 px-4">
                        <span className="font-medium">{rec.studentName || students.find(s => s.uid === rec.studentId)?.name || rec.studentId}</span>
                        {rec.rollNo && <span className="ml-2 text-xs font-mono text-zinc-400">{rec.rollNo}</span>}
                      </td>
                    )}
                    <td className="py-3 px-4 text-[#52525B] dark:text-slate-300">{rec.className || '—'}</td>
                    <td className="py-3 px-4 text-[#52525B] dark:text-slate-300">
                      {rec.subjectName || subjects.find(s => s.id === rec.subjectId)?.name || 'General'}
                      {rec.sessionType && <span className="ml-1.5 text-[11px] text-zinc-400">({rec.sessionType})</span>}
                    </td>
                    <td className="py-3 px-4"><StatusText status={rec.status} /></td>
                    <td className="py-3 px-4 text-xs text-[#52525B]">{rec.remarks || '—'}</td>
                    {isStudent && (
                      <td className="py-3 px-4 text-right">
                        {rec.status === 'absent' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCorrAttId(rec.id);
                              setCorrDate(rec.date);
                              setCorrSubjectId(rec.subjectId || '');
                              setCorrCurrentStatus(rec.status);
                              setCorrOpen(true);
                            }}
                            className="text-xs text-[#111111] dark:text-zinc-200 hover:underline"
                          >
                            Dispute
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {visibleAttendance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-zinc-400">No attendance records recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Corrections */}
      {activeTab === 'corrections' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleCorrections.length > 0 ? visibleCorrections.map(c => (
            <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-[#111111] dark:text-zinc-100">{c.date}</span>
                  <span className="text-[#52525B]">· {c.studentName}</span>
                  <span className="text-zinc-400">({c.subjectName || c.className})</span>
                  <StatusText status={c.status} />
                </div>
                <p className="text-sm text-[#3F3F46] dark:text-slate-300">
                  Requested change: <strong className="capitalize">{c.currentStatus}</strong> → <strong className="capitalize">{c.requestedStatus}</strong>
                </p>
                <p className="text-xs text-[#52525B]">Reason: {c.reason}</p>
              </div>
              {canMark && c.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReviewCorrection(c, 'approved')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewCorrection(c, 'rejected')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          )) : (
            <div className="p-10 text-center text-xs text-zinc-400">No attendance correction requests found.</div>
          )}
        </div>
      )}

      {/* Request Correction Modal */}
      <Modal
        open={corrOpen}
        onClose={() => setCorrOpen(false)}
        title="Request Attendance Correction"
        subtitle="Submit medical, duty, or marking discrepancy details for faculty review."
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Session Date</label>
              <input type="date" required value={corrDate} onChange={e => setCorrDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Subject</label>
              <select value={corrSubjectId} onChange={e => setCorrSubjectId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">General</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Recorded Status</label>
              <input type="text" value={corrCurrentStatus} onChange={e => setCorrCurrentStatus(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Requested Status</label>
              <select value={corrRequestedStatus} onChange={e => setCorrRequestedStatus(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="excused">Excused Duty / Medical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Justification & Proof Details</label>
            <textarea required rows={3} value={corrReason} onChange={e => setCorrReason(e.target.value)} placeholder="Explain why the attendance record should be corrected..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCorrOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
