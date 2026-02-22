import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Class } from '../../types';
import { BookOpen, Users, ClipboardCheck, FileText, Bell, Plus, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TeacherDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classes' | 'attendance' | 'assignments'>('classes');
  
  // Attendance State
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<{[key: string]: 'present' | 'absent'}>({});
  const [attLoading, setAttLoading] = useState(false);
  const [attMessage, setAttMessage] = useState({ type: '', text: '' });

  // Assignment State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;

    const classesQuery = query(collection(db, 'classes'), where('teacherId', '==', profile.uid));
    
    const unsubscribe = onSnapshot(classesQuery, 
      async (snapshot) => {
        const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
        setClasses(classesData);

        // Fetch all students in teacher's classes
        const allStudentIds = Array.from(new Set(classesData.flatMap(c => c.students || [])));
        if (allStudentIds.length > 0) {
          try {
            const studentDocs = await Promise.all(allStudentIds.map(id => getDoc(doc(db, 'users', id))));
            setStudents(studentDocs.filter(d => d.exists()).map(d => ({ uid: d.id, ...d.data() })));
          } catch (err) {
            console.error('Error fetching students:', err);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to classes:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  const handleMarkAttendance = async () => {
    if (!selectedClass || !profile) return;
    setAttLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const batch = writeBatch(db);
      
      Object.entries(attendanceRecords).forEach(([studentId, status]) => {
        const attendanceRef = doc(collection(db, 'attendance'));
        batch.set(attendanceRef, {
          classId: selectedClass.id,
          className: selectedClass.name,
          date: today,
          teacherId: profile.uid,
          studentId,
          status,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      setAttMessage({ type: 'success', text: 'Attendance marked successfully!' });
      setTimeout(() => setAttMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setAttMessage({ type: 'error', text: 'Failed to mark attendance.' });
    } finally {
      setAttLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      await addDoc(collection(db, 'assignments'), {
        classId: selectedClass.id,
        className: selectedClass.name,
        teacherId: profile?.uid,
        title: assignTitle,
        description: assignDesc,
        dueDate: assignDueDate,
        createdAt: serverTimestamp()
      });
      setShowAssignModal(false);
      setAssignTitle('');
      setAssignDesc('');
      setAssignDueDate('');
      alert('Assignment created successfully!');
    } catch (error) {
      alert('Failed to create assignment.');
    }
  };

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-40 bg-slate-200 rounded-3xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2].map(i => <div key={i} className="h-64 bg-slate-200 rounded-3xl" />)}
    </div>
  </div>;

  return (
    <div className="space-y-8">
      <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-lg shadow-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold">Hello, {profile?.name}!</h2>
          <p className="text-indigo-100 mt-2">Arambh Teacher Portal • {classes.length} Active Classes</p>
        </div>
        <div className="flex bg-white/10 p-1 rounded-2xl backdrop-blur-sm border border-white/20">
          <button onClick={() => setActiveTab('classes')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'classes' ? 'bg-white text-indigo-600' : 'text-white hover:bg-white/10'}`}>Classes</button>
          <button onClick={() => setActiveTab('attendance')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-white text-indigo-600' : 'text-white hover:bg-white/10'}`}>Attendance</button>
          <button onClick={() => setActiveTab('assignments')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'assignments' ? 'bg-white text-indigo-600' : 'text-white hover:bg-white/10'}`}>Assignments</button>
        </div>
      </div>

      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                My Assigned Classes
              </h3>
              <Link to="/classes" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
            </div>
            <div className="space-y-4">
              {classes.length > 0 ? classes.map((cls) => (
                <div key={cls.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{cls.name}</h4>
                    <p className="text-sm text-slate-500">{cls.subject}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <Users className="w-3 h-3" />
                      {cls.students?.length || 0} Students
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setSelectedClass(cls); setActiveTab('attendance'); }}
                      className="p-2 bg-white text-indigo-600 rounded-xl border border-slate-200 hover:bg-indigo-50 transition-colors"
                    >
                      <ClipboardCheck className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-center py-8">No classes assigned yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4">
              <Link to="/notices" className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-2xl transition-all group">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Post Class Notice</p>
                  <p className="text-xs text-slate-500">Share updates with your students</p>
                </div>
              </Link>
              <Link to="/assignments" className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-2xl transition-all group">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Create Assignment</p>
                  <p className="text-xs text-slate-500">Set new tasks and deadlines</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Mark Daily Attendance</h3>
            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
              value={selectedClass?.id || ''}
              onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value))}
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedClass ? (
            <div className="space-y-6">
              {attMessage.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm ${attMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {attMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  {attMessage.text}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-100">
                      <th className="pb-4 font-bold text-slate-500 text-sm">Roll No</th>
                      <th className="pb-4 font-bold text-slate-500 text-sm">Student Name</th>
                      <th className="pb-4 font-bold text-slate-500 text-sm text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.filter(s => selectedClass.students?.includes(s.uid)).map(student => (
                      <tr key={student.uid}>
                        <td className="py-4 text-sm text-slate-600">{student.rollNo}</td>
                        <td className="py-4 font-medium text-slate-900">{student.name}</td>
                        <td className="py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.uid]: 'present' }))}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${attendanceRecords[student.uid] === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                              Present
                            </button>
                            <button 
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.uid]: 'absent' }))}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${attendanceRecords[student.uid] === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-6 border-t border-slate-100">
                <button 
                  onClick={handleMarkAttendance}
                  disabled={attLoading || Object.keys(attendanceRecords).length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg disabled:opacity-50"
                >
                  {attLoading ? 'Saving...' : 'Submit Attendance'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Please select a class to mark attendance.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && (
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
                    value={selectedClass?.id || ''}
                    onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value))}
                  >
                    <option value="">Choose a class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                  <input 
                    type="text" required value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Algebra Homework"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                  <textarea 
                    required rows={3} value={assignDesc} onChange={(e) => setAssignDesc(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Instructions for students..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
                  <input 
                    type="date" required value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

