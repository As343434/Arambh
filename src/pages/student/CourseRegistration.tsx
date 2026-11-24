import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  UserCheck
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../../components/ui/DataUI';
import { logAudit } from '../../services/erpService';
import { AdvisingAppointment, CourseRegistration, ExamMark, TimetableEntry } from '../../types';

export const CourseRegistrationPage: React.FC = () => {
  const { profile } = useAuth();
  const { settings, programs, departments, semesters, courses, subjects, classes, teachers } = useUniversity();

  const [tab, setTab] = useState<'register' | 'audit' | 'advising'>('register');
  const [registrations, setRegistrations] = useState<CourseRegistration[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [appointments, setAppointments] = useState<AdvisingAppointment[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'core' | 'elective' | 'lab'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Advising Modal
  const [advModal, setAdvModal] = useState(false);
  const [advAdvisorId, setAdvAdvisorId] = useState('');
  const [advDate, setAdvDate] = useState('');
  const [advTime, setAdvTime] = useState('11:00');
  const [advTopic, setAdvTopic] = useState('');
  const [advNotes, setAdvNotes] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubs = [
      onSnapshot(
        query(collection(db, 'courseRegistrations'), where('studentId', '==', profile.uid)),
        s => setRegistrations(s.docs.map(d => ({ id: d.id, ...d.data() } as CourseRegistration))),
        () => {}
      ),
      onSnapshot(
        query(collection(db, 'examMarks'), where('studentId', '==', profile.uid)),
        s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark)).filter(m => m.isPublished)),
        () => {}
      ),
      onSnapshot(collection(db, 'timetable'), s => setTimetable(s.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry))), () => {}),
      onSnapshot(
        query(collection(db, 'advisingAppointments'), where('studentId', '==', profile.uid)),
        s => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() } as AdvisingAppointment))),
        () => {}
      )
    ];
    return () => unsubs.forEach(u => u());
  }, [profile?.uid]);

  const regConfig = settings.registrationConfig || {
    isOpen: true,
    minCredits: 12,
    maxCredits: 26,
    allowAddDrop: true,
    requireAdvisorApproval: false,
    enforcePrerequisites: true
  };

  const myProgram = programs.find(p => p.id === profile?.programId);
  const myDept = departments.find(d => d.id === profile?.departmentId);
  const currentSem = semesters.find(s => s.id === profile?.semesterId) || semesters.find(s => s.isCurrent);
  const myClass = classes.find(c => c.id === profile?.classId || c.students?.includes(profile?.uid || ''));
  const myAdvisor = teachers.find(t => t.uid === (profile?.advisorId || myClass?.mentorId)) || teachers[0];

  const completedSubjectIds = useMemo(
    () => new Set(marks.filter(m => m.status === 'pass').map(m => m.subjectId)),
    [marks]
  );

  const activeRegs = useMemo(
    () => registrations.filter(r => r.status === 'registered' || r.status === 'pending_approval'),
    [registrations]
  );

  const registeredCredits = useMemo(
    () => activeRegs.reduce((sum, r) => sum + (r.credits || 0), 0),
    [activeRegs]
  );

  const earnedCredits = useMemo(
    () => marks.filter(m => m.status === 'pass').reduce((sum, m) => sum + (m.credits || 4), 0),
    [marks]
  );

  const cgpa = useMemo(() => {
    if (!marks.length) return '0.00';
    let pts = 0; let cred = 0;
    marks.forEach(m => { const c = m.credits || 4; pts += (m.gradePoint || 0) * c; cred += c; });
    return cred > 0 ? (pts / cred).toFixed(2) : '0.00';
  }, [marks]);

  // Catalog items linking Subjects to matching Classes/Sections
  const catalogItems = useMemo(() => {
    const mySlots = timetable.filter(t => activeRegs.some(r => r.classId === t.classId) || t.classId === myClass?.id);
    return subjects.map(sub => {
      const matchingClass =
        classes.find(c => c.subjectIds?.includes(sub.id) && (!profile?.programId || !c.programId || c.programId === profile.programId)) ||
        myClass ||
        classes[0];
      const courseMeta = courses.find(c => c.id === sub.courseId);
      const courseType: 'core' | 'elective' | 'lab' = sub.isElective
        ? 'elective'
        : sub.type === 'practical'
          ? 'lab'
          : (courseMeta?.type || 'core');

      const existingReg = registrations.find(r => r.subjectId === sub.id && r.status !== 'dropped');
      const prereqMissing = (regConfig.enforcePrerequisites && sub.prerequisiteSubjectIds?.length)
        ? sub.prerequisiteSubjectIds.filter(pid => !completedSubjectIds.has(pid))
        : [];
      const programMismatch = !!(profile?.programId && sub.programId && sub.programId !== profile.programId);
      const semMismatch = !!(profile?.semesterNumber && sub.semesterNumber && sub.semesterNumber > profile.semesterNumber);
      const capacityFull = !!(matchingClass && matchingClass.maxCapacity && (matchingClass.students?.length || 0) >= matchingClass.maxCapacity);

      // Schedule conflict detection
      const subSlots = matchingClass ? timetable.filter(t => t.classId === matchingClass.id && t.subjectId === sub.id) : [];
      const hasConflict = subSlots.some(s =>
        mySlots.some(ms =>
          ms.subjectId !== sub.id &&
          ms.day === s.day &&
          ms.startTime < s.endTime &&
          ms.endTime > s.startTime
        )
      );

      return {
        subject: sub,
        matchingClass,
        courseType,
        existingReg,
        prereqMissing,
        programMismatch,
        semMismatch,
        capacityFull,
        hasConflict
      };
    }).filter(item => {
      if (typeFilter !== 'all' && item.courseType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.subject.name.toLowerCase().includes(q) || item.subject.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [subjects, classes, courses, registrations, timetable, activeRegs, myClass, profile?.programId, profile?.semesterNumber, regConfig.enforcePrerequisites, completedSubjectIds, typeFilter, search]);

  const handleRegister = async (item: typeof catalogItems[number]) => {
    if (!profile) return;
    setFeedback(null);

    if (!regConfig.isOpen) {
      return setFeedback({ type: 'error', text: 'Course registration window is currently closed by Academic Affairs.' });
    }
    if (profile.registrationHold) {
      return setFeedback({ type: 'error', text: `Registration Hold Active: ${profile.registrationHoldReason || 'Clear institutional hold first.'}` });
    }
    if (item.prereqMissing.length > 0) {
      return setFeedback({ type: 'error', text: `Missing prerequisite subject(s) required before enrolling in ${item.subject.code}.` });
    }
    if (item.programMismatch || item.semMismatch) {
      return setFeedback({ type: 'error', text: `${item.subject.code} is restricted to a different program or higher semester.` });
    }
    if (item.hasConflict) {
      return setFeedback({ type: 'error', text: `Timetable schedule conflict detected with ${item.subject.code}.` });
    }
    if (!item.capacityFull && registeredCredits + item.subject.credits > regConfig.maxCredits) {
      return setFeedback({ type: 'error', text: `Credit limit exceeded (Max ${regConfig.maxCredits} credits per semester).` });
    }

    const cls = item.matchingClass;
    const status: CourseRegistration['status'] = item.capacityFull
      ? 'waitlisted'
      : regConfig.requireAdvisorApproval
        ? 'pending_approval'
        : 'registered';

    const ref = await addDoc(collection(db, 'courseRegistrations'), {
      studentId: profile.uid,
      studentName: profile.name,
      rollNo: profile.rollNo || '',
      semesterId: currentSem?.id || '',
      semesterNumber: profile.semesterNumber || 1,
      subjectId: item.subject.id,
      subjectCode: item.subject.code,
      subjectName: item.subject.name,
      classId: cls?.id || '',
      className: cls?.name || 'General Section',
      credits: item.subject.credits,
      courseType: item.courseType,
      status,
      createdAt: serverTimestamp()
    });

    if (status === 'registered' && cls) {
      await updateDoc(doc(db, 'classes', cls.id), {
        students: arrayUnion(profile.uid)
      });
    }

    if (status === 'pending_approval') {
      await addDoc(collection(db, 'approvalRequests'), {
        processType: 'course_registration',
        title: `Course Registration: ${item.subject.code} ${item.subject.name}`,
        description: `${profile.name} requested registration in ${item.subject.name} (${item.subject.credits} credits).`,
        requesterId: profile.uid,
        requesterName: profile.name,
        requesterRole: profile.role,
        targetEntityType: 'courseRegistrations',
        targetEntityId: ref.id,
        status: 'pending',
        currentStageIndex: 0,
        stages: [
          { stageOrder: 1, stageName: 'Faculty Mentor Review', approverRole: 'teacher' },
          { stageOrder: 2, stageName: 'HOD Approval', approverRole: 'hod' }
        ],
        history: [],
        createdAt: serverTimestamp()
      });
    }

    await logAudit(profile, 'COURSE_REGISTRATION', 'Academics', ref.id, `${item.subject.code} (${status})`);
    setFeedback({
      type: 'success',
      text: status === 'waitlisted'
        ? `Added to waitlist for ${item.subject.code} (section at capacity).`
        : status === 'pending_approval'
          ? `Registration request submitted to Advisor & HOD for ${item.subject.code}.`
          : `Successfully registered in ${item.subject.code} ${item.subject.name}. Timetable & LMS updated.`
    });
  };

  const handleDrop = async (reg: CourseRegistration) => {
    if (!profile) return;
    if (!regConfig.allowAddDrop) {
      return setFeedback({ type: 'error', text: 'Add/Drop period has closed.' });
    }
    await updateDoc(doc(db, 'courseRegistrations', reg.id), { status: 'dropped' });
    if (reg.classId && reg.classId !== profile.classId) {
      await updateDoc(doc(db, 'classes', reg.classId), {
        students: arrayRemove(profile.uid)
      });
    }
    await logAudit(profile, 'DROP_COURSE', 'Academics', reg.id, `${reg.subjectCode} dropped`);
    setFeedback({ type: 'success', text: `Dropped ${reg.subjectCode} ${reg.subjectName}.` });
  };

  const handleBookAdvising = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const adv = teachers.find(t => t.uid === (advAdvisorId || myAdvisor?.uid)) || myAdvisor;
    await addDoc(collection(db, 'advisingAppointments'), {
      studentId: profile.uid,
      studentName: profile.name,
      advisorId: adv?.uid || '',
      advisorName: adv?.name || 'Academic Advisor',
      date: advDate,
      time: advTime,
      topic: advTopic,
      notes: advNotes,
      status: 'requested',
      createdAt: serverTimestamp()
    });
    setAdvModal(false);
    setAdvTopic('');
    setAdvNotes('');
    setFeedback({ type: 'success', text: 'Academic advising appointment requested.' });
  };

  const totalRequiredCredits = myProgram?.totalCredits || 160;
  const degreeCompletionPct = Math.min(100, Math.round((earnedCredits / totalRequiredCredits) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Management & Course Registration"
        subtitle={`${myProgram?.name || 'University Program'} · ${myDept?.name || 'All Departments'} · Credit Limit ${regConfig.minCredits}–${regConfig.maxCredits} cr`}
      />

      {feedback && (
        <div className={`px-4 py-3 rounded-xl border text-xs flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-zinc-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Registered Credits" value={`${registeredCredits} / ${regConfig.maxCredits}`} hint={`${activeRegs.length} active subjects`} icon={BookOpen} tone="indigo" />
        <StatCard label="Credits Earned" value={`${earnedCredits} / ${totalRequiredCredits}`} hint={`${degreeCompletionPct}% toward graduation`} icon={GraduationCap} tone="emerald" />
        <StatCard label="Cumulative GPA" value={cgpa} hint={`Standing: ${(profile?.academicStanding || 'good_standing').replace('_', ' ')}`} icon={Award} />
        <StatCard label="Registration Window" value={profile?.registrationHold ? 'On Hold' : regConfig.isOpen ? 'Open' : 'Closed'} hint={regConfig.allowAddDrop ? 'Add/Drop enabled' : 'Add/Drop closed'} icon={Calendar} tone={profile?.registrationHold ? 'rose' : regConfig.isOpen ? 'emerald' : 'amber'} />
      </div>

      <SegmentedTabs
        active={tab}
        onChange={v => setTab(v as any)}
        tabs={[
          { id: 'register', label: 'Course Registration & Catalog', count: catalogItems.length },
          { id: 'audit', label: 'Academic Progress & Degree Audit', count: subjects.length },
          { id: 'advising', label: 'Academic Advising', count: appointments.length }
        ]}
      />

      {tab === 'register' && (
        <div className="space-y-6">
          {/* Current Registered & Waitlisted Courses */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Current Semester Registrations &amp; Waitlist</h3>
              <span className="font-mono text-xs text-[#52525B]">{registeredCredits} credits selected</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {registrations.filter(r => r.status !== 'dropped').map(r => (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#111111] dark:text-zinc-200">{r.subjectCode}</span>
                      <span className="font-semibold text-sm text-[#111111] dark:text-zinc-100">{r.subjectName}</span>
                      <StatusText status={r.status} />
                    </div>
                    <p className="text-[#52525B] mt-0.5 capitalize">{r.courseType} · {r.credits} credits · Section {r.className}</p>
                  </div>
                  {regConfig.allowAddDrop && (
                    <button
                      type="button"
                      onClick={() => handleDrop(r)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Drop Course
                    </button>
                  )}
                </div>
              ))}
              {registrations.filter(r => r.status !== 'dropped').length === 0 && (
                <p className="p-6 text-center text-xs text-zinc-400">No course registrations added yet. Select subjects from the catalog below.</p>
              )}
            </div>
          </div>

          {/* Course Catalog Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'core', 'elective', 'lab'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize ${
                    typeFilter === t
                      ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white border-[#111111] dark:border-white'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[#52525B] dark:text-slate-300'
                  }`}
                >
                  {t === 'all' ? 'All Courses' : `${t}s`}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search course code or title..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
              />
            </div>
          </div>

          {/* Course Catalog Grid */}
          {catalogItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogItems.map(item => {
                const sub = item.subject;
                const enrolledCount = item.matchingClass?.students?.length || 0;
                const maxCap = item.matchingClass?.maxCapacity || 60;
                const isDone = completedSubjectIds.has(sub.id);
                const blockedReason = item.prereqMissing.length > 0
                  ? 'Prerequisite required'
                  : item.programMismatch || item.semMismatch
                    ? 'Program/Semester restricted'
                    : item.hasConflict
                      ? 'Schedule conflict'
                      : null;

                return (
                  <div key={sub.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#52525B]">
                        <span className="font-mono font-semibold text-[#111111] dark:text-zinc-200">{sub.code}</span>
                        <span className="capitalize">{item.courseType} · <span className="font-mono">{sub.credits} cr</span></span>
                      </div>
                      <h4 className="text-sm font-semibold mt-1 text-[#111111] dark:text-zinc-100">{sub.name}</h4>
                      <p className="text-xs text-[#52525B] mt-1">
                        Section {item.matchingClass?.name || 'TBA'} · {sub.lectureHours}L / {sub.labHours}P hrs · Seats <span className="font-mono">{enrolledCount}/{maxCap}</span>
                      </p>
                      {blockedReason && (
                        <p className="text-[11px] font-medium text-[#27272A] dark:text-zinc-300 mt-2">{blockedReason}</p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      {isDone ? (
                        <span className="font-semibold text-[#111111] dark:text-zinc-200">Completed</span>
                      ) : item.existingReg ? (
                        <StatusText status={item.existingReg.status} />
                      ) : (
                        <span className="text-zinc-400">Available</span>
                      )}

                      {!isDone && !item.existingReg && (
                        <button
                          type="button"
                          onClick={() => handleRegister(item)}
                          className={`px-3 py-1.5 font-semibold rounded-lg text-white ${
                            item.capacityFull ? 'bg-[#27272A] hover:bg-amber-700' : 'bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200'
                          }`}
                        >
                          {item.capacityFull ? 'Join Waitlist' : 'Register'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={BookOpen} title="No Matching Courses" description="Adjust filters or contact Academic Affairs to publish semester offerings." />
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Degree Audit &amp; Graduation Eligibility</h3>
                <p className="text-xs text-[#52525B]">
                  {myProgram?.name || 'Degree Program'} · Target {totalRequiredCredits} Credits · Earned {earnedCredits} Credits · Remaining {Math.max(0, totalRequiredCredits - earnedCredits)} Credits
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-[#111111] dark:text-zinc-200">{degreeCompletionPct}% Complete</span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#111111] dark:bg-white dark:text-zinc-950 rounded-full" style={{ width: `${degreeCompletionPct}%` }} />
            </div>
            <p className="text-xs text-[#52525B] dark:text-zinc-400">
              Graduation Status:{' '}
              <strong className={earnedCredits >= totalRequiredCredits ? 'text-[#111111] dark:text-zinc-200' : 'text-[#111111] dark:text-zinc-100'}>
                {earnedCredits >= totalRequiredCredits ? 'Eligible for Graduation Review' : `In Progress (${totalRequiredCredits - earnedCredits} credits remaining)`}
              </strong>
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold">Curriculum Requirements Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                    <th className="py-3 px-4 font-semibold">Code</th>
                    <th className="py-3 px-4 font-semibold">Subject</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 font-semibold">Credits</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {subjects.map(sub => {
                    const mark = marks.find(m => m.subjectId === sub.id);
                    const reg = registrations.find(r => r.subjectId === sub.id && r.status !== 'dropped');
                    const status = mark ? (mark.status === 'pass' ? 'completed' : 'backlog') : reg ? reg.status : 'pending';
                    return (
                      <tr key={sub.id}>
                        <td className="py-3 px-4 font-mono font-semibold text-[#111111] dark:text-zinc-200">{sub.code}</td>
                        <td className="py-3 px-4 font-medium">{sub.name}</td>
                        <td className="py-3 px-4 capitalize">{sub.isElective ? 'Elective' : sub.type}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">{sub.credits}</td>
                        <td className="py-3 px-4"><StatusText status={status} /></td>
                        <td className="py-3 px-4 font-mono font-semibold">{mark ? `${mark.grade} (${mark.gradePoint})` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'advising' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#52525B]">Assigned Academic Advisor / Mentor</p>
                <h3 className="text-base font-bold">{myAdvisor?.name || 'Faculty Advisor Pending'}</h3>
                {myAdvisor?.email && <p className="text-xs text-[#52525B]">{myAdvisor.email}</p>}
              </div>
            </div>
            <p className="text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed">
              Schedule 1-on-1 advising sessions for course selection, prerequisite waivers, internship credit mapping, or academic standing guidance.
            </p>
            <button
              type="button"
              onClick={() => { setAdvAdvisorId(myAdvisor?.uid || ''); setAdvModal(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
            >
              <Plus className="w-3.5 h-3.5" /> Request Advising Session
            </button>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-3">Scheduled Advising Sessions</h3>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {appointments.map(ap => (
                <div key={ap.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#111111] dark:text-zinc-100">{ap.topic}</p>
                    <p className="text-[#52525B]">Advisor: {ap.advisorName} · <span className="font-mono">{ap.date} {ap.time}</span></p>
                  </div>
                  <StatusText status={ap.status} />
                </div>
              ))}
              {appointments.length === 0 && <p className="py-8 text-center text-xs text-zinc-400">No advising appointments scheduled yet.</p>}
            </div>
          </div>
        </div>
      )}

      <Modal open={advModal} onClose={() => setAdvModal(false)} title="Schedule Academic Advising Appointment">
        <form onSubmit={handleBookAdvising} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Faculty Advisor</label>
            <select value={advAdvisorId} onChange={e => setAdvAdvisorId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name} ({t.designation || t.role})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Preferred Date</label><input type="date" required value={advDate} onChange={e => setAdvDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Preferred Time</label><input type="time" required value={advTime} onChange={e => setAdvTime(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <div><label className="block text-xs font-medium mb-1">Topic</label><input type="text" required value={advTopic} onChange={e => setAdvTopic(e.target.value)} placeholder="Elective planning / Degree audit review" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div><label className="block text-xs font-medium mb-1">Notes</label><textarea rows={2} value={advNotes} onChange={e => setAdvNotes(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdvModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
