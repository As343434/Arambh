import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  Users
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { PageHeader, StatCard, StatusText } from '../../components/ui/DataUI';
import { AttendanceCorrection, LeaveRequest, Submission, TimetableEntry } from '../../types';

export const TeacherDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { university, classes, subjects } = useUniversity();

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubs = [
      onSnapshot(
        query(collection(db, 'timetable'), where('teacherId', '==', profile.uid)),
        snap => setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry))),
        () => {}
      ),
      onSnapshot(
        collection(db, 'submissions'),
        snap => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission))),
        () => {}
      ),
      onSnapshot(
        collection(db, 'attendanceCorrections'),
        snap => setCorrections(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceCorrection))),
        () => {}
      ),
      onSnapshot(
        query(collection(db, 'leaveRequests'), where('staffId', '==', profile.uid)),
        snap => setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest))),
        () => {}
      )
    ];
    return () => unsubs.forEach(u => u());
  }, [profile?.uid]);

  const myClasses = useMemo(() => {
    return classes.filter(c =>
      c.mentorId === profile?.uid ||
      c.teacherId === profile?.uid ||
      timetable.some(t => t.classId === c.id)
    );
  }, [classes, profile?.uid, timetable]);

  const mentoredCount = useMemo(
    () => classes.filter(c => c.mentorId === profile?.uid).length,
    [classes, profile?.uid]
  );

  const totalStudentsCount = useMemo(() => {
    const ids = new Set<string>();
    myClasses.forEach(c => (c.students || []).forEach(sid => ids.add(sid)));
    return ids.size;
  }, [myClasses]);

  const todaySchedule = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = days[new Date().getDay()];
    return timetable
      .filter(s => s.day === todayDay)
      .map(s => {
        const sub = subjects.find(sb => sb.id === s.subjectId);
        const cls = classes.find(c => c.id === s.classId);
        return {
          ...s,
          subjectName: s.subjectName || sub?.name || 'Lecture',
          className: s.className || cls?.name || ''
        };
      })
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [timetable, subjects, classes]);

  const ungradedSubmissions = useMemo(
    () => submissions.filter(s => s.status !== 'graded').length,
    [submissions]
  );

  const pendingCorrections = useMemo(
    () => corrections.filter(c => c.status === 'pending').length,
    [corrections]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Faculty Workspace — ${profile?.name || 'Professor'}`}
        subtitle={`${university.shortName || university.name} · ${myClasses.length} active sections · ${timetable.length} weekly timetable slots`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/attendance" className="px-4 py-2.5 text-xs font-semibold bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 text-white rounded-2xl transition-colors">
              Mark Attendance
            </Link>
            <Link to="/lms" className="px-4 py-2.5 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              Manage LMS
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assigned Sections" value={myClasses.length} hint={`${mentoredCount} mentored cohorts`} icon={BookOpen} tone="navy" />
        <StatCard label="Total Students" value={totalStudentsCount} hint="Across assigned classes" icon={Users} tone="dark" />
        <StatCard label="Pending Grading" value={ungradedSubmissions} hint={`${pendingCorrections} attendance corrections`} icon={FileText} />
        <StatCard label="Weekly Teaching Load" value={`${timetable.length} hrs`} hint={`${todaySchedule.length} lectures today`} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <BookOpen className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                My Classes &amp; Mentorships
              </h2>
              <Link to="/classes" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">View all classes</Link>
            </div>
            <div className="space-y-3">
              {myClasses.length > 0 ? myClasses.map(cls => (
                <div key={cls.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{cls.name}</h3>
                      {cls.mentorId === profile?.uid && (
                        <span className="text-[11px] font-semibold text-[#52525B] dark:text-zinc-300">· Class Mentor</span>
                      )}
                    </div>
                    <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-0.5">
                      {Array.from(new Set(timetable.filter(t => t.classId === cls.id).map(t => t.subjectName || subjects.find(sb => sb.id === t.subjectId)?.name).filter(Boolean))).join(', ') || cls.subject || 'Assigned Cohort'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-500">{cls.students?.length || 0} students</span>
                    <Link to="/attendance" className="px-3.5 py-2 text-xs font-semibold rounded-2xl bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 text-white transition-colors">
                      Attendance
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-8 text-center">
                  <p className="text-xs text-[#52525B] dark:text-zinc-400">No classes assigned yet. Contact Academic Affairs or HOD.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100 mb-3">Faculty Workflows</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <Link to="/attendance" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <ClipboardCheck className="w-4 h-4 shrink-0" /> Attendance
              </Link>
              <Link to="/lms" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <GraduationCap className="w-4 h-4 shrink-0" /> LMS &amp; Quizzes
              </Link>
              <Link to="/assignments" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <FileText className="w-4 h-4 shrink-0" /> Assignments
              </Link>
              <Link to="/examinations" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <Award className="w-4 h-4 shrink-0" /> Marks Entry
              </Link>
              <Link to="/notices" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <Bell className="w-4 h-4 shrink-0" /> Notices &amp; Messages
              </Link>
              <Link to="/hr" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <Calendar className="w-4 h-4 shrink-0" /> Apply Leave ({leaves.length})
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <Calendar className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                Today&apos;s Teaching Schedule
              </h2>
              <Link to="/timetable" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Full week</Link>
            </div>
            <div className="space-y-2.5">
              {todaySchedule.length > 0 ? todaySchedule.map(slot => (
                <div key={slot.id} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono font-semibold text-[#111111] dark:text-zinc-200">{slot.startTime} - {slot.endTime}</p>
                    <p className="text-xs font-semibold truncate">{slot.subjectName}</p>
                    <p className="text-[11px] text-[#52525B] dark:text-zinc-400">{slot.className}</p>
                  </div>
                  {slot.room && <span className="text-[11px] font-mono text-zinc-500 shrink-0">{slot.room}</span>}
                </div>
              )) : (
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                  <p className="text-xs text-[#52525B] dark:text-zinc-400">No lectures scheduled for today.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">Recent Leave Applications</h2>
              <Link to="/hr" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Request leave</Link>
            </div>
            {leaves.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {leaves.slice(0, 4).map(lv => (
                  <div key={lv.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium capitalize">{lv.leaveType} Leave</p>
                      <p className="text-[11px] font-mono text-zinc-500">{lv.startDate} → {lv.endDate}</p>
                    </div>
                    <StatusText status={lv.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">No leave requests submitted.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
