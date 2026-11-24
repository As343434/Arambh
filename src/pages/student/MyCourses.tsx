import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { BookOpen, CheckCircle2, Circle, FileText, GraduationCap, MessageSquare, PlayCircle, Video } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, StatCard, StatusText } from '../../components/ui/DataUI';
import {
  Assignment,
  CourseRegistration,
  ExamMark,
  LmsDiscussion,
  LmsMaterial,
  LmsModule,
  LmsProgress,
  Quiz,
  TimetableEntry
} from '../../types';

export const MyCourses: React.FC = () => {
  const { profile } = useAuth();
  const { classes, subjects, users } = useUniversity();

  const [registrations, setRegistrations] = useState<CourseRegistration[]>([]);
  const [modules, setModules] = useState<LmsModule[]>([]);
  const [materials, setMaterials] = useState<LmsMaterial[]>([]);
  const [progress, setProgress] = useState<LmsProgress[]>([]);
  const [discussions, setDiscussions] = useState<LmsDiscussion[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubs = [
      onSnapshot(query(collection(db, 'courseRegistrations'), where('studentId', '==', profile.uid)), s => setRegistrations(s.docs.map(d => ({ id: d.id, ...d.data() } as CourseRegistration))), () => {}),
      onSnapshot(collection(db, 'lmsModules'), s => setModules(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsModule)).sort((a, b) => a.orderIndex - b.orderIndex)), () => {}),
      onSnapshot(collection(db, 'lmsMaterials'), s => setMaterials(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsMaterial))), () => {}),
      onSnapshot(query(collection(db, 'lmsProgress'), where('studentId', '==', profile.uid)), s => setProgress(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsProgress))), () => {}),
      onSnapshot(collection(db, 'lmsDiscussions'), s => setDiscussions(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsDiscussion))), () => {}),
      onSnapshot(collection(db, 'assignments'), s => setAssignments(s.docs.map(d => ({ id: d.id, ...d.data() } as Assignment))), () => {}),
      onSnapshot(collection(db, 'quizzes'), s => setQuizzes(s.docs.map(d => ({ id: d.id, ...d.data() } as Quiz)).filter(q => q.isPublished)), () => {}),
      onSnapshot(query(collection(db, 'examMarks'), where('studentId', '==', profile.uid), where('isPublished', '==', true)), s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark))), () => {}),
      onSnapshot(collection(db, 'timetable'), s => setTimetable(s.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry))), () => {})
    ];
    return () => unsubs.forEach(u => u());
  }, [profile?.uid]);

  const myClasses = useMemo(
    () => classes.filter(c => c.id === profile?.classId || c.students?.includes(profile?.uid || '')),
    [classes, profile?.classId, profile?.uid]
  );

  // Combine registered subjects + subjects assigned to student's enrolled classes
  const enrolledCourses = useMemo(() => {
    const subjectIds = new Set<string>();
    registrations.filter(r => r.status === 'registered').forEach(r => subjectIds.add(r.subjectId));
    myClasses.forEach(c => (c.subjectIds || []).forEach(sid => subjectIds.add(sid)));

    // Fallback to all subjects matching department if explicit class subjectIds haven't been tagged yet
    const list = subjectIds.size > 0
      ? subjects.filter(s => subjectIds.has(s.id))
      : subjects.filter(s => !profile?.departmentId || s.departmentId === profile.departmentId);

    return list.map(sub => {
      const cls = myClasses.find(c => c.subjectIds?.includes(sub.id)) || myClasses[0];
      const slot = timetable.find(t => t.subjectId === sub.id && (!cls || t.classId === cls.id));
      const instructor = users.find(u => u.uid === (slot?.teacherId || cls?.teacherId || cls?.mentorId));
      const subMods = modules.filter(m => m.subjectId === sub.id);
      const subMats = materials.filter(m => m.subjectId === sub.id);
      const completedCount = subMats.filter(mat => progress.some(p => p.materialId === mat.id && p.completed)).length;
      const pct = subMats.length > 0 ? Math.round((completedCount / subMats.length) * 100) : 0;
      const grade = marks.find(m => m.subjectId === sub.id);
      const upcomingTasks = assignments.filter(a => a.subjectId === sub.id || (!a.subjectId && a.classId === cls?.id)).length + quizzes.filter(q => q.subjectId === sub.id).length;

      return {
        subject: sub,
        cls,
        instructorName: slot?.teacherName || instructor?.name || 'Assigned Faculty',
        modules: subMods,
        materials: subMats,
        progressPct: pct,
        grade,
        upcomingTasks,
        discussions: discussions.filter(d => d.subjectId === sub.id)
      };
    });
  }, [registrations, myClasses, subjects, profile?.departmentId, timetable, users, modules, materials, progress, marks, assignments, quizzes, discussions]);

  const activeCourse = enrolledCourses.find(c => c.subject.id === selectedSubjectId) || null;

  const toggleMaterialComplete = async (mat: LmsMaterial) => {
    if (!profile) return;
    const key = `${profile.uid}_${mat.id}`;
    const existing = progress.find(p => p.id === key || (p.studentId === profile.uid && p.materialId === mat.id));
    await setDoc(doc(db, 'lmsProgress', key), {
      studentId: profile.uid,
      materialId: mat.id,
      moduleId: mat.moduleId,
      classId: mat.classId,
      completed: !existing?.completed,
      completedAt: serverTimestamp()
    }, { merge: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Courses & Curriculum"
        subtitle="Dynamically linked to your registered sections, course syllabus, faculty instructors, LMS modules, and published grades."
        actions={
          <Link to="/student/registration" className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">
            Manage Course Registration
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Enrolled Courses" value={enrolledCourses.length} icon={BookOpen} tone="indigo" />
        <StatCard label="Total Credits" value={enrolledCourses.reduce((a, c) => a + (c.subject.credits || 0), 0)} icon={GraduationCap} tone="emerald" />
        <StatCard label="LMS Materials Available" value={enrolledCourses.reduce((a, c) => a + c.materials.length, 0)} icon={FileText} />
      </div>

      {enrolledCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {enrolledCourses.map(c => (
            <div key={c.subject.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between text-xs text-[#52525B]">
                  <span className="font-mono font-semibold text-[#111111] dark:text-zinc-200">{c.subject.code}</span>
                  <span className="font-mono">{c.subject.credits} credits · {c.subject.type}</span>
                </div>
                <h3 className="text-base font-semibold mt-1 text-[#111111] dark:text-zinc-100">{c.subject.name}</h3>
                <p className="text-xs text-[#52525B] mt-1">Instructor: {c.instructorName}</p>
                <p className="text-xs text-[#52525B] mt-0.5">
                  Section: {c.cls?.name || 'Core'} · {c.modules.length} modules · {c.upcomingTasks} activities
                </p>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-[#52525B] mb-1">
                    <span>Course Progress</span>
                    <span className="font-mono font-semibold">{c.progressPct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#111111] dark:bg-white dark:text-zinc-950 rounded-full" style={{ width: `${c.progressPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                {c.grade ? (
                  <span className="font-mono font-semibold text-[#111111] dark:text-zinc-200">Grade: {c.grade.grade}</span>
                ) : (
                  <span className="text-zinc-400">In Progress</span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId(c.subject.id)}
                  className="font-semibold text-[#111111] dark:text-zinc-200 hover:underline"
                >
                  Open Course →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No Enrolled Courses Found"
          description="Register for semester courses or ask Academic Affairs to assign subjects to your section."
          action={<Link to="/student/registration" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Go to Course Registration</Link>}
        />
      )}

      <Modal open={!!activeCourse} onClose={() => setSelectedSubjectId(null)} title={activeCourse ? `${activeCourse.subject.code} — ${activeCourse.subject.name}` : ''} maxWidth="max-w-3xl">
        {activeCourse && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800 text-[#52525B] dark:text-slate-300">
              <span>Instructor: <strong>{activeCourse.instructorName}</strong></span>
              <span>Section: <strong>{activeCourse.cls?.name || 'General'}</strong></span>
              <span>Credits: <strong className="font-mono">{activeCourse.subject.credits}</strong></span>
              <span>Progress: <strong className="font-mono">{activeCourse.progressPct}%</strong></span>
            </div>

            <div>
              <h4 className="font-semibold text-[#111111] dark:text-zinc-100 mb-1">Course Syllabus &amp; Overview</h4>
              <p className="text-[#52525B] dark:text-zinc-400 leading-relaxed">
                {activeCourse.subject.syllabus || `${activeCourse.subject.name} covers ${activeCourse.subject.lectureHours} lecture hours and ${activeCourse.subject.labHours} lab hours per week. Passing threshold: ${activeCourse.subject.passingMarks}/${activeCourse.subject.maxMarks}.`}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-[#111111] dark:text-zinc-100">Learning Modules &amp; Materials</h4>
              {activeCourse.modules.length > 0 ? activeCourse.modules.map(mod => {
                const mats = activeCourse.materials.filter(m => m.moduleId === mod.id);
                return (
                  <div key={mod.id} className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <p className="font-semibold text-[#111111] dark:text-zinc-100">{mod.orderIndex}. {mod.title}</p>
                    {mats.map(mat => {
                      const done = progress.some(p => p.materialId === mat.id && p.completed);
                      return (
                        <div key={mat.id} className="flex items-center justify-between gap-3 py-1.5 border-t border-slate-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <button type="button" onClick={() => toggleMaterialComplete(mat)} className="text-[#111111] shrink-0">
                              {done ? <CheckCircle2 className="w-4 h-4 text-[#111111]" /> : <Circle className="w-4 h-4 text-zinc-400" />}
                            </button>
                            {mat.type === 'video' || mat.type === 'recorded_session' ? <Video className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <PlayCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                            <span className={`truncate ${done ? 'line-through text-zinc-400' : 'font-medium'}`}>{mat.title}</span>
                          </div>
                          {mat.url && (
                            <a href={mat.url} target="_blank" rel="noreferrer" className="font-semibold text-[#111111] dark:text-zinc-200 hover:underline shrink-0">
                              Open Resource
                            </a>
                          )}
                        </div>
                      );
                    })}
                    {mats.length === 0 && <p className="text-zinc-400">No materials uploaded in this module yet.</p>}
                  </div>
                );
              }) : (
                <p className="text-zinc-400">No LMS modules published for this subject yet.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Link to="/lms" className="px-3.5 py-2 rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold">Open Full LMS Workspace</Link>
              <Link to="/assignments" className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 font-semibold">Assignments</Link>
              <Link to="/notices" className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Discussions ({activeCourse.discussions.length})
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
