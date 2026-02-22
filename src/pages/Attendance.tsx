import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Class, Attendance as AttendanceType } from '../types';
import { ClipboardCheck, Calendar, Users, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export const Attendance: React.FC = () => {
  const { profile, isTeacher, isStudent } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Teacher View State
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [records, setRecords] = useState<{[key: string]: 'present' | 'absent'}>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!profile?.uid) return;

    let classesQuery;
    if (isTeacher) {
      classesQuery = query(collection(db, 'classes'), where('teacherId', '==', profile.uid));
    } else {
      classesQuery = query(collection(db, 'classes'), where('students', 'array-contains', profile.uid));
    }

    const unsubscribeClasses = onSnapshot(classesQuery, async (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
      setClasses(classesData);
      
      if (isTeacher && classesData.length > 0) {
        // Fetch students for teacher's classes
        const allStudentIds = Array.from(new Set(classesData.flatMap(c => c.students || []))).filter(id => !!id);
        if (allStudentIds.length > 0) {
          const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', allStudentIds)));
          setStudents(studentsSnap.docs.map(d => d.data()));
        }
      }
    });

    let attendanceQuery;
    if (isStudent) {
      attendanceQuery = query(
        collection(db, 'attendance'), 
        where('studentId', '==', profile.uid),
        orderBy('date', 'desc')
      );
    } else {
      attendanceQuery = query(collection(db, 'attendance'), orderBy('date', 'desc'));
    }

    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendance(data);
      setLoading(false);
    });

    return () => {
      unsubscribeClasses();
      unsubscribeAttendance();
    };
  }, [profile]);

  const handleMarkAttendance = async () => {
    if (!selectedClass || !profile) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const batch = writeBatch(db);
      
      Object.entries(records).forEach(([studentId, status]) => {
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
      setMessage({ type: 'success', text: 'Attendance marked successfully!' });
      setRecords({});
      setSelectedClass(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setMessage({ type: 'error', text: 'Failed to mark attendance.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-40 bg-slate-200 rounded-3xl" />
    <div className="h-64 bg-slate-200 rounded-3xl" />
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance Management</h2>
          <p className="text-slate-500">{isTeacher ? 'Mark and track student attendance.' : 'View your attendance history.'}</p>
        </div>
      </div>

      {isTeacher && (
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-indigo-600" />
              Mark Attendance
            </h3>
            <select 
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
              value={selectedClass?.id || ''}
              onChange={(e) => setSelectedClass(classes.find(c => c.id === e.target.value) || null)}
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {selectedClass ? (
            <div className="space-y-6">
              {message.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  {message.text}
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
                              onClick={() => setRecords(prev => ({ ...prev, [student.uid]: 'present' }))}
                              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${records[student.uid] === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                              Present
                            </button>
                            <button 
                              onClick={() => setRecords(prev => ({ ...prev, [student.uid]: 'absent' }))}
                              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${records[student.uid] === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
                  disabled={submitting || Object.keys(records).length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Saving...' : 'Submit Attendance'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
              <ClipboardCheck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Please select a class to mark attendance.</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600" />
          Attendance History
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attendance.length > 0 ? attendance.map((record) => (
            <motion.div 
              key={record.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-slate-50 rounded-2xl border border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-slate-900">{record.className}</p>
                  <p className="text-xs text-slate-500">{record.date}</p>
                </div>
                {isStudent && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {record.status}
                  </span>
                )}
              </div>
              {!isStudent && (
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-slate-600">Status: {record.status}</span>
                  <span className="text-slate-400">Student ID: {record.studentId}</span>
                </div>
              )}
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-400 italic">No attendance records found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
