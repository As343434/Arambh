import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { Award, Calendar, CheckCircle2, ClipboardList, Download, Edit3, Plus, Printer, ShieldCheck, Users } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { calculateGrade, exportToCsv, logAudit } from '../services/erpService';
import { Attendance, Exam, ExamMark, ExamRegistration, ExamSchedule, ExamSeat, RevaluationRequest } from '../types';

export const Examinations: React.FC = () => {
  const { profile, isStudent, isParent, can } = useAuth();
  const { university, departments, programs, semesters, classes, subjects, rooms, teachers, students, settings, users } = useUniversity();

  const canManageExams = can('exams.manage');
  const canEnterMarks = can('marks.enter');
  const canApproveResults = can('results.approve');

  const [exams, setExams] = useState<Exam[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [revaluations, setRevaluations] = useState<RevaluationRequest[]>([]);
  const [registrations, setRegistrations] = useState<ExamRegistration[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(canManageExams ? 'exams' : canEnterMarks ? 'marks' : 'results');

  // Exam Form
  const [examModal, setExamModal] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examType, setExamType] = useState<Exam['examType']>('final');
  const [examDeptId, setExamDeptId] = useState('');
  const [examProgId, setExamProgId] = useState('');
  const [examSemId, setExamSemId] = useState('');
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');

  // Schedule Form
  const [schedModal, setSchedModal] = useState(false);
  const [schedExamId, setSchedExamId] = useState('');
  const [schedClassId, setSchedClassId] = useState('');
  const [schedSubjectId, setSchedSubjectId] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedStart, setSchedStart] = useState('09:30');
  const [schedEnd, setSchedEnd] = useState('12:30');
  const [schedRoomId, setSchedRoomId] = useState('');
  const [schedInvigilatorId, setSchedInvigilatorId] = useState('');
  const [schedMaxMarks, setSchedMaxMarks] = useState(100);

  // Seating View Modal
  const [seatingSchedule, setSeatingSchedule] = useState<ExamSchedule | null>(null);

  // Marks Entry state
  const [marksExamId, setMarksExamId] = useState('');
  const [marksClassId, setMarksClassId] = useState('');
  const [marksSubjectId, setMarksSubjectId] = useState('');
  const [draftScores, setDraftScores] = useState<Record<string, { internal: number; practical: number; viva: number; theory: number }>>({});
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Revaluation Modals
  const [revTarget, setRevTarget] = useState<ExamMark | null>(null);
  const [revReason, setRevReason] = useState('');
  const [revEditTarget, setRevEditTarget] = useState<RevaluationRequest | null>(null);
  const [revEditMarks, setRevEditMarks] = useState(0);

  // Exam Registration Modal
  const [regModal, setRegModal] = useState(false);
  const [regExamId, setRegExamId] = useState('');
  const [regSubjectId, setRegSubjectId] = useState('');
  const [regCategory, setRegCategory] = useState<ExamRegistration['examCategory']>('regular');

  // Transcript Modal
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const linkedStudent = useMemo(() => {
    if (!isParent || !profile?.parentOfStudentIds?.length) return null;
    return users.find(u => profile.parentOfStudentIds?.includes(u.uid)) || null;
  }, [isParent, profile?.parentOfStudentIds, users]);

  const targetStudentUid = isStudent ? profile?.uid : isParent ? linkedStudent?.uid : undefined;
  const targetStudentProfile = isStudent ? profile : isParent ? linkedStudent : undefined;

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'exams'),
      s => {
        setExams(s.docs.map(d => ({ id: d.id, ...d.data() } as Exam)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = onSnapshot(
      collection(db, 'examSchedules'),
      s => setSchedules(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamSchedule))),
      () => {}
    );

    const marksQ = targetStudentUid
      ? query(collection(db, 'examMarks'), where('studentId', '==', targetStudentUid), where('isPublished', '==', true))
      : collection(db, 'examMarks');
    const revQ = targetStudentUid
      ? query(collection(db, 'revaluationRequests'), where('studentId', '==', targetStudentUid))
      : collection(db, 'revaluationRequests');
    const regQ = targetStudentUid
      ? query(collection(db, 'examRegistrations'), where('studentId', '==', targetStudentUid))
      : collection(db, 'examRegistrations');
    const attQ = targetStudentUid
      ? query(collection(db, 'attendance'), where('studentId', '==', targetStudentUid))
      : collection(db, 'attendance');

    const u3 = onSnapshot(marksQ, s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark))), () => {});
    const u4 = onSnapshot(revQ, s => setRevaluations(s.docs.map(d => ({ id: d.id, ...d.data() } as RevaluationRequest))), () => {});
    const u5 = onSnapshot(regQ, s => setRegistrations(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamRegistration))), () => {});
    const u6 = onSnapshot(attQ, s => setAttendance(s.docs.map(d => ({ id: d.id, ...d.data() } as Attendance))), () => {});
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [targetStudentUid]);

  const visibleMarks = useMemo(() => {
    if (targetStudentUid) {
      return marks.filter(m => m.studentId === targetStudentUid && m.isPublished);
    }
    return marks;
  }, [marks, targetStudentUid]);

  const studentAttendancePct = useMemo(() => {
    if (!targetStudentUid) return 100;
    const mine = attendance.filter(a => a.studentId === targetStudentUid);
    if (mine.length === 0) return 100;
    const attended = mine.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'excused').length;
    return Math.round((attended / mine.length) * 100);
  }, [attendance, targetStudentUid]);

  const attendanceThreshold = settings.attendanceThreshold || 75;
  const hasRegistrationHold = Boolean(targetStudentProfile?.registrationHold);
  const isEligibleForExams = studentAttendancePct >= attendanceThreshold && !hasRegistrationHold;

  const visibleRegistrations = useMemo(() => {
    return targetStudentUid ? registrations.filter(r => r.studentId === targetStudentUid) : registrations;
  }, [registrations, targetStudentUid]);

  const studentCgpa = useMemo(() => {
    const relevant = targetStudentUid ? visibleMarks : [];
    if (relevant.length === 0) return '0.00';
    let pts = 0;
    let credits = 0;
    relevant.forEach(m => {
      const c = m.credits || 4;
      pts += (m.gradePoint || 0) * c;
      credits += c;
    });
    return credits > 0 ? (pts / credits).toFixed(2) : '0.00';
  }, [visibleMarks, targetStudentUid]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'exams'), {
      title: examTitle,
      examType,
      departmentId: examDeptId || null,
      programId: examProgId || null,
      semesterId: examSemId || null,
      startDate: examStart,
      endDate: examEnd,
      status: 'scheduled',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_EXAM', 'Examinations', ref.id, examTitle);
    setExamModal(false);
    setExamTitle('');
    setBanner({ type: 'success', text: 'Examination created.' });
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const ex = exams.find(x => x.id === schedExamId);
    const cls = classes.find(c => c.id === schedClassId);
    const sub = subjects.find(s => s.id === schedSubjectId);
    const rm = rooms.find(r => r.id === schedRoomId);
    const inv = teachers.find(t => t.uid === schedInvigilatorId);

    const clsStudents = students
      .filter(s => cls?.students?.includes(s.uid) || s.classId === schedClassId)
      .sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''));

    const seatingPlan: ExamSeat[] = clsStudents.map((stu, idx) => ({
      rollNo: stu.rollNo || `ROLL-${idx + 1}`,
      studentId: stu.uid,
      studentName: stu.name,
      seatNo: `${rm?.roomNumber || 'HALL'}-S${String(idx + 1).padStart(2, '0')}`
    }));

    const ref = await addDoc(collection(db, 'examSchedules'), {
      examId: schedExamId,
      examTitle: ex?.title || '',
      classId: schedClassId,
      className: cls?.name || '',
      subjectId: schedSubjectId,
      subjectName: sub?.name || '',
      date: schedDate,
      startTime: schedStart,
      endTime: schedEnd,
      roomId: schedRoomId || '',
      roomName: rm ? `${rm.roomNumber} · ${rm.name}` : 'Main Exam Hall',
      invigilatorId: schedInvigilatorId || '',
      invigilatorName: inv?.name || 'Assigned Invigilator',
      maxMarks: Number(schedMaxMarks) || 100,
      passingMarks: sub?.passingMarks || 40,
      seatingPlan
    });
    await logAudit(profile, 'SCHEDULE_EXAM_PAPER', 'Examinations', ref.id, `${ex?.title} · ${sub?.name} (${seatingPlan.length} seats generated)`);
    setSchedModal(false);
    setBanner({ type: 'success', text: `Exam paper scheduled with ${seatingPlan.length} seating allocations.` });
  };

  const marksStudents = useMemo(() => {
    const cls = classes.find(c => c.id === marksClassId);
    if (!cls) return [];
    return students.filter(s => cls.students?.includes(s.uid) || s.classId === cls.id);
  }, [classes, marksClassId, students]);

  const handleSaveMarkRow = async (stuId: string) => {
    if (!marksExamId || !marksClassId || !marksSubjectId) return;
    const stu = students.find(s => s.uid === stuId);
    const ex = exams.find(e => e.id === marksExamId);
    const cls = classes.find(c => c.id === marksClassId);
    const sub = subjects.find(s => s.id === marksSubjectId);
    const existing = marks.find(m => m.examId === marksExamId && m.subjectId === marksSubjectId && m.studentId === stuId);
    const scores = draftScores[stuId] || {
      internal: existing?.internalMarks ?? 0,
      practical: existing?.practicalMarks ?? 0,
      viva: existing?.vivaMarks ?? 0,
      theory: existing?.theoryMarks ?? 0
    };
    const total = Number(scores.internal) + Number(scores.practical) + Number(scores.viva) + Number(scores.theory);
    const maxM = sub?.maxMarks || 100;
    const pct = maxM > 0 ? (total / maxM) * 100 : 0;
    const computed = calculateGrade(pct, settings.gradingScale);
    const docId = existing?.id || `${marksExamId}_${marksSubjectId}_${stuId}`;

    await setDoc(doc(db, 'examMarks', docId), {
      examId: marksExamId,
      examTitle: ex?.title || '',
      subjectId: marksSubjectId,
      subjectName: sub?.name || '',
      credits: sub?.credits || 4,
      classId: marksClassId,
      className: cls?.name || '',
      semesterNumber: sub?.semesterNumber || 1,
      studentId: stuId,
      studentName: stu?.name || 'Student',
      rollNo: stu?.rollNo || '',
      internalMarks: Number(scores.internal),
      practicalMarks: Number(scores.practical),
      vivaMarks: Number(scores.viva),
      theoryMarks: Number(scores.theory),
      totalMarks: total,
      maxMarks: maxM,
      grade: computed.grade,
      gradePoint: computed.gradePoint,
      status: computed.pass ? 'pass' : 'fail',
      isPublished: ex?.status === 'results_published',
      enteredBy: profile?.uid
    });
    await logAudit(profile, 'ENTER_EXAM_MARKS', 'Examinations', docId, `${stu?.name}: ${total}/${maxM} (${computed.grade})`);
    setBanner({ type: 'success', text: `Saved marks for ${stu?.name}: ${total}/${maxM} (${computed.grade}).` });
  };

  const handlePublishResults = async (exam: Exam) => {
    const newPubState = exam.status !== 'results_published';
    await updateDoc(doc(db, 'exams', exam.id), {
      status: newPubState ? 'results_published' : 'completed',
      resultsApprovedBy: profile?.name || profile?.uid
    });
    const examMarks = marks.filter(m => m.examId === exam.id);
    await Promise.all(examMarks.map(m => updateDoc(doc(db, 'examMarks', m.id), { isPublished: newPubState })));
    await logAudit(profile, newPubState ? 'PUBLISH_RESULTS' : 'UNPUBLISH_RESULTS', 'Examinations', exam.id, `${exam.title} (${examMarks.length} records)`);
    setBanner({ type: 'success', text: newPubState ? `Results published for ${exam.title}.` : `Results unpublished for ${exam.title}.` });
  };

  const handleSubmitRevaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revTarget || !profile) return;
    await addDoc(collection(db, 'revaluationRequests'), {
      examMarkId: revTarget.id,
      examId: revTarget.examId,
      examTitle: revTarget.examTitle || '',
      studentId: profile.uid,
      studentName: profile.name,
      subjectId: revTarget.subjectId,
      subjectName: revTarget.subjectName,
      currentMarks: revTarget.totalMarks,
      reason: revReason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'REQUEST_REVALUATION', 'Examinations', revTarget.id, `${revTarget.subjectName} (${revTarget.totalMarks})`);
    setRevTarget(null);
    setRevReason('');
    setBanner({ type: 'success', text: 'Revaluation request submitted to Examination Cell.' });
  };

  const handleResolveRevaluation = async (req: RevaluationRequest, decision: 'updated' | 'rejected', updatedTotal?: number) => {
    await updateDoc(doc(db, 'revaluationRequests', req.id), {
      status: decision,
      updatedMarks: updatedTotal ?? req.currentMarks,
      reviewedBy: profile?.name || profile?.uid
    });
    if (decision === 'updated' && typeof updatedTotal === 'number') {
      const m = marks.find(x => x.id === req.examMarkId);
      const maxM = m?.maxMarks || 100;
      const computed = calculateGrade((updatedTotal / maxM) * 100, settings.gradingScale);
      await updateDoc(doc(db, 'examMarks', req.examMarkId), {
        totalMarks: updatedTotal,
        grade: computed.grade,
        gradePoint: computed.gradePoint,
        status: computed.pass ? 'pass' : 'fail'
      });
    }
    await logAudit(profile, `REVALUATION_${decision.toUpperCase()}`, 'Examinations', req.id, `${req.studentName} · ${req.subjectName}`);
    setRevEditTarget(null);
    setBanner({ type: 'success', text: `Revaluation marked as ${decision}.` });
  };

  const handleExamRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !regExamId) return;
    const ex = exams.find(x => x.id === regExamId);
    const sub = subjects.find(s => s.id === regSubjectId);
    const dup = registrations.some(
      r => r.studentId === profile.uid && r.examId === regExamId && (r.subjectId || '') === (regSubjectId || '')
    );
    if (dup) {
      setBanner({ type: 'error', text: 'You are already registered for this examination / subject.' });
      setRegModal(false);
      return;
    }
    const ref = await addDoc(collection(db, 'examRegistrations'), {
      examId: regExamId,
      examTitle: ex?.title || 'University Examination',
      studentId: profile.uid,
      studentName: profile.name,
      rollNo: profile.rollNo || '',
      subjectId: regSubjectId || '',
      subjectName: sub?.name || 'All Scheduled Papers',
      examCategory: regCategory,
      status: isEligibleForExams ? 'registered' : 'registered',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'REGISTER_EXAM', 'Examinations', ref.id, `${ex?.title} (${regCategory})`);
    setRegModal(false);
    setBanner({ type: 'success', text: `Exam registration submitted for ${ex?.title}.` });
  };

  const handleUpdateRegistrationStatus = async (reg: ExamRegistration, status: ExamRegistration['status']) => {
    await updateDoc(doc(db, 'examRegistrations', reg.id), { status });
    await logAudit(profile, 'UPDATE_EXAM_REGISTRATION', 'Examinations', reg.id, `${reg.studentName} · ${status}`);
    setBanner({ type: 'success', text: `Registration for ${reg.studentName} updated to ${status.replace('_', ' ')}.` });
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations, Grading & Transcripts"
        subtitle="Exam scheduling, automated room seating plans, multi-component marks entry, result approval, and revaluation."
        actions={
          <div className="flex flex-wrap gap-2">
            {(isStudent || isParent) && (
              <button
                type="button"
                onClick={() => setTranscriptOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                <Printer className="w-3.5 h-3.5" /> Official Grade Transcript
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  'exam_results.csv',
                  visibleMarks.map(m => ({
                    Exam: m.examTitle,
                    Student: m.studentName,
                    RollNo: m.rollNo,
                    Subject: m.subjectName,
                    Internal: m.internalMarks,
                    Practical: m.practicalMarks,
                    Viva: m.vivaMarks,
                    Theory: m.theoryMarks,
                    Total: m.totalMarks,
                    Max: m.maxMarks,
                    Grade: m.grade,
                    GradePoint: m.gradePoint,
                    Status: m.status
                  }))
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <Download className="w-3.5 h-3.5" /> Export Results
            </button>
            {canManageExams && (
              <>
                <button
                  type="button"
                  onClick={() => { setSchedExamId(exams[0]?.id || ''); setSchedClassId(classes[0]?.id || ''); setSchedSubjectId(subjects[0]?.id || ''); setSchedRoomId(rooms[0]?.id || ''); setSchedModal(true); }}
                  disabled={exams.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 disabled:opacity-50"
                >
                  <Calendar className="w-3.5 h-3.5" /> Schedule Paper + Seating
                </button>
                <button
                  type="button"
                  onClick={() => setExamModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Exam
                </button>
              </>
            )}
          </div>
        }
      />

      {banner && (
        <div className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs text-[#111111] dark:text-zinc-200 flex items-center justify-between">
          <span className="font-medium">{banner.text}</span>
          <button onClick={() => setBanner(null)} className="underline">Dismiss</button>
        </div>
      )}

      {targetStudentUid && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isEligibleForExams ? 'bg-zinc-100 dark:bg-zinc-800/60 text-[#111111]' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">Examination Eligibility Status</h3>
                <StatusText status={hasRegistrationHold ? 'hold' : isEligibleForExams ? 'eligible' : 'shortage'} />
              </div>
              <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1">
                Attendance: <span className="font-mono font-semibold text-[#27272A] dark:text-slate-200">{studentAttendancePct}%</span> (minimum required {attendanceThreshold}%)
                {hasRegistrationHold && ` · Hold Reason: ${targetStudentProfile?.registrationHoldReason || 'Administrative hold'}`}
              </p>
            </div>
          </div>
          {isStudent && (
            <button
              type="button"
              onClick={() => { setRegExamId(exams[0]?.id || ''); setRegSubjectId(''); setRegModal(true); }}
              disabled={exams.length === 0 || hasRegistrationHold}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50 shrink-0"
            >
              Register for Exam
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Examinations" value={exams.length} icon={Award} tone="indigo" />
        <StatCard label="Scheduled Papers" value={schedules.length} icon={Calendar} tone="emerald" />
        <StatCard label={targetStudentUid ? 'Cumulative GPA' : 'Marks Records'} value={targetStudentUid ? studentCgpa : marks.length} icon={ClipboardList} tone="amber" />
        <StatCard label="Revaluation Requests" value={revaluations.filter(r => !targetStudentUid || r.studentId === targetStudentUid).length} icon={Edit3} />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          ...(canManageExams ? [{ id: 'exams', label: 'Exams & Publishing', count: exams.length }] : []),
          { id: 'schedules', label: 'Date Sheet & Seating', count: schedules.length },
          { id: 'registrations', label: 'Exam Registrations', count: visibleRegistrations.length },
          ...(canEnterMarks ? [{ id: 'marks', label: 'Marks Entry' }] : []),
          { id: 'results', label: targetStudentUid ? 'My Results & Grades' : 'All Marks & Grades', count: visibleMarks.length },
          { id: 'revaluation', label: 'Revaluations', count: revaluations.filter(r => !targetStudentUid || r.studentId === targetStudentUid).length }
        ]}
      />

      {/* Exams Management */}
      {activeTab === 'exams' && canManageExams && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {exams.length > 0 ? exams.map(ex => (
            <div key={ex.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#52525B]">
                  <span className="font-mono uppercase">{ex.examType}</span>
                  <span>· {ex.startDate} to {ex.endDate}</span>
                  <StatusText status={ex.status} />
                </div>
                <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100 mt-0.5">{ex.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {canApproveResults && (
                  <button
                    type="button"
                    onClick={() => handlePublishResults(ex)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg ${
                      ex.status === 'results_published'
                        ? 'border border-amber-300 text-[#27272A] dark:text-zinc-300'
                        : 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A]'
                    }`}
                  >
                    {ex.status === 'results_published' ? 'Unpublish Results' : 'Approve & Publish Results'}
                  </button>
                )}
                <button onClick={() => deleteDoc(doc(db, 'exams', ex.id))} className="text-xs text-rose-500 hover:underline px-2">Delete</button>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-xs text-zinc-400">No examinations configured yet.</div>
          )}
        </div>
      )}

      {/* Date Sheet & Seating */}
      {activeTab === 'schedules' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Exam</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold">Room & Invigilator</th>
                  <th className="py-3 px-4 font-semibold text-right">Seating Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {schedules.map(s => {
                  const mySeat = targetStudentUid ? s.seatingPlan?.find(seat => seat.studentId === targetStudentUid) : undefined;
                  return (
                    <tr key={s.id}>
                      <td className="py-3 px-4 font-mono text-xs">{s.date}<br /><span className="text-zinc-400">{s.startTime} – {s.endTime}</span></td>
                      <td className="py-3 px-4 font-medium">{s.examTitle}</td>
                      <td className="py-3 px-4">{s.subjectName}</td>
                      <td className="py-3 px-4 text-[#52525B]">{s.className}</td>
                      <td className="py-3 px-4 text-xs">
                        {s.roomName}
                        <br />
                        <span className="text-zinc-400">{s.invigilatorName}</span>
                        {mySeat && (
                          <span className="block mt-0.5 font-mono font-semibold text-[#111111] dark:text-zinc-200">
                            Your Seat: {mySeat.seatNo}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSeatingSchedule(s)}
                          className="text-xs font-medium text-[#111111] dark:text-zinc-200 hover:underline inline-flex items-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5" /> {s.seatingPlan?.length || 0} Seats
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {schedules.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-zinc-400">No exam papers scheduled yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Marks Entry Grid */}
      {activeTab === 'marks' && canEnterMarks && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={marksExamId} onChange={e => setMarksExamId(e.target.value)} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Examination</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            <select value={marksClassId} onChange={e => setMarksClassId(e.target.value)} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={marksSubjectId} onChange={e => setMarksSubjectId(e.target.value)} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </select>
          </div>

          {marksExamId && marksClassId && marksSubjectId ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-[#52525B]">
                    <th className="py-2.5 pr-4 font-semibold">Roll</th>
                    <th className="py-2.5 px-3 font-semibold">Student</th>
                    <th className="py-2.5 px-2 font-semibold">Internal</th>
                    <th className="py-2.5 px-2 font-semibold">Practical</th>
                    <th className="py-2.5 px-2 font-semibold">Viva</th>
                    <th className="py-2.5 px-2 font-semibold">Theory</th>
                    <th className="py-2.5 px-3 font-semibold">Saved Total</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                  {marksStudents.map(stu => {
                    const existing = marks.find(m => m.examId === marksExamId && m.subjectId === marksSubjectId && m.studentId === stu.uid);
                    const cur = draftScores[stu.uid] || {
                      internal: existing?.internalMarks ?? 0,
                      practical: existing?.practicalMarks ?? 0,
                      viva: existing?.vivaMarks ?? 0,
                      theory: existing?.theoryMarks ?? 0
                    };
                    return (
                      <tr key={stu.uid}>
                        <td className="py-2.5 pr-4 font-mono text-xs text-[#52525B]">{stu.rollNo || '—'}</td>
                        <td className="py-2.5 px-3 font-medium">{stu.name}</td>
                        {(['internal', 'practical', 'viva', 'theory'] as const).map(field => (
                          <td key={field} className="py-2.5 px-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={cur[field]}
                              onChange={e =>
                                setDraftScores(prev => ({
                                  ...prev,
                                  [stu.uid]: { ...cur, [field]: Number(e.target.value) }
                                }))
                              }
                              className="w-16 px-2 py-1 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
                            />
                          </td>
                        ))}
                        <td className="py-2.5 px-3 font-mono text-xs">
                          {existing ? `${existing.totalMarks}/${existing.maxMarks} (${existing.grade})` : '—'}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSaveMarkRow(stu.uid)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {marksStudents.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-xs text-zinc-400">No students enrolled in this class.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={ClipboardList} title="Select Exam, Class & Subject" description="Choose all three fields above to enter or update component marks." />
          )}
        </div>
      )}

      {/* Results & Grades */}
      {activeTab === 'results' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Exam</th>
                  {!targetStudentUid && <th className="py-3 px-4 font-semibold">Student</th>}
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Breakdown (I/P/V/T)</th>
                  <th className="py-3 px-4 font-semibold">Total</th>
                  <th className="py-3 px-4 font-semibold">Grade / GP</th>
                  <th className="py-3 px-4 font-semibold">Result</th>
                  {isStudent && <th className="py-3 px-4 font-semibold text-right">Revaluation</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {visibleMarks.map(m => (
                  <tr key={m.id}>
                    <td className="py-3 px-4 text-xs text-[#52525B]">{m.examTitle}</td>
                    {!targetStudentUid && <td className="py-3 px-4 font-medium">{m.studentName} <span className="text-xs font-mono text-zinc-400">{m.rollNo}</span></td>}
                    <td className="py-3 px-4 font-medium">{m.subjectName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#52525B]">{m.internalMarks} / {m.practicalMarks} / {m.vivaMarks} / {m.theoryMarks}</td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold">{m.totalMarks} / {m.maxMarks}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#111111] dark:text-zinc-200">{m.grade} ({m.gradePoint})</td>
                    <td className="py-3 px-4"><StatusText status={m.status} /></td>
                    {isStudent && (
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => setRevTarget(m)} className="text-xs text-[#111111] dark:text-zinc-200 hover:underline">
                          Request Review
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {visibleMarks.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-zinc-400">No published results available yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exam Registrations */}
      {activeTab === 'registrations' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Exam & Supplementary Registrations</h3>
              <p className="text-xs text-[#52525B]">Regular, backlog, and supplementary paper registrations & admit card readiness.</p>
            </div>
            {isStudent && (
              <button
                type="button"
                onClick={() => { setRegExamId(exams[0]?.id || ''); setRegSubjectId(''); setRegModal(true); }}
                disabled={exams.length === 0 || hasRegistrationHold}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50"
              >
                New Exam Registration
              </button>
            )}
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visibleRegistrations.map(reg => (
              <div key={reg.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#52525B]">
                    <span className="font-mono uppercase">{reg.examCategory}</span>
                    <span>· {reg.examTitle}</span>
                    <StatusText status={reg.status} />
                  </div>
                  <p className="text-sm font-medium mt-0.5">
                    {reg.studentName} {reg.rollNo ? <span className="font-mono text-xs text-zinc-400">({reg.rollNo})</span> : ''} · {reg.subjectName || 'All Papers'}
                  </p>
                </div>
                {canManageExams && (
                  <div className="flex items-center gap-2">
                    {reg.status === 'registered' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRegistrationStatus(reg, 'approved')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white"
                      >
                        Approve
                      </button>
                    )}
                    {reg.status !== 'admit_ready' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRegistrationStatus(reg, 'admit_ready')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white"
                      >
                        Issue Admit Card
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {visibleRegistrations.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400">No examination registrations recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Revaluation Requests */}
      {activeTab === 'revaluation' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {revaluations.filter(r => !targetStudentUid || r.studentId === targetStudentUid).map(r => (
            <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#52525B]">
                  <span className="font-semibold text-[#111111] dark:text-zinc-100">{r.studentName}</span>
                  <span>· {r.subjectName}</span>
                  <span className="font-mono">Current: {r.currentMarks}</span>
                  <StatusText status={r.status} />
                </div>
                <p className="text-xs text-[#52525B] dark:text-slate-300 mt-1">{r.reason}</p>
              </div>
              {(canApproveResults || canManageExams) && r.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setRevEditTarget(r); setRevEditMarks(r.currentMarks); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white"
                  >
                    Update Marks
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveRevaluation(r, 'rejected')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {revaluations.filter(r => !targetStudentUid || r.studentId === targetStudentUid).length === 0 && (
            <div className="p-8 text-center text-xs text-zinc-400">No revaluation requests found.</div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={examModal} onClose={() => setExamModal(false)} title="Create University Examination">
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Exam Title</label>
              <input type="text" required value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="e.g. Fall 2026 End-Semester Exam" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Exam Type</label>
              <select value={examType} onChange={e => setExamType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="midterm">Midterm</option>
                <option value="final">Final / End-Semester</option>
                <option value="internal">Internal Assessment</option>
                <option value="practical">Practical</option>
                <option value="viva">Viva Voce</option>
                <option value="supplementary">Supplementary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Start Date</label>
              <input type="date" required value={examStart} onChange={e => setExamStart(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Date</label>
              <input type="date" required value={examEnd} onChange={e => setExamEnd(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department</label>
              <select value={examDeptId} onChange={e => setExamDeptId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Program</label>
              <select value={examProgId} onChange={e => setExamProgId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">All Programs</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setExamModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Create Exam</button>
          </div>
        </form>
      </Modal>

      <Modal open={schedModal} onClose={() => setSchedModal(false)} title="Schedule Exam Paper & Auto-Generate Seating">
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Examination</label>
              <select required value={schedExamId} onChange={e => setSchedExamId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Class / Cohort</label>
              <select required value={schedClassId} onChange={e => setSchedClassId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Subject</label>
              <select required value={schedSubjectId} onChange={e => setSchedSubjectId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Exam Date</label>
              <input type="date" required value={schedDate} onChange={e => setSchedDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Start / End Time</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="time" required value={schedStart} onChange={e => setSchedStart(e.target.value)} className="px-2 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="time" required value={schedEnd} onChange={e => setSchedEnd(e.target.value)} className="px-2 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Exam Room</label>
              <select value={schedRoomId} onChange={e => setSchedRoomId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Main Exam Hall</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} · {r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Invigilator</label>
              <select value={schedInvigilatorId} onChange={e => setSchedInvigilatorId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Assign Invigilator</option>
                {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Max Marks</label>
              <input type="number" min={10} value={schedMaxMarks} onChange={e => setSchedMaxMarks(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSchedModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Schedule & Generate Seating</button>
          </div>
        </form>
      </Modal>

      {/* Seating Plan Modal */}
      <Modal
        open={!!seatingSchedule}
        onClose={() => setSeatingSchedule(null)}
        title={`Seating Plan — ${seatingSchedule?.subjectName || ''}`}
        subtitle={`${seatingSchedule?.roomName || ''} · ${seatingSchedule?.date || ''}`}
      >
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {seatingSchedule?.seatingPlan?.map(seat => (
            <div key={seat.studentId} className="py-2 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-[#111111] dark:text-zinc-200">{seat.seatNo}</span>
              <span className="font-medium">{seat.studentName}</span>
              <span className="font-mono text-zinc-400">{seat.rollNo}</span>
            </div>
          ))}
          {(!seatingSchedule?.seatingPlan || seatingSchedule.seatingPlan.length === 0) && (
            <p className="py-6 text-center text-xs text-zinc-400">No students assigned to this class seating plan.</p>
          )}
        </div>
      </Modal>

      {/* Revaluation Request Modal */}
      <Modal open={!!revTarget} onClose={() => setRevTarget(null)} title="Request Marks Revaluation" subtitle={`${revTarget?.subjectName} · Current: ${revTarget?.totalMarks}`}>
        <form onSubmit={handleSubmitRevaluation} className="space-y-4">
          <textarea required rows={3} value={revReason} onChange={e => setRevReason(e.target.value)} placeholder="Describe section or totaling discrepancy for review..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRevTarget(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Request</button>
          </div>
        </form>
      </Modal>

      {/* Update Revaluation Marks Modal */}
      <Modal
        open={!!revEditTarget}
        onClose={() => setRevEditTarget(null)}
        title="Update Revaluation Marks"
        subtitle={revEditTarget ? `${revEditTarget.studentName} · ${revEditTarget.subjectName}` : ''}
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            if (revEditTarget) handleResolveRevaluation(revEditTarget, 'updated', Number(revEditMarks));
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Revised Total Marks (Previous: {revEditTarget?.currentMarks})</label>
            <input
              type="number"
              required
              min={0}
              max={100}
              value={revEditMarks}
              onChange={e => setRevEditMarks(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRevEditTarget(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Revised Marks</button>
          </div>
        </form>
      </Modal>

      {/* Student Exam Registration Modal */}
      <Modal open={regModal} onClose={() => setRegModal(false)} title="Exam Registration Form">
        <form onSubmit={handleExamRegistration} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Examination</label>
            <select required value={regExamId} onChange={e => setRegExamId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Registration Category</label>
              <select value={regCategory} onChange={e => setRegCategory(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="regular">Regular</option>
                <option value="supplementary">Supplementary</option>
                <option value="backlog">Backlog / Repeat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Subject (Optional)</label>
              <select value={regSubjectId} onChange={e => setRegSubjectId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">All Semester Papers</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRegModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Registration</button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Grade Transcript */}
      <Modal open={transcriptOpen} onClose={() => setTranscriptOpen(false)} title="Official Academic Grade Transcript" maxWidth="max-w-3xl">
        <div className="space-y-4 print:p-4">
          <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-700 pb-4">
            <div>
              <h3 className="text-lg font-bold">{university.name}</h3>
              <p className="text-xs text-[#52525B]">{university.accreditation} · {university.address}</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">{isParent && linkedStudent ? linkedStudent.name : profile?.name}</p>
              <p className="font-mono text-[#52525B]">Roll: {(isParent && linkedStudent ? linkedStudent.rollNo : profile?.rollNo) || 'N/A'}</p>
              <p className="font-mono font-bold text-[#111111] dark:text-zinc-200 mt-1">CGPA: {studentCgpa}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 text-[#52525B]">
                <th className="py-2 font-semibold">Subject</th>
                <th className="py-2 font-semibold">Credits</th>
                <th className="py-2 font-semibold">Marks</th>
                <th className="py-2 font-semibold">Grade</th>
                <th className="py-2 font-semibold">Grade Pt</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleMarks.map(m => (
                <tr key={m.id}>
                  <td className="py-2 font-medium">{m.subjectName}</td>
                  <td className="py-2 font-mono">{m.credits || 4}</td>
                  <td className="py-2 font-mono">{m.totalMarks} / {m.maxMarks}</td>
                  <td className="py-2 font-mono font-bold">{m.grade}</td>
                  <td className="py-2 font-mono">{m.gradePoint}</td>
                  <td className="py-2 uppercase font-semibold">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700 print:hidden">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Printer className="w-3.5 h-3.5" /> Print Official Transcript
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
