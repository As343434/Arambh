import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Class } from '../types';
import { BookOpen, Users, Plus, GraduationCap, Search, Filter, MoreVertical, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Classes: React.FC = () => {
  const { profile, isAdmin, isTeacher, isStudent } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin: Create Class Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    let classesQuery;
    if (isAdmin) {
      classesQuery = collection(db, 'classes');
    } else if (isTeacher) {
      classesQuery = query(collection(db, 'classes'), where('teacherId', '==', profile.uid));
    } else {
      classesQuery = query(collection(db, 'classes'), where('students', 'array-contains', profile.uid));
    }

    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
      setLoading(false);
    });

    const fetchSubjects = async () => {
      const subjectsSnap = await getDocs(collection(db, 'subjects'));
      setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchSubjects();

    if (isAdmin) {
      const fetchUsers = async () => {
        const teachersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
        const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        setTeachers(teachersSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
        setStudents(studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
      };
      fetchUsers();
    }

    return () => unsubscribeClasses();
  }, [profile]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'classes'), {
        name: className,
        subjectId,
        teacherId,
        mentorId,
        students: selectedStudents,
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setClassName('');
      setSubjectId('');
      setTeacherId('');
      setMentorId('');
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStudent = (uid: string) => {
    setSelectedStudents(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  if (loading) return <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 rounded-3xl" />)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Classes</h2>
          <p className="text-slate-500">View and manage academic classes.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Class
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length > 0 ? classes.map((cls, index) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[48px] -mr-8 -mt-8 transition-all group-hover:bg-indigo-100" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600 mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-1">{cls.name}</h3>
              <p className="text-sm font-medium text-slate-500 mb-2">
                {subjects.find(s => s.id === (cls as any).subjectId)?.name || (cls as any).subject || 'No Subject'}
              </p>
              <p className="text-xs font-bold text-indigo-600 mb-6">
                Mentor: {teachers.find(t => t.uid === (cls as any).mentorId)?.name || 'Not Assigned'}
              </p>
              
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Users className="w-4 h-4" />
                  {cls.students?.length || 0} Students
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
            <GraduationCap className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No classes found.</p>
          </div>
        )}
      </div>

      {/* Admin: Create Class Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Create New Class</h3>
              <form onSubmit={handleCreateClass} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Class Name</label>
                    <input 
                      type="text" required value={className} onChange={(e) => setClassName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Grade 10-A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                    <select 
                      required value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Class Mentor (Primary Teacher)</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={mentorId}
                    onChange={(e) => setMentorId(e.target.value)}
                  >
                    <option value="">Choose a mentor</option>
                    {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name} ({t.employeeId})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Default Subject Teacher</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                  >
                    <option value="">Choose a teacher</option>
                    {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name} ({t.employeeId})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Students ({selectedStudents.length})</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    {students.map(s => (
                      <label key={s.uid} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.includes(s.uid)}
                          onChange={() => toggleStudent(s.uid)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{s.name} ({s.rollNo})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Class'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
