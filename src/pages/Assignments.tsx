import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Class, Assignment, Submission } from '../types';
import { FileText, Plus, Calendar, Download, Upload, CheckCircle2, AlertCircle, BookOpen, User, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Assignments: React.FC = () => {
  const { profile, isTeacher, isStudent } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Teacher Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Student Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');

  // Teacher View Submissions
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [currentAssignmentSubmissions, setCurrentAssignmentSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;

    let classesQuery;
    if (isTeacher) {
      classesQuery = query(collection(db, 'classes'), where('teacherId', '==', profile.uid));
    } else {
      classesQuery = query(collection(db, 'classes'), where('students', 'array-contains', profile.uid));
    }

    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
    });

    const assignmentsQuery = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      if (isTeacher) {
        setAssignments(data.filter(a => a.teacherId === profile.uid));
      } else {
        // In a real app, we'd filter by student's classes
        setAssignments(data);
      }
      setLoading(false);
    });

    if (isStudent) {
      const submissionsQuery = query(collection(db, 'submissions'), where('studentId', '==', profile.uid));
      const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
        setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));
      });
      return () => {
        unsubscribeClasses();
        unsubscribeAssignments();
        unsubscribeSubmissions();
      };
    }

    return () => {
      unsubscribeClasses();
      unsubscribeAssignments();
    };
  }, [profile]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedClassId) return;
    setSubmitting(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      await addDoc(collection(db, 'assignments'), {
        classId: selectedClassId,
        className: selectedClass?.name || 'Unknown Class',
        title,
        description,
        dueDate,
        teacherId: profile.uid,
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedClassId('');
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedAssignment) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'submissions'), {
        assignmentId: selectedAssignment.id,
        assignmentTitle: selectedAssignment.title,
        studentId: profile.uid,
        studentName: profile.name,
        content: submissionContent,
        submittedAt: serverTimestamp(),
        status: 'submitted'
      });
      setShowSubmitModal(false);
      setSubmissionContent('');
      setSelectedAssignment(null);
      alert('Assignment submitted successfully!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const viewSubmissions = async (assignmentId: string) => {
    const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
    const snap = await getDocs(q);
    setCurrentAssignmentSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));
    setShowSubmissionsModal(true);
  };

  if (loading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-3xl" />)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assignments</h2>
          <p className="text-slate-500">{isTeacher ? 'Create and grade assignments.' : 'View and submit your assignments.'}</p>
        </div>
        {isTeacher && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Assignment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {assignments.length > 0 ? assignments.map((assign, index) => {
          const studentSubmission = submissions.find(s => s.assignmentId === assign.id);
          return (
            <motion.div
              key={assign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-lg">
                      {(assign as any).className}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <Clock className="w-3 h-3" />
                      Due: {assign.dueDate}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">{assign.title}</h3>
                  <p className="text-slate-600 text-sm line-clamp-2">{assign.description}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {isTeacher ? (
                    <button 
                      onClick={() => viewSubmissions(assign.id)}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl font-bold transition-all border border-slate-100"
                    >
                      <Users className="w-5 h-5" />
                      View Submissions
                    </button>
                  ) : (
                    studentSubmission ? (
                      <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-bold border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" />
                        Submitted
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setSelectedAssignment(assign); setShowSubmitModal(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all"
                      >
                        <Upload className="w-5 h-5" />
                        Submit
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          );
        }) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No assignments found.</p>
          </div>
        )}
      </div>

      {/* Teacher: Create Assignment Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-lg"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Create New Assignment</h3>
              <form onSubmit={handleCreateAssignment} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Class</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="">Choose a class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                  <input 
                    type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Algebra Homework"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                  <textarea 
                    required rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Instructions for students..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
                  <input 
                    type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student: Submit Assignment Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-lg"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Submit Assignment</h3>
              <p className="text-slate-500 mb-6">{selectedAssignment?.title}</p>
              <form onSubmit={handleSubmitAssignment} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Your Submission</label>
                  <textarea 
                    required rows={6} value={submissionContent} onChange={(e) => setSubmissionContent(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Paste your link or type your response here..."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Now'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher: View Submissions Modal */}
      <AnimatePresence>
        {showSubmissionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Student Submissions</h3>
                <button onClick={() => setShowSubmissionsModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="space-y-4">
                {currentAssignmentSubmissions.length > 0 ? currentAssignmentSubmissions.map((sub) => (
                  <div key={sub.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                          {sub.studentName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{sub.studentName}</p>
                          <p className="text-[10px] text-slate-400">Submitted: {sub.submittedAt?.toDate().toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 text-sm text-slate-600 whitespace-pre-wrap">
                      {sub.content}
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-12 text-slate-500 italic">No submissions yet.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
