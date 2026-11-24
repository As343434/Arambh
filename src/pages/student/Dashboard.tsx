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
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  LifeBuoy,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { PageHeader, StatCard, StatusText } from '../../components/ui/DataUI';
import {
  CourseRegistration,
  Exam,
  ExamMark,
  ExamSchedule,
  Invoice,
  LmsMaterial,
  LmsProgress,
  Notice,
  Quiz,
  Submission,
  TimetableEntry
} from '../../types';

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const {
    university,
    settings,
    campuses,
    departments,
    programs,
    academicYears,
    semesters,
    classes,
    subjects,
    academicEvents,
    users
  } = useUniversity();

  const [attendance, setAttendance] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [registrations, setRegistrations] = useState<CourseRegistration[]>([]);
  const [materials, setMaterials] = useState<LmsMaterial[]>([]);
  const [progress, setProgress] = useState<LmsProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const studentClass = useMemo(
    () => classes.find(c => c.id === profile?.classId || c.students?.includes(profile?.uid || '')) || null,
    [classes, profile?.classId, profile?.uid]
  );

  const enrolledClasses = useMemo(
    () => classes.filter(c => c.id === profile?.classId || c.students?.includes(profile?.uid || '')),
    [classes, profile?.classId, profile?.uid]
  );

  const campus = campuses.find(c => c.id === profile?.campusId);
  const department = departments.find(d => d.id === (profile?.departmentId || studentClass?.departmentId));
  const program = programs.find(p => p.id === (profile?.programId || studentClass?.programId));
  const academicYear = academicYears.find(y => y.id === profile?.academicYearId) || academicYears.find(y => y.isCurrent);
  const semester = semesters.find(s => s.id === (profile?.semesterId || studentClass?.semesterId)) || semesters.find(s => s.isCurrent);
  const mentor = users.find(u => u.uid === (profile?.advisorId || studentClass?.mentorId));

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubs = [
      onSnapshot(
        query(collection(db, 'attendance'), where('studentId', '==', profile.uid)),
        snap => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setAttendance(rows);
          setLoading(false);
        },
        () => setLoading(false)
      ),
      onSnapshot(
        collection(db, 'notices'),
        snap => {
          const rows = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Notice))
            .filter(n =>
              n.targetRole === 'all' ||
              n.targetRole === 'student' ||
              (n.targetRole === 'class' && enrolledClasses.some(c => c.id === n.targetClassId)) ||
              (n.targetDepartmentId && n.targetDepartmentId === department?.id)
            )
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setNotices(rows.slice(0, 5));
        },
        () => {}
      ),
      onSnapshot(
        collection(db, 'assignments'),
        snap => {
          const clsIds = new Set(enrolledClasses.map(c => c.id));
          const rows = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(a => clsIds.size === 0 || clsIds.has(a.classId))
            .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
          setAssignments(rows);
        },
        () => {}
      ),
      onSnapshot(
        query(collection(db, 'submissions'), where('studentId', '==', profile.uid)),
        snap => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission))),
        () => {}
      ),
      onSnapshot(collection(db, 'timetable'), snap => setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry))), () => {}),
      onSnapshot(
        query(collection(db, 'examMarks'), where('studentId', '==', profile.uid), where('isPublished', '==', true)),
        snap => setMarks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark))),
        () => {}
      ),
      onSnapshot(
        query(collection(db, 'invoices'), where('studentId', '==', profile.uid)),
        snap => setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))),
        () => {}
      ),
      onSnapshot(collection(db, 'quizzes'), snap => setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz)).filter(q => q.isPublished)), () => {}),
      onSnapshot(collection(db, 'exams'), snap => setExams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam))), () => {}),
      onSnapshot(collection(db, 'examSchedules'), snap => setExamSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamSchedule))), () => {}),
      onSnapshot(
        query(collection(db, 'courseRegistrations'), where('studentId', '==', profile.uid)),
        snap => setRegistrations(snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseRegistration))),
        () => {}
      ),
      onSnapshot(collection(db, 'lmsMaterials'), snap => setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() } as LmsMaterial))), () => {}),
      onSnapshot(
        query(collection(db, 'lmsProgress'), where('studentId', '==', profile.uid)),
        snap => setProgress(snap.docs.map(d => ({ id: d.id, ...d.data() } as LmsProgress))),
        () => {}
      )
    ];

    return () => unsubs.forEach(u => u());
  }, [profile?.uid, enrolledClasses, department?.id]);

  const attStats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'excused').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, percentage };
  }, [attendance]);

  const academicStats = useMemo(() => {
    const passedMarks = marks.filter(m => m.status === 'pass');
    const creditsEarned = passedMarks.reduce((sum, m) => sum + (m.credits || 4), 0);
    const totalRequired = program?.totalCredits || 0;
    const creditsRemaining = Math.max(0, totalRequired - creditsEarned);

    let pts = 0;
    let totalWeightedCredits = 0;
    marks.forEach(m => {
      const c = m.credits || 4;
      pts += (m.gradePoint || 0) * c;
      totalWeightedCredits += c;
    });
    const cgpa = totalWeightedCredits > 0 ? (pts / totalWeightedCredits).toFixed(2) : '—';

    const currentMarks = semester ? marks.filter(m => m.examTitle?.includes(semester.name) || true) : marks;
    let sPts = 0;
    let sCred = 0;
    currentMarks.forEach(m => {
      const c = m.credits || 4;
      sPts += (m.gradePoint || 0) * c;
      sCred += c;
    });
    const gpa = sCred > 0 ? (sPts / sCred).toFixed(2) : '—';

    return { creditsEarned, totalRequired, creditsRemaining, cgpa, gpa };
  }, [marks, program?.totalCredits, semester]);

  const outstandingFees = useMemo(() => {
    return invoices
      .filter(i => i.status !== 'paid' && i.status !== 'refunded')
      .reduce((sum, i) => sum + Math.max(0, (i.totalAmount || 0) - (i.paidAmount || 0)), 0);
  }, [invoices]);

  const todaySchedule = useMemo(() => {
    const clsIds = new Set(enrolledClasses.map(c => c.id));
    if (clsIds.size === 0) return [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = days[new Date().getDay()];
    return timetable
      .filter(s => clsIds.has(s.classId) && s.day === todayDay && s.status !== 'cancelled')
      .map(s => {
        const sub = subjects.find(sb => sb.id === s.subjectId);
        return { ...s, subjectName: s.subjectName || sub?.name || 'Lecture' };
      })
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [enrolledClasses, timetable, subjects]);

  const nextClass = useMemo(() => {
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return todaySchedule.find(s => (s.endTime || '') > nowHHMM) || null;
  }, [todaySchedule]);

  const pendingAssignments = useMemo(() => {
    const submittedIds = new Set(submissions.filter(s => !s.isDraft).map(s => s.assignmentId));
    return assignments.filter(a => !submittedIds.has(a.id));
  }, [assignments, submissions]);

  const upcomingExams = useMemo(() => {
    const clsIds = new Set(enrolledClasses.map(c => c.id));
    const today = new Date().toISOString().split('T')[0];
    return examSchedules
      .filter(es => (clsIds.size === 0 || clsIds.has(es.classId)) && (es.date || '') >= today)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [examSchedules, enrolledClasses]);

  const courseProgressPct = useMemo(() => {
    const clsIds = new Set(enrolledClasses.map(c => c.id));
    const relevantMats = materials.filter(m => clsIds.size === 0 || clsIds.has(m.classId));
    if (relevantMats.length === 0) return 0;
    const completedIds = new Set(progress.filter(p => p.completed).map(p => p.materialId));
    const done = relevantMats.filter(m => completedIds.has(m.id)).length;
    return Math.round((done / relevantMats.length) * 100);
  }, [enrolledClasses, materials, progress]);

  const threshold = settings.attendanceThreshold || 75;

  const quickActions = [
    { label: 'Register Courses', to: '/student/registration', icon: BookOpen },
    { label: 'View Timetable', to: '/timetable', icon: Calendar },
    { label: 'Attendance', to: '/attendance', icon: ClipboardCheck },
    { label: 'Submit Work', to: '/assignments', icon: FileText },
    { label: 'View Exams', to: '/examinations', icon: Award },
    { label: 'Results & GPA', to: '/examinations', icon: TrendingUp },
    { label: 'Pay Fees', to: '/finance', icon: CreditCard },
    { label: 'Certificates', to: '/certificates', icon: FileCheck2 },
    { label: 'Contact Support', to: '/support', icon: LifeBuoy }
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile?.name || 'Student'}`}
        subtitle={`${university.name || 'University Portal'} · Student ID ${profile?.studentId || profile?.rollNo || 'Pending'} · ${program?.name || 'Degree Program'}${department ? ` · ${department.name}` : ''}`}
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/student/profile"
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
            >
              {profile?.photoUrl && !imgError ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-6 h-6 rounded-xl object-cover"
                />
              ) : (
                <span className="w-6 h-6 rounded-xl bg-[#27272A] dark:bg-zinc-800 text-white flex items-center justify-center font-bold text-[11px]">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              )}
              <span>My Profile</span>
            </Link>
            <Link
              to="/student/courses"
              className="px-4 py-2.5 rounded-2xl bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold whitespace-nowrap transition-colors"
            >
              My Courses
            </Link>
          </div>
        }
      />

      {/* Student Identity Summary Strip */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[#52525B] dark:text-zinc-300">
          <span>Campus: <strong className="text-[#111111] dark:text-zinc-100">{campus?.name || 'Not assigned'}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Academic Year: <strong className="font-mono text-[#111111] dark:text-zinc-100">{academicYear?.name || 'Not set'}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Semester: <strong className="font-mono text-[#111111] dark:text-zinc-100">{semester?.name || (profile?.semesterNumber ? `Sem ${profile.semesterNumber}` : 'Not assigned')}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Section: <strong className="text-[#111111] dark:text-zinc-100">{studentClass?.name || profile?.section || 'Unassigned'}</strong></span>
          {mentor && (
            <>
              <span aria-hidden="true">·</span>
              <span>Advisor: <strong className="text-[#111111] dark:text-zinc-100">{mentor.name}</strong></span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">Standing: <strong className="capitalize text-[#111111] dark:text-zinc-200">{(profile?.academicStanding || 'good_standing').replace('_', ' ')}</strong></span>
          <StatusText status={profile?.status || 'active'} />
        </div>
      </div>

      {/* Hold or Low Attendance Alert */}
      {(profile?.registrationHold || (attStats.total > 0 && attStats.percentage < threshold)) && (
        <div className="bg-[#27272A] dark:bg-zinc-900 text-white border border-[#27272A] dark:border-zinc-700 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_6px_18px_-6px_rgba(0,0,0,0.16)]">
          <div className="space-y-1">
            {profile?.registrationHold && (
              <p className="font-semibold">Registration Hold Active: {profile.registrationHoldReason || 'Contact Registrar or Finance Office to clear hold.'}</p>
            )}
            {attStats.total > 0 && attStats.percentage < threshold && (
              <p>
                Attendance Alert: Current overall attendance is <strong className="font-mono">{attStats.percentage}%</strong> (minimum required <strong className="font-mono">{threshold}%</strong>).
              </p>
            )}
          </div>
          <Link to="/attendance" className="px-4 py-2 rounded-2xl bg-white text-[#111111] font-semibold shrink-0 hover:bg-zinc-200 transition-colors">
            Review Attendance
          </Link>
        </div>
      )}

      {/* Hero Academic Progress Card */}
      <div className="bg-[#111111] dark:bg-zinc-900 border border-[#111111] dark:border-zinc-800 rounded-3xl p-6 text-white shadow-[0_10px_28px_-8px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <p className="text-xs font-medium text-zinc-400">Academic Progress &amp; LMS Completion</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono tabular-nums">{courseProgressPct}%</span>
              <span className="text-xs text-zinc-400">
                {registrations.filter(r => r.status === 'registered').length} active registrations · {academicStats.creditsEarned} / {academicStats.totalRequired} credits earned
              </span>
            </div>
            <div className="h-2.5 bg-[#27272A] rounded-full overflow-hidden max-w-md">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.max(4, courseProgressPct)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-[#27272A] border border-zinc-700/60">
              <p className="text-[11px] text-zinc-400">GPA / CGPA</p>
              <p className="text-base font-bold font-mono tabular-nums mt-0.5">{academicStats.cgpa !== '—' ? `${academicStats.gpa} / ${academicStats.cgpa}` : '—'}</p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[#27272A] border border-zinc-700/60">
              <p className="text-[11px] text-zinc-400">Attendance</p>
              <p className="text-base font-bold font-mono tabular-nums mt-0.5">{attStats.total > 0 ? `${attStats.percentage}%` : 'No Data'}</p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[#27272A] border border-zinc-700/60">
              <p className="text-[11px] text-zinc-400">Credits Left</p>
              <p className="text-base font-bold font-mono tabular-nums mt-0.5">{academicStats.creditsRemaining}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="GPA / CGPA"
          value={academicStats.cgpa !== '—' ? `${academicStats.gpa} / ${academicStats.cgpa}` : '—'}
          hint={`${marks.length} published grades · ${academicStats.creditsEarned} / ${academicStats.totalRequired} credits`}
          icon={Award}
          tone="navy"
        />
        <StatCard
          label="Credits Remaining"
          value={academicStats.creditsRemaining}
          hint={`${registrations.filter(r => r.status === 'registered').length} active course registrations`}
          icon={GraduationCap}
          tone="default"
        />
        <StatCard
          label="Overall Attendance"
          value={attStats.total > 0 ? `${attStats.percentage}%` : 'No Records'}
          hint={attStats.total > 0 ? `${attStats.present} of ${attStats.total} sessions attended` : `Threshold ${threshold}%`}
          icon={TrendingUp}
          tone="dark"
        />
        <StatCard
          label="Outstanding Fees"
          value={`${university.currency || 'INR'} ${outstandingFees.toLocaleString()}`}
          hint={`${invoices.filter(i => i.status !== 'paid').length} unpaid invoices · ${courseProgressPct}% LMS progress`}
          icon={Wallet}
          tone="default"
        />
      </div>

      {/* Quick Actions Strip */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold text-[#52525B] dark:text-zinc-400 mb-3">Quick Student Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
          {quickActions.map(act => (
            <Link
              key={act.label}
              to={act.to}
              className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-[#111111] hover:border-[#111111] dark:hover:bg-white dark:hover:border-white text-center transition-colors"
            >
              <act.icon className="w-4 h-4 text-[#111111] dark:text-zinc-200 group-hover:text-white dark:group-hover:text-zinc-950 transition-colors" />
              <span className="text-[11px] font-medium text-[#111111] dark:text-zinc-200 group-hover:text-white dark:group-hover:text-zinc-950 whitespace-nowrap transition-colors">{act.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns */}
        <div className="lg:col-span-7 space-y-6">
          {/* Next Class & Today's Schedule */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <Clock className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                Today&apos;s Timetable &amp; Next Class
              </h2>
              <Link to="/timetable" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Full timetable</Link>
            </div>

            {nextClass && (
              <div className="mb-4 p-4 rounded-2xl bg-[#111111] dark:bg-zinc-800 text-white flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400">Next Scheduled Class</p>
                  <p className="text-sm font-bold text-white mt-0.5">{nextClass.subjectName}</p>
                  <p className="text-xs text-zinc-300">
                    {nextClass.substituteTeacherName ? `Substitute: ${nextClass.substituteTeacherName}` : nextClass.teacherName}
                    {nextClass.room ? ` · Room ${nextClass.room}` : ''}
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-white bg-[#27272A] px-3 py-1.5 rounded-xl shrink-0">
                  {nextClass.startTime} – {nextClass.endTime}
                </span>
              </div>
            )}

            {todaySchedule.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {todaySchedule.map(slot => (
                  <div key={slot.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111111] dark:text-zinc-100 truncate">{slot.subjectName}</p>
                      <p className="text-[#52525B] dark:text-zinc-400 truncate">{slot.teacherName || 'Faculty'} · {slot.type || 'lecture'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-medium text-[#111111] dark:text-zinc-200">{slot.startTime} - {slot.endTime}</p>
                      <p className="font-mono text-[11px] text-zinc-500">{slot.room || 'TBA'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">No lectures scheduled for today.</p>
              </div>
            )}
          </div>

          {/* Pending Assignments & Upcoming Deadlines */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <FileText className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                Pending Assignments ({pendingAssignments.length}) &amp; Quizzes ({quizzes.length})
              </h2>
              <Link to="/assignments" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Open assignments</Link>
            </div>
            {pendingAssignments.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pendingAssignments.slice(0, 5).map(assign => (
                  <div key={assign.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#111111] dark:text-zinc-100 truncate">{assign.title}</p>
                      <p className="text-[11px] text-[#52525B] dark:text-zinc-400 mt-0.5">
                        {assign.subjectName || assign.className} · Max {assign.maxMarks || 100} pts · Due <span className="font-mono">{assign.dueDate}</span>
                      </p>
                    </div>
                    <Link
                      to="/assignments"
                      className="px-3.5 py-2 text-xs font-semibold rounded-2xl bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 text-white transition-colors shrink-0"
                    >
                      Submit
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">All current assignments have been submitted.</p>
              </div>
            )}
          </div>

          {/* Course Progress & Recent Grades */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <Award className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                Recent Published Grades &amp; Learning Progress
              </h2>
              <Link to="/examinations" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Full transcript</Link>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#52525B] dark:text-zinc-400">LMS Course Material Completion</span>
                <span className="font-mono font-semibold tabular-nums">{courseProgressPct}%</span>
              </div>
              <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#111111] dark:bg-white rounded-full" style={{ width: `${courseProgressPct}%` }} />
              </div>
            </div>

            {marks.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {marks.slice(0, 4).map(m => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#111111] dark:text-zinc-100">{m.subjectName}</p>
                      <p className="text-[11px] text-[#52525B]">{m.examTitle} · {m.credits || 4} credits</p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="font-semibold text-[#111111] dark:text-zinc-100">{m.grade} ({m.totalMarks}/{m.maxMarks})</p>
                      <StatusText status={m.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">No published exam grades yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns */}
        <div className="lg:col-span-5 space-y-6">
          {/* Announcements & Notifications */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <Bell className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                Announcements &amp; Circulars
              </h2>
              <Link to="/notices" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Messages &amp; notices</Link>
            </div>
            {notices.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {notices.map(notice => (
                  <div key={notice.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-semibold text-[#111111] dark:text-zinc-100">{notice.title}</h3>
                      <span className="text-[11px] text-zinc-400 shrink-0">{notice.authorName}</span>
                    </div>
                    <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1 line-clamp-2">{notice.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">No announcements at this time.</p>
              </div>
            )}
          </div>

          {/* Upcoming Examinations */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <Award className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                Upcoming Examinations ({upcomingExams.length || exams.length})
              </h2>
              <Link to="/examinations" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Exam hall &amp; seats</Link>
            </div>
            {upcomingExams.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {upcomingExams.slice(0, 4).map(es => (
                  <div key={es.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#111111] dark:text-zinc-100">{es.subjectName}</p>
                      <p className="text-[11px] text-[#52525B]">{es.examTitle} · Room {es.roomName || 'TBA'}</p>
                    </div>
                    <div className="text-right font-mono text-[11px] text-[#52525B] dark:text-zinc-300">
                      <p>{es.date}</p>
                      <p>{es.startTime} - {es.endTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">No upcoming exam sessions scheduled.</p>
              </div>
            )}
          </div>

          {/* Academic Calendar Milestones */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[#111111] dark:text-zinc-100">
                <Calendar className="w-4 h-4 text-[#111111] dark:text-zinc-300" />
                Academic Calendar &amp; Deadlines
              </h2>
              <Link to="/calendar" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Open calendar</Link>
            </div>
            {academicEvents.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {academicEvents.slice(0, 5).map(ev => (
                  <div key={ev.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-[#111111] dark:text-zinc-100 truncate">{ev.title}</p>
                      <p className="text-[11px] text-[#52525B] capitalize">{ev.type.replace('_', ' ')}</p>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-500 shrink-0">{ev.startDate}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">No academic calendar events posted yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
