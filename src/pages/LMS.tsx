import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  arrayUnion,
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
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  Link2,
  MessageSquare,
  PlayCircle,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Video
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import {
  LmsDiscussion,
  LmsMaterial,
  LmsModule,
  LmsProgress,
  QuestionBankItem,
  Quiz,
  QuizAttempt,
  QuizQuestion
} from '../types';

export const LMS: React.FC = () => {
  const { profile, isStudent, isTeacher, can } = useAuth();
  const { classes, subjects } = useUniversity();
  const canManage = can('lms.manage');

  const [modules, setModules] = useState<LmsModule[]>([]);
  const [materials, setMaterials] = useState<LmsMaterial[]>([]);
  const [progress, setProgress] = useState<LmsProgress[]>([]);
  const [discussions, setDiscussions] = useState<LmsDiscussion[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>('courses');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Module / Material Modals
  const [modModalOpen, setModModalOpen] = useState(false);
  const [modTitle, setModTitle] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modOrder, setModOrder] = useState(1);

  const [matModalOpen, setMatModalOpen] = useState(false);
  const [matModuleId, setMatModuleId] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<LmsMaterial['type']>('pdf');
  const [matUrl, setMatUrl] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matDuration, setMatDuration] = useState(30);

  // Question Bank Modal
  const [qbModalOpen, setQbModalOpen] = useState(false);
  const [qbType, setQbType] = useState<'mcq' | 'multi_select' | 'true_false' | 'short_answer'>('mcq');
  const [qbQuestion, setQbQuestion] = useState('');
  const [qbOptions, setQbOptions] = useState(['', '', '', '']);
  const [qbCorrect, setQbCorrect] = useState(0);
  const [qbCorrectIndices, setQbCorrectIndices] = useState<number[]>([0]);
  const [qbCorrectText, setQbCorrectText] = useState('');
  const [qbMarks, setQbMarks] = useState(2);
  const [qbDifficulty, setQbDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [qbTopic, setQbTopic] = useState('');

  // Quiz Builder Modal
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizDuration, setQuizDuration] = useState(20);
  const [quizDueDate, setQuizDueDate] = useState('');
  const [quizIsPractice, setQuizIsPractice] = useState(false);
  const [quizRandomize, setQuizRandomize] = useState(false);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(1);
  const [quizAllowReview, setQuizAllowReview] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Student Quiz Taker & Review Modals
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuizOrder, setActiveQuizOrder] = useState<number[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizMultiAnswers, setQuizMultiAnswers] = useState<Record<string, number[]>>({});
  const [quizTextAnswers, setQuizTextAnswers] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [quizNotice, setQuizNotice] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{ quiz: Quiz; attempt: QuizAttempt } | null>(null);
  const [gradingQuiz, setGradingQuiz] = useState<Quiz | null>(null);
  const [attemptScoreDraft, setAttemptScoreDraft] = useState<Record<string, number>>({});

  // Discussion state
  const [discTitle, setDiscTitle] = useState('');
  const [discContent, setDiscContent] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'lmsModules'),
      s => {
        setModules(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsModule)).sort((a, b) => a.orderIndex - b.orderIndex));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = onSnapshot(collection(db, 'lmsMaterials'), s => setMaterials(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsMaterial))), () => {});
    const progQ = canManage
      ? collection(db, 'lmsProgress')
      : profile?.uid
      ? query(collection(db, 'lmsProgress'), where('studentId', '==', profile.uid))
      : null;
    const u3 = progQ
      ? onSnapshot(progQ, s => setProgress(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsProgress))), () => {})
      : () => {};
    const u4 = onSnapshot(collection(db, 'lmsDiscussions'), s => setDiscussions(s.docs.map(d => ({ id: d.id, ...d.data() } as LmsDiscussion))), () => {});
    const u5 = canManage
      ? onSnapshot(collection(db, 'questionBank'), s => setQuestionBank(s.docs.map(d => ({ id: d.id, ...d.data() } as QuestionBankItem))), () => {})
      : () => {};
    const u6 = onSnapshot(collection(db, 'quizzes'), s => setQuizzes(s.docs.map(d => ({ id: d.id, ...d.data() } as Quiz))), () => {});
    const attemptsQ = canManage
      ? collection(db, 'quizAttempts')
      : profile?.uid
      ? query(collection(db, 'quizAttempts'), where('studentId', '==', profile.uid))
      : null;
    const u7 = attemptsQ
      ? onSnapshot(attemptsQ, s => setQuizAttempts(s.docs.map(d => ({ id: d.id, ...d.data() } as QuizAttempt))), () => {})
      : () => {};
    return () => {
      u1(); u2(); u3(); u4(); u5(); u6(); u7();
    };
  }, [canManage, profile?.uid]);

  const accessibleClasses = useMemo(() => {
    if (can('academics.manage')) return classes;
    if (isStudent && profile?.uid) {
      return classes.filter(c => c.students?.includes(profile.uid) || c.id === profile.classId);
    }
    if (isTeacher && profile?.uid) {
      const own = classes.filter(c => c.teacherId === profile.uid || c.mentorId === profile.uid);
      return own.length ? own : classes;
    }
    return classes;
  }, [classes, can, isStudent, isTeacher, profile?.uid, profile?.classId]);

  useEffect(() => {
    if (!selectedClassId && accessibleClasses.length > 0) {
      setSelectedClassId(accessibleClasses[0].id);
    }
  }, [accessibleClasses, selectedClassId]);

  const classSubjects = useMemo(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    if (cls?.subjectIds?.length) {
      return subjects.filter(s => cls.subjectIds?.includes(s.id));
    }
    return subjects;
  }, [classes, selectedClassId, subjects]);

  useEffect(() => {
    if (classSubjects.length > 0 && !classSubjects.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(classSubjects[0].id);
    }
  }, [classSubjects, selectedSubjectId]);

  // Quiz countdown timer
  useEffect(() => {
    if (!activeQuiz || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          handleSubmitQuizAttempt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [activeQuiz, secondsLeft]);

  const filteredModules = useMemo(() => {
    return modules.filter(m =>
      (!selectedClassId || m.classId === selectedClassId) &&
      (!selectedSubjectId || m.subjectId === selectedSubjectId)
    );
  }, [modules, selectedClassId, selectedSubjectId]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m =>
      (!selectedClassId || m.classId === selectedClassId) &&
      (!selectedSubjectId || m.subjectId === selectedSubjectId)
    );
  }, [materials, selectedClassId, selectedSubjectId]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q =>
      (!selectedClassId || q.classId === selectedClassId) &&
      (!selectedSubjectId || q.subjectId === selectedSubjectId) &&
      (canManage || q.isPublished)
    );
  }, [quizzes, selectedClassId, selectedSubjectId, canManage]);

  const filteredDiscussions = useMemo(() => {
    return discussions.filter(d =>
      (!selectedClassId || d.classId === selectedClassId) &&
      (!selectedSubjectId || d.subjectId === selectedSubjectId)
    );
  }, [discussions, selectedClassId, selectedSubjectId]);

  const myProgressSet = useMemo(() => {
    return new Set(progress.filter(p => p.studentId === profile?.uid && p.completed).map(p => p.materialId));
  }, [progress, profile?.uid]);

  const completionPercent = useMemo(() => {
    if (filteredMaterials.length === 0) return 0;
    const done = filteredMaterials.filter(m => myProgressSet.has(m.id)).length;
    return Math.round((done / filteredMaterials.length) * 100);
  }, [filteredMaterials, myProgressSet]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const cls = classes.find(c => c.id === selectedClassId);
    const sub = subjects.find(s => s.id === selectedSubjectId);
    const ref = await addDoc(collection(db, 'lmsModules'), {
      subjectId: selectedSubjectId,
      subjectName: sub?.name || '',
      classId: selectedClassId,
      className: cls?.name || '',
      teacherId: profile.uid,
      title: modTitle,
      description: modDesc,
      orderIndex: Number(modOrder) || 1,
      isPublished: true,
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_LMS_MODULE', 'LMS', ref.id, `${sub?.name}: ${modTitle}`);
    setModModalOpen(false);
    setModTitle('');
    setModDesc('');
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const ref = await addDoc(collection(db, 'lmsMaterials'), {
      moduleId: matModuleId,
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      teacherId: profile.uid,
      title: matTitle,
      type: matType,
      url: matUrl,
      content: matContent,
      durationMinutes: Number(matDuration) || 15,
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'UPLOAD_LMS_MATERIAL', 'LMS', ref.id, `${matTitle} (${matType})`);
    setMatModalOpen(false);
    setMatTitle('');
    setMatUrl('');
    setMatContent('');
  };

  const toggleCompletion = async (mat: LmsMaterial) => {
    if (!profile) return;
    const id = `${profile.uid}_${mat.id}`;
    const isDone = myProgressSet.has(mat.id);
    await setDoc(doc(db, 'lmsProgress', id), {
      studentId: profile.uid,
      materialId: mat.id,
      subjectId: mat.subjectId,
      classId: mat.classId,
      completed: !isDone,
      completedAt: serverTimestamp()
    });
  };

  const handleAddQuestionBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const sub = subjects.find(s => s.id === selectedSubjectId);
    const normalizedOptions =
      qbType === 'true_false'
        ? ['True', 'False']
        : qbType === 'short_answer'
        ? []
        : qbOptions;

    await addDoc(collection(db, 'questionBank'), {
      subjectId: selectedSubjectId,
      subjectName: sub?.name || '',
      teacherId: profile.uid,
      questionType: qbType,
      question: qbQuestion,
      options: normalizedOptions,
      correctOptionIndex: qbCorrect,
      correctOptionIndices: qbType === 'multi_select' ? qbCorrectIndices : [],
      correctTextAnswer: qbType === 'short_answer' ? qbCorrectText.trim() : '',
      marks: Number(qbMarks) || 2,
      difficulty: qbDifficulty,
      topic: qbTopic || 'General'
    });
    setQbModalOpen(false);
    setQbType('mcq');
    setQbQuestion('');
    setQbOptions(['', '', '', '']);
    setQbCorrect(0);
    setQbCorrectIndices([0]);
    setQbCorrectText('');
    setQbTopic('');
  };

  const importQuestionFromBank = (q: QuestionBankItem) => {
    setQuizQuestions(prev => [
      ...prev,
      {
        question: q.question,
        questionType: q.questionType || 'mcq',
        options: q.options || [],
        correctOptionIndex: q.correctOptionIndex ?? 0,
        correctOptionIndices: q.correctOptionIndices || [],
        correctTextAnswer: q.correctTextAnswer || '',
        marks: q.marks
      }
    ]);
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || quizQuestions.length === 0) return;
    const cls = classes.find(c => c.id === selectedClassId);
    const sub = subjects.find(s => s.id === selectedSubjectId);
    const totalMarks = quizQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
    const sanitizedQuestions = quizQuestions.map(q => ({
      ...q,
      questionType: q.questionType || 'mcq',
      options: q.questionType === 'true_false' ? ['True', 'False'] : q.questionType === 'short_answer' ? [] : q.options,
      correctOptionIndices: q.questionType === 'multi_select' ? q.correctOptionIndices || [] : [],
      correctTextAnswer: q.questionType === 'short_answer' ? (q.correctTextAnswer || '').trim() : ''
    }));
    const ref = await addDoc(collection(db, 'quizzes'), {
      classId: selectedClassId,
      className: cls?.name || '',
      subjectId: selectedSubjectId,
      subjectName: sub?.name || '',
      teacherId: profile.uid,
      title: quizTitle,
      description: quizDesc,
      durationMinutes: Number(quizDuration) || 20,
      totalMarks,
      dueDate: quizDueDate,
      questions: sanitizedQuestions,
      isPublished: true,
      isPractice: quizIsPractice,
      randomizeQuestions: quizRandomize,
      maxAttempts: quizIsPractice ? 99 : Math.max(1, Number(quizMaxAttempts) || 1),
      allowReview: quizAllowReview,
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_QUIZ', 'LMS', ref.id, `${quizTitle} (${quizQuestions.length} Qs)`);
    setQuizModalOpen(false);
    setQuizTitle('');
    setQuizDesc('');
    setQuizIsPractice(false);
    setQuizRandomize(false);
    setQuizMaxAttempts(1);
    setQuizAllowReview(true);
    setQuizQuestions([]);
  };

  const startQuiz = (quiz: Quiz) => {
    const myAttempts = quizAttempts.filter(a => a.quizId === quiz.id && a.studentId === profile?.uid);
    const limit = quiz.isPractice ? 99 : quiz.maxAttempts || 1;
    if (myAttempts.length >= limit) {
      setQuizNotice(`You have already used all ${limit} allowed attempt(s) for "${quiz.title}".`);
      return;
    }
    const order = quiz.questions.map((_, i) => i);
    if (quiz.randomizeQuestions) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    setQuizNotice(null);
    setActiveQuizOrder(order);
    setActiveQuiz(quiz);
    setQuizAnswers(new Array(quiz.questions.length).fill(-1));
    setQuizMultiAnswers({});
    setQuizTextAnswers(new Array(quiz.questions.length).fill(''));
    setSecondsLeft((quiz.durationMinutes || 15) * 60);
  };

  const computeAttemptObjectiveScore = (quiz: Quiz, attempt: Pick<QuizAttempt, 'answers' | 'multiAnswers' | 'textAnswers'>) => {
    let score = 0;
    let needsManualGrading = false;
    (quiz.questions || []).forEach((q, idx) => {
      const qType = q.questionType || 'mcq';
      const pts = q.marks || 1;
      if (qType === 'mcq' || qType === 'true_false') {
        if (attempt.answers?.[idx] === q.correctOptionIndex) score += pts;
      } else if (qType === 'multi_select') {
        const chosen = [...(attempt.multiAnswers?.[String(idx)] || [])].sort((a, b) => a - b);
        const expected = [...(q.correctOptionIndices || [])].sort((a, b) => a - b);
        if (expected.length > 0 && chosen.length === expected.length && chosen.every((v, i) => v === expected[i])) {
          score += pts;
        }
      } else if (qType === 'short_answer') {
        const expectedText = (q.correctTextAnswer || '').trim().toLowerCase();
        const studentText = (attempt.textAnswers?.[idx] || '').trim().toLowerCase();
        if (!expectedText) {
          needsManualGrading = true;
        } else if (studentText === expectedText) {
          score += pts;
        }
      }
    });
    return { score, needsManualGrading };
  };

  const handleSubmitQuizAttempt = async () => {
    if (!activeQuiz || !profile) return;
    await addDoc(collection(db, 'quizAttempts'), {
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      studentId: profile.uid,
      studentName: profile.name,
      answers: quizAnswers,
      multiAnswers: quizMultiAnswers,
      textAnswers: quizTextAnswers,
      status: 'pending',
      submittedAt: serverTimestamp()
    });
    await logAudit(profile, 'SUBMIT_QUIZ', 'LMS', activeQuiz.id, `Submitted attempt for ${activeQuiz.title}`);
    setQuizNotice(`Submitted "${activeQuiz.title}" for faculty grading and score verification.`);
    setActiveQuiz(null);
  };

  const handleGradeQuizAttempt = async (quiz: Quiz, attempt: QuizAttempt) => {
    if (!canManage || !profile) return;
    const { score: autoScore } = computeAttemptObjectiveScore(quiz, attempt);
    const finalScore = Math.max(0, Math.min(quiz.totalMarks || 100, Number(attemptScoreDraft[attempt.id] ?? attempt.score ?? autoScore)));
    const pct = quiz.totalMarks > 0 ? Math.round((finalScore / quiz.totalMarks) * 100) : 0;
    await updateDoc(doc(db, 'quizAttempts', attempt.id), {
      score: finalScore,
      totalMarks: quiz.totalMarks,
      percentage: pct,
      needsManualGrading: false,
      status: 'graded',
      gradedBy: profile.name || profile.uid
    });
    await logAudit(profile, 'GRADE_QUIZ_ATTEMPT', 'LMS', attempt.id, `${attempt.studentName}: ${finalScore}/${quiz.totalMarks} (${pct}%)`);
    setQuizNotice(`Graded ${attempt.studentName} on "${quiz.title}" — ${finalScore}/${quiz.totalMarks} (${pct}%).`);
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !discTitle.trim()) return;
    await addDoc(collection(db, 'lmsDiscussions'), {
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      authorId: profile.uid,
      authorName: profile.name,
      authorRole: profile.role,
      title: discTitle,
      content: discContent,
      replies: [],
      createdAt: serverTimestamp()
    });
    setDiscTitle('');
    setDiscContent('');
  };

  const handleReplyDiscussion = async (discId: string) => {
    const text = (replyText[discId] || '').trim();
    if (!text || !profile) return;
    await updateDoc(doc(db, 'lmsDiscussions', discId), {
      replies: arrayUnion({
        id: `${Date.now()}`,
        authorId: profile.uid,
        authorName: profile.name,
        authorRole: profile.role,
        content: text,
        createdAt: new Date().toISOString()
      })
    });
    setReplyText(prev => ({ ...prev, [discId]: '' }));
  };

  if (loading) {
    return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Management System (LMS)"
        subtitle="Structured course modules, video lectures, study notes, quizzes, question banks, and course discussions."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                <Plus className="w-3.5 h-3.5" /> New Module
              </button>
              <button
                type="button"
                onClick={() => { setMatModuleId(filteredModules[0]?.id || ''); setMatModalOpen(true); }}
                disabled={filteredModules.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50"
              >
                <Video className="w-3.5 h-3.5" /> Add Material / Lecture
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Course Selector */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <div>
            <label className="block text-[11px] font-medium text-[#52525B] mb-1">Class / Cohort</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            >
              {accessibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#52525B] mb-1">Course / Subject</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            >
              {classSubjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </select>
          </div>
        </div>
        {isStudent && (
          <div className="min-w-[220px]">
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#52525B]">Course Completion</span>
              <span className="font-mono text-[#111111] dark:text-zinc-200 tabular-nums">{completionPercent}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#111111] dark:bg-white dark:text-zinc-950 transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Course Modules" value={filteredModules.length} icon={BookOpen} tone="indigo" />
        <StatCard label="Learning Resources" value={filteredMaterials.length} icon={FileText} tone="emerald" />
        <StatCard label="Online Quizzes" value={filteredQuizzes.length} icon={HelpCircle} tone="amber" />
        <StatCard label="Discussion Threads" value={filteredDiscussions.length} icon={MessageSquare} />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'courses', label: 'Course Modules & Lectures', count: filteredModules.length },
          { id: 'quizzes', label: 'Quizzes & Assessments', count: filteredQuizzes.length },
          ...(canManage ? [{ id: 'bank', label: 'Question Bank', count: questionBank.filter(q => !selectedSubjectId || q.subjectId === selectedSubjectId).length }] : []),
          { id: 'discussions', label: 'Discussion Forum', count: filteredDiscussions.length }
        ]}
      />

      {/* Modules & Materials */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {filteredModules.length > 0 ? filteredModules.map(mod => {
            const modMaterials = filteredMaterials.filter(m => m.moduleId === mod.id);
            return (
              <div key={mod.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono text-[#111111] dark:text-zinc-200">Module {mod.orderIndex}</p>
                    <h3 className="text-base font-semibold text-[#111111] dark:text-zinc-100 mt-0.5">{mod.title}</h3>
                    {mod.description && <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1">{mod.description}</p>}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setMatModuleId(mod.id); setMatModalOpen(true); }}
                        className="text-xs font-medium text-[#111111] dark:text-zinc-200 hover:underline"
                      >
                        + Add Resource
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDoc(doc(db, 'lmsModules', mod.id))}
                        className="p-1 text-zinc-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {modMaterials.length > 0 ? modMaterials.map(mat => {
                    const done = myProgressSet.has(mat.id);
                    const IconComp = mat.type === 'video' || mat.type === 'recorded_session' ? PlayCircle : mat.type === 'live_link' ? Link2 : FileText;
                    return (
                      <div key={mat.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {isStudent && (
                            <button
                              type="button"
                              onClick={() => toggleCompletion(mat)}
                              className="mt-0.5 text-[#111111] dark:text-zinc-200"
                              title={done ? 'Completed' : 'Mark as completed'}
                            >
                              {done ? <CheckCircle2 className="w-4 h-4 text-[#111111]" /> : <Circle className="w-4 h-4 text-slate-300 dark:text-[#52525B]" />}
                            </button>
                          )}
                          <IconComp className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-[#111111] dark:text-zinc-100">{mat.title}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#52525B] mt-0.5">
                              <span className="capitalize">{mat.type.replace('_', ' ')}</span>
                              {mat.durationMinutes && <span className="font-mono">{mat.durationMinutes} min</span>}
                            </div>
                            {mat.content && <p className="text-xs text-[#52525B] dark:text-slate-300 mt-1.5 whitespace-pre-wrap">{mat.content}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {mat.url && (
                            <a
                              href={mat.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
                            >
                              Open Resource
                            </a>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => deleteDoc(doc(db, 'lmsMaterials', mat.id))}
                              className="text-xs text-rose-500 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="px-5 py-6 text-xs text-zinc-400 text-center">No resources uploaded to this module yet.</p>
                  )}
                </div>
              </div>
            );
          }) : (
            <EmptyState
              icon={GraduationCap}
              title="No Course Modules Yet"
              description={canManage ? 'Create your first module to organize lecture videos, slides, notes, and live class links.' : 'Your instructor has not published modules for this subject yet.'}
            />
          )}
        </div>
      )}

      {/* Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          {quizNotice && (
            <div className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs text-[#111111] dark:text-zinc-200 flex items-center justify-between">
              <span className="font-medium">{quizNotice}</span>
              <button type="button" onClick={() => setQuizNotice(null)} className="underline">Dismiss</button>
            </div>
          )}
          {canManage && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setQuizModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
              >
                <Plus className="w-3.5 h-3.5" /> Build New Quiz
              </button>
            </div>
          )}

          {filteredQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuizzes.map(q => {
                const myAttempts = quizAttempts
                  .filter(a => a.quizId === q.id && a.studentId === profile?.uid)
                  .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
                const latestAttempt = myAttempts[0];
                const maxAllowed = q.isPractice ? 99 : q.maxAttempts || 1;
                const canAttemptMore = q.isPractice || myAttempts.length < maxAllowed;
                const attemptCount = quizAttempts.filter(a => a.quizId === q.id).length;

                return (
                  <div key={q.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#52525B]">
                        <span className="font-mono">
                          {q.durationMinutes} min · {q.totalMarks} marks {q.isPractice ? '· Practice Mode' : ''}
                        </span>
                        <span>Due: {q.dueDate || 'Flexible'}</span>
                      </div>
                      <h3 className="text-base font-semibold text-[#111111] dark:text-zinc-100 mt-1">{q.title}</h3>
                      <p className="text-xs text-[#52525B] mt-1">{q.description}</p>
                      <p className="text-xs font-mono text-zinc-400 mt-2">
                        {q.questions?.length || 0} questions
                        {q.randomizeQuestions ? ' · Randomized' : ''}
                        {!q.isPractice ? ` · Attempts: ${myAttempts.length}/${maxAllowed}` : ` · Attempts: ${myAttempts.length} (Unlimited)`}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                      {isStudent ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                          {latestAttempt ? (
                            <div className="flex items-center gap-2">
                              <StatusText
                                status={
                                  latestAttempt.status === 'graded' || typeof latestAttempt.score === 'number'
                                    ? latestAttempt.needsManualGrading ? 'needs_grading' : 'graded'
                                    : 'pending'
                                }
                              />
                              {typeof latestAttempt.score === 'number' ? (
                                <span className="text-xs font-mono font-semibold text-[#111111] dark:text-zinc-200">
                                  {latestAttempt.score}/{latestAttempt.totalMarks ?? q.totalMarks} ({latestAttempt.percentage ?? 0}%)
                                </span>
                              ) : (
                                <span className="text-xs text-[#52525B]">Awaiting faculty verification</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">Not attempted yet</span>
                          )}
                          <div className="flex items-center gap-2">
                            {latestAttempt && q.allowReview !== false && (
                              <button
                                type="button"
                                onClick={() => setReviewData({ quiz: q, attempt: latestAttempt })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
                              >
                                <Eye className="w-3.5 h-3.5" /> Review Answers
                              </button>
                            )}
                            {canAttemptMore && (
                              <button
                                type="button"
                                onClick={() => startQuiz(q)}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
                              >
                                {latestAttempt ? <><RotateCcw className="w-3.5 h-3.5" /> Retake</> : 'Start Timed Quiz'}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-xs text-[#52525B]">
                          <span>{attemptCount} student submission(s)</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setGradingQuiz(q)}
                              className="font-semibold text-[#111111] dark:text-zinc-200 hover:underline"
                            >
                              Grade Attempts
                            </button>
                            <button onClick={() => deleteDoc(doc(db, 'quizzes', q.id))} className="text-rose-500 hover:underline">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={HelpCircle} title="No Quizzes Available" description="Assessments created for this subject will appear here." />
          )}
        </div>
      )}

      {/* Question Bank */}
      {activeTab === 'bank' && canManage && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Subject Question Bank</h3>
              <p className="text-xs text-[#52525B]">Reusable MCQ, Multi-Select, True/False, and Short Answer items.</p>
            </div>
            <button
              type="button"
              onClick={() => setQbModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {questionBank.filter(q => !selectedSubjectId || q.subjectId === selectedSubjectId).map(item => {
              const qType = item.questionType || 'mcq';
              return (
                <div key={item.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#52525B]">
                      <span className="font-mono uppercase">{qType.replace('_', ' ')}</span>
                      <span>· {item.difficulty}</span>
                      <span>· {item.topic}</span>
                      <span className="font-mono">· {item.marks} pts</span>
                    </div>
                    <p className="text-sm font-medium">{item.question}</p>
                    {qType === 'short_answer' ? (
                      <p className="text-xs text-[#111111] dark:text-zinc-200">
                        Key: {item.correctTextAnswer || 'Manual evaluation'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 text-xs text-[#52525B] pt-1">
                        {item.options.map((opt, idx) => {
                          const isCorrect =
                            qType === 'multi_select'
                              ? (item.correctOptionIndices || []).includes(idx)
                              : idx === item.correctOptionIndex;
                          return (
                            <span key={idx} className={isCorrect ? 'text-[#111111] dark:text-zinc-200 font-semibold' : ''}>
                              {String.fromCharCode(65 + idx)}. {opt}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'questionBank', item.id))} className="text-xs text-rose-500 hover:underline shrink-0">
                    Delete
                  </button>
                </div>
              );
            })}
            {questionBank.filter(q => !selectedSubjectId || q.subjectId === selectedSubjectId).length === 0 && (
              <p className="py-8 text-center text-xs text-zinc-400">No questions in bank for this subject.</p>
            )}
          </div>
        </div>
      )}

      {/* Discussions */}
      {activeTab === 'discussions' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateDiscussion} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-4 space-y-3">
            <h3 className="text-sm font-semibold">Start Course Discussion</h3>
            <input
              type="text"
              required
              value={discTitle}
              onChange={e => setDiscTitle(e.target.value)}
              placeholder="Topic title or question..."
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            />
            <textarea
              required
              rows={2}
              value={discContent}
              onChange={e => setDiscContent(e.target.value)}
              placeholder="Write your question or announcement for the class..."
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            />
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">
                Post Thread
              </button>
            </div>
          </form>

          {filteredDiscussions.map(d => (
            <div key={d.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-[#52525B]">
                  <span>{d.authorName} · <span className="capitalize">{d.authorRole}</span></span>
                  <span>{d.replies?.length || 0} replies</span>
                </div>
                <h4 className="text-sm font-semibold text-[#111111] dark:text-zinc-100 mt-1">{d.title}</h4>
                <p className="text-xs text-[#52525B] dark:text-slate-300 mt-1 whitespace-pre-wrap">{d.content}</p>
              </div>
              {d.replies?.length > 0 && (
                <div className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                  {d.replies.map(r => (
                    <div key={r.id} className="text-xs">
                      <span className="font-semibold text-[#27272A] dark:text-slate-200">{r.authorName}: </span>
                      <span className="text-[#52525B] dark:text-slate-300">{r.content}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={replyText[d.id] || ''}
                  onChange={e => setReplyText(prev => ({ ...prev, [d.id]: e.target.value }))}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleReplyDiscussion(d.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-[#111111] inline-flex items-center gap-1"
                >
                  <Send className="w-3 h-3" /> Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Module Modal */}
      <Modal open={modModalOpen} onClose={() => setModModalOpen(false)} title="Create Course Module">
        <form onSubmit={handleCreateModule} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Module Title</label>
              <input type="text" required value={modTitle} onChange={e => setModTitle(e.target.value)} placeholder="e.g. Trees, Graphs & Traversal" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Order</label>
              <input type="number" min={1} value={modOrder} onChange={e => setModOrder(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Module Summary</label>
            <textarea rows={3} value={modDesc} onChange={e => setModDesc(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Create Module</button>
          </div>
        </form>
      </Modal>

      {/* Add Material Modal */}
      <Modal open={matModalOpen} onClose={() => setMatModalOpen(false)} title="Add Learning Material">
        <form onSubmit={handleCreateMaterial} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Module</label>
            <select required value={matModuleId} onChange={e => setMatModuleId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {filteredModules.map(m => <option key={m.id} value={m.id}>Module {m.orderIndex}: {m.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Resource Title</label>
              <input type="text" required value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="e.g. Lecture 4 Video & Slides" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Format</label>
              <select value={matType} onChange={e => setMatType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="pdf">PDF Handout</option>
                <option value="presentation">Presentation Slides</option>
                <option value="video">Video Lecture</option>
                <option value="recorded_session">Recorded Class</option>
                <option value="live_link">Live Class Link</option>
                <option value="notes">Written Lecture Notes</option>
                <option value="document">Document</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Resource URL (Video / PDF / Meeting Link)</label>
              <input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Duration (min)</label>
              <input type="number" min={1} value={matDuration} onChange={e => setMatDuration(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Study Notes / Instructions</label>
            <textarea rows={3} value={matContent} onChange={e => setMatContent(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMatModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Resource</button>
          </div>
        </form>
      </Modal>

      {/* Question Bank Modal */}
      <Modal open={qbModalOpen} onClose={() => setQbModalOpen(false)} title="Add Question Bank Item">
        <form onSubmit={handleAddQuestionBank} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium mb-1">Question Type</label>
              <select value={qbType} onChange={e => setQbType(e.target.value as any)} className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="mcq">Single Choice (MCQ)</option>
                <option value="multi_select">Multiple Select</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Topic</label>
              <input type="text" value={qbTopic} onChange={e => setQbTopic(e.target.value)} placeholder="Trees" className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Question Prompt</label>
            <textarea required rows={2} value={qbQuestion} onChange={e => setQbQuestion(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>

          {(qbType === 'mcq' || qbType === 'multi_select') && (
            <div className="grid grid-cols-2 gap-2">
              {qbOptions.map((opt, idx) => (
                <div key={idx}>
                  <label className="block text-[11px] font-medium mb-0.5">Option {String.fromCharCode(65 + idx)}</label>
                  <input
                    type="text"
                    required
                    value={opt}
                    onChange={e => setQbOptions(prev => prev.map((x, i) => (i === idx ? e.target.value : x)))}
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              ))}
            </div>
          )}

          {qbType === 'short_answer' && (
            <div>
              <label className="block text-[11px] font-medium mb-1">Expected Answer Key (Optional for manual grading)</label>
              <input type="text" value={qbCorrectText} onChange={e => setQbCorrectText(e.target.value)} placeholder="Exact match keyword/phrase" className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {qbType === 'mcq' && (
              <div>
                <label className="block text-[11px] font-medium mb-1">Correct Option</label>
                <select value={qbCorrect} onChange={e => setQbCorrect(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  {[0, 1, 2, 3].map(i => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}
                </select>
              </div>
            )}
            {qbType === 'true_false' && (
              <div>
                <label className="block text-[11px] font-medium mb-1">Correct Answer</label>
                <select value={qbCorrect} onChange={e => setQbCorrect(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value={0}>True</option>
                  <option value={1}>False</option>
                </select>
              </div>
            )}
            {qbType === 'multi_select' && (
              <div>
                <label className="block text-[11px] font-medium mb-1">Correct Options</label>
                <div className="flex gap-2 py-1">
                  {[0, 1, 2, 3].map(i => (
                    <label key={i} className="inline-flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={qbCorrectIndices.includes(i)}
                        onChange={() =>
                          setQbCorrectIndices(prev => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]))
                        }
                      />
                      {String.fromCharCode(65 + i)}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-medium mb-1">Difficulty</label>
              <select value={qbDifficulty} onChange={e => setQbDifficulty(e.target.value as any)} className="w-full px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Marks</label>
              <input type="number" min={1} value={qbMarks} onChange={e => setQbMarks(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setQbModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Question</button>
          </div>
        </form>
      </Modal>

      {/* Quiz Builder Modal */}
      <Modal open={quizModalOpen} onClose={() => setQuizModalOpen(false)} title="Build Online Quiz" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateQuiz} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Quiz Title</label>
              <input type="text" required value={quizTitle} onChange={e => setQuizTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Duration (min)</label>
              <input type="number" min={5} value={quizDuration} onChange={e => setQuizDuration(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" value={quizDesc} onChange={e => setQuizDesc(e.target.value)} placeholder="Short instructions" className="sm:col-span-2 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input type="date" value={quizDueDate} onChange={e => setQuizDueDate(e.target.value)} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={quizIsPractice} onChange={e => setQuizIsPractice(e.target.checked)} />
              Practice Mode
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={quizRandomize} onChange={e => setQuizRandomize(e.target.checked)} />
              Randomize Qs
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={quizAllowReview} onChange={e => setQuizAllowReview(e.target.checked)} />
              Allow Review
            </label>
            <label className="inline-flex items-center gap-2">
              <span>Max Attempts:</span>
              <input
                type="number"
                min={1}
                disabled={quizIsPractice}
                value={quizIsPractice ? 99 : quizMaxAttempts}
                onChange={e => setQuizMaxAttempts(Number(e.target.value))}
                className="w-12 px-1.5 py-0.5 font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
              />
            </label>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Import from Question Bank</p>
              <button
                type="button"
                onClick={() =>
                  setQuizQuestions(prev => [
                    ...prev,
                    { question: '', questionType: 'mcq', options: ['', '', '', ''], correctOptionIndex: 0, correctOptionIndices: [0], correctTextAnswer: '', marks: 2 }
                  ])
                }
                className="text-xs text-[#111111] dark:text-zinc-200 hover:underline"
              >
                + Add Custom Question
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {questionBank.filter(q => !selectedSubjectId || q.subjectId === selectedSubjectId).map(qb => (
                <button
                  key={qb.id}
                  type="button"
                  onClick={() => importQuestionFromBank(qb)}
                  className="px-2 py-1 text-[11px] rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 truncate max-w-[240px]"
                >
                  + {qb.question}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto">
            {quizQuestions.map((q, qIdx) => {
              const qType = q.questionType || 'mcq';
              return (
                <div key={qIdx} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={qType}
                      onChange={e =>
                        setQuizQuestions(prev =>
                          prev.map((x, i) =>
                            i === qIdx
                              ? {
                                  ...x,
                                  questionType: e.target.value as any,
                                  options: e.target.value === 'true_false' ? ['True', 'False'] : e.target.value === 'short_answer' ? [] : x.options.length === 4 ? x.options : ['', '', '', '']
                                }
                              : x
                          )
                        )
                      }
                      className="px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="multi_select">Multi-Select</option>
                      <option value="true_false">True/False</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={q.question}
                      onChange={e => setQuizQuestions(prev => prev.map((x, i) => (i === qIdx ? { ...x, question: e.target.value } : x)))}
                      placeholder={`Question ${qIdx + 1}`}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                    />
                    <button type="button" onClick={() => setQuizQuestions(prev => prev.filter((_, i) => i !== qIdx))} className="text-rose-500 text-xs">Remove</button>
                  </div>

                  {(qType === 'mcq' || qType === 'multi_select') && (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          required
                          value={opt}
                          onChange={e =>
                            setQuizQuestions(prev =>
                              prev.map((x, i) =>
                                i === qIdx ? { ...x, options: x.options.map((o, oi) => (oi === oIdx ? e.target.value : o)) } : x
                              )
                            )
                          }
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          className="px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                        />
                      ))}
                    </div>
                  )}

                  {qType === 'short_answer' && (
                    <input
                      type="text"
                      value={q.correctTextAnswer || ''}
                      onChange={e => setQuizQuestions(prev => prev.map((x, i) => (i === qIdx ? { ...x, correctTextAnswer: e.target.value } : x)))}
                      placeholder="Expected short answer (leave blank for manual review)"
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {qType === 'mcq' && (
                      <label>Correct:
                        <select
                          value={q.correctOptionIndex}
                          onChange={e => setQuizQuestions(prev => prev.map((x, i) => (i === qIdx ? { ...x, correctOptionIndex: Number(e.target.value) } : x)))}
                          className="ml-1.5 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                        >
                          {[0, 1, 2, 3].map(i => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}
                        </select>
                      </label>
                    )}
                    {qType === 'true_false' && (
                      <label>Correct:
                        <select
                          value={q.correctOptionIndex}
                          onChange={e => setQuizQuestions(prev => prev.map((x, i) => (i === qIdx ? { ...x, correctOptionIndex: Number(e.target.value) } : x)))}
                          className="ml-1.5 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                        >
                          <option value={0}>True</option>
                          <option value={1}>False</option>
                        </select>
                      </label>
                    )}
                    {qType === 'multi_select' && (
                      <div className="flex items-center gap-2">
                        <span>Correct:</span>
                        {[0, 1, 2, 3].map(i => (
                          <label key={i} className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={(q.correctOptionIndices || []).includes(i)}
                              onChange={() =>
                                setQuizQuestions(prev =>
                                  prev.map((x, qi) => {
                                    if (qi !== qIdx) return x;
                                    const cur = x.correctOptionIndices || [];
                                    return {
                                      ...x,
                                      correctOptionIndices: cur.includes(i) ? cur.filter(v => v !== i) : [...cur, i]
                                    };
                                  })
                                )
                              }
                            />
                            {String.fromCharCode(65 + i)}
                          </label>
                        ))}
                      </div>
                    )}
                    <label>Marks:
                      <input
                        type="number"
                        min={1}
                        value={q.marks}
                        onChange={e => setQuizQuestions(prev => prev.map((x, i) => (i === qIdx ? { ...x, marks: Number(e.target.value) } : x)))}
                        className="ml-1.5 w-14 px-2 py-1 font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setQuizModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" disabled={quizQuestions.length === 0} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white disabled:opacity-50">
              Publish Quiz ({quizQuestions.length} Qs)
            </button>
          </div>
        </form>
      </Modal>

      {/* Active Student Quiz Modal */}
      <Modal
        open={!!activeQuiz}
        onClose={() => setActiveQuiz(null)}
        title={activeQuiz?.title || 'Timed Quiz'}
        subtitle={`Time remaining: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
        maxWidth="max-w-2xl"
      >
        {activeQuiz && (
          <div className="space-y-5">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-[#111111] dark:text-zinc-300">
              <span className="flex items-center gap-1.5 font-medium"><Clock className="w-3.5 h-3.5" /> Auto-submits when timer reaches 00:00</span>
              <span className="font-mono font-bold tabular-nums">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
            </div>

            {(activeQuizOrder.length === activeQuiz.questions.length ? activeQuizOrder : activeQuiz.questions.map((_, i) => i)).map((qIdx, displayIdx) => {
              const q = activeQuiz.questions[qIdx];
              const qType = q.questionType || 'mcq';
              const multiSel = quizMultiAnswers[String(qIdx)] || [];
              return (
                <div key={qIdx} className="space-y-2 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <p className="text-sm font-medium">
                    {displayIdx + 1}. {q.question} <span className="text-xs font-mono text-zinc-400">({q.marks}m · {qType.replace('_', ' ')})</span>
                  </p>

                  {qType === 'short_answer' ? (
                    <textarea
                      rows={2}
                      value={quizTextAnswers[qIdx] || ''}
                      onChange={e => setQuizTextAnswers(prev => prev.map((v, i) => (i === qIdx ? e.target.value : v)))}
                      placeholder="Type your short answer..."
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  ) : qType === 'multi_select' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => {
                        const checked = multiSel.includes(oIdx);
                        return (
                          <label
                            key={oIdx}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer ${
                              checked
                                ? 'bg-zinc-100 dark:bg-zinc-800 border-[#27272A] text-[#111111] dark:text-zinc-200 font-medium'
                                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setQuizMultiAnswers(prev => {
                                  const cur = prev[String(qIdx)] || [];
                                  const next = cur.includes(oIdx) ? cur.filter(v => v !== oIdx) : [...cur, oIdx];
                                  return { ...prev, [String(qIdx)]: next };
                                })
                              }
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(qType === 'true_false' ? ['True', 'False'] : q.options).map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer ${
                            quizAnswers[qIdx] === oIdx
                              ? 'bg-zinc-100 dark:bg-zinc-800 border-[#27272A] text-[#111111] dark:text-zinc-200 font-medium'
                              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${qIdx}`}
                            checked={quizAnswers[qIdx] === oIdx}
                            onChange={() => setQuizAnswers(prev => prev.map((a, i) => (i === qIdx ? oIdx : a)))}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleSubmitQuizAttempt} className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">
                Submit Quiz Answers
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Answer Review Modal */}
      <Modal
        open={!!reviewData}
        onClose={() => setReviewData(null)}
        title={`Answer Review — ${reviewData?.quiz.title || ''}`}
        subtitle={
          reviewData
            ? typeof reviewData.attempt.score === 'number'
              ? `Score: ${reviewData.attempt.score} / ${reviewData.attempt.totalMarks ?? reviewData.quiz.totalMarks} (${reviewData.attempt.percentage ?? 0}%)`
              : 'Status: Pending Faculty Verification'
            : ''
        }
        maxWidth="max-w-2xl"
      >
        {reviewData && (
          <div className="space-y-4">
            {reviewData.quiz.questions.map((q, qIdx) => {
              const qType = q.questionType || 'mcq';
              const opts = qType === 'true_false' ? ['True', 'False'] : q.options;
              const chosenSingle = reviewData.attempt.answers?.[qIdx] ?? -1;
              const chosenMulti = reviewData.attempt.multiAnswers?.[String(qIdx)] || [];
              const chosenText = reviewData.attempt.textAnswers?.[qIdx] || '';

              return (
                <div key={qIdx} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <p className="text-sm font-medium">
                    {qIdx + 1}. {q.question} <span className="text-xs font-mono text-zinc-400">({q.marks}m)</span>
                  </p>
                  {qType === 'short_answer' ? (
                    <div className="text-xs space-y-1">
                      <p>Your Answer: <span className="font-medium">{chosenText || '—'}</span></p>
                      <p className="text-[#111111] dark:text-zinc-200">Expected Key: {q.correctTextAnswer || 'Manual grading'}</p>
                    </div>
                  ) : qType === 'multi_select' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {opts.map((opt, oIdx) => {
                        const isChosen = chosenMulti.includes(oIdx);
                        const isCorrect = (q.correctOptionIndices || []).includes(oIdx);
                        return (
                          <div
                            key={oIdx}
                            className={`px-2.5 py-1.5 rounded border ${
                              isCorrect
                                ? 'border-emerald-300 dark:border-emerald-800 bg-zinc-100 dark:bg-zinc-800/40 text-[#111111] dark:text-zinc-200'
                                : isChosen
                                ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                : 'border-zinc-200 dark:border-zinc-700 text-[#52525B]'
                            }`}
                          >
                            {opt} {isChosen ? '(Selected)' : ''} {isCorrect ? '✓' : ''}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {opts.map((opt, oIdx) => {
                        const isChosen = chosenSingle === oIdx;
                        const isCorrect = q.correctOptionIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`px-2.5 py-1.5 rounded border ${
                              isCorrect
                                ? 'border-emerald-300 dark:border-emerald-800 bg-zinc-100 dark:bg-zinc-800/40 text-[#111111] dark:text-zinc-200'
                                : isChosen
                                ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                                : 'border-zinc-200 dark:border-zinc-700 text-[#52525B]'
                            }`}
                          >
                            {opt} {isChosen ? '(Your answer)' : ''} {isCorrect ? '✓' : ''}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Faculty Quiz Attempt Grading Modal */}
      <Modal
        open={!!gradingQuiz}
        onClose={() => setGradingQuiz(null)}
        title={`Grade Quiz Attempts — ${gradingQuiz?.title || ''}`}
        subtitle={gradingQuiz ? `Max Marks: ${gradingQuiz.totalMarks} · Objective questions auto-evaluated for verification` : ''}
        maxWidth="max-w-2xl"
      >
        {gradingQuiz && (() => {
          const attempts = quizAttempts.filter(a => a.quizId === gradingQuiz.id);
          return (
            <div className="space-y-3">
              {attempts.map(att => {
                const { score: autoScore, needsManualGrading } = computeAttemptObjectiveScore(gradingQuiz, att);
                const draftVal = attemptScoreDraft[att.id] ?? att.score ?? autoScore;
                return (
                  <div key={att.id} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{att.studentName}</p>
                      <p className="text-xs text-[#52525B]">
                        Auto-evaluated: <span className="font-mono font-semibold">{autoScore}/{gradingQuiz.totalMarks}</span>
                        {needsManualGrading ? ' · Includes short-answer review' : ''}
                      </p>
                      <div className="mt-1">
                        <StatusText status={att.status === 'graded' || typeof att.score === 'number' ? 'graded' : 'pending'} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={gradingQuiz.totalMarks}
                        value={draftVal}
                        onChange={e => setAttemptScoreDraft(prev => ({ ...prev, [att.id]: Number(e.target.value) }))}
                        className="w-20 px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleGradeQuizAttempt(gradingQuiz, att)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white"
                      >
                        Publish Score
                      </button>
                    </div>
                  </div>
                );
              })}
              {attempts.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-6">No student attempts submitted for this quiz yet.</p>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
