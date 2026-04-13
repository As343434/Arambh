import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, ClipboardCheck, FileText, Bell, Calendar, Download, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [studentClass, setStudentClass] = useState<any | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attStats, setAttStats] = useState({ total: 0, present: 0, percentage: 0 });

  useEffect(() => {
    if (!profile?.uid) return;

    let unsubscribeNotices: () => void;
    let unsubscribeAssignments: () => void;
    let unsubscribeAttendance: () => void;
    let unsubscribeTT: () => void;

    const setupListeners = async () => {
      // 1. Fetch Subjects for mapping
      const subSnap = await getDocs(collection(db, 'subjects'));
      const subData = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setSubjects(subData);

      // 2. Find student's class
      const classesRef = collection(db, 'classes');
      const q = query(classesRef, where('students', 'array-contains', profile.uid));
      const classSnap = await getDocs(q);
      const myClass = classSnap.docs.length > 0 ? { id: classSnap.docs[0].id, ...classSnap.docs[0].data() } : null;
      setStudentClass(myClass);

      // 3. Listen to notices
      const noticesQuery = query(
        collection(db, 'notices'), 
        where('targetRole', 'in', ['student', 'all']),
        limit(50)
      );
      
      unsubscribeNotices = onSnapshot(noticesQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setNotices(data.slice(0, 5));
      });

      // 3. Listen to assignments
      let assignmentsQuery;
      if (myClass) {
        assignmentsQuery = query(
          collection(db, 'assignments'),
          where('classId', '==', myClass.id),
          limit(50)
        );
      } else {
        assignmentsQuery = query(
          collection(db, 'assignments'),
          limit(50)
        );
      }

      unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setAssignments(data.slice(0, 5));
      });

      // 4. Listen to attendance
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', profile.uid)
      );

      unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
        const myAttendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        myAttendance.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        
        const presentCount = myAttendance.filter((a: any) => a.status === 'present').length;
        
        setAttendance(myAttendance.slice(0, 5));
        setAttStats({
          total: myAttendance.length,
          present: presentCount,
          percentage: myAttendance.length > 0 ? Math.round((presentCount / myAttendance.length) * 100) : 0
        });
        setLoading(false);
      });

      // 6. Today's Schedule
      if (myClass) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDay = days[new Date().getDay()];
        const ttQuery = query(
          collection(db, 'timetable'), 
          where('classId', '==', myClass.id),
          where('day', '==', todayDay)
        );
        unsubscribeTT = onSnapshot(ttQuery, (snap) => {
          const schedule = snap.docs.map(d => {
            const data = d.data();
            // Map subject name if missing
            if (!data.subjectName && data.subjectId) {
              const sub = subData.find(s => s.id === data.subjectId);
              data.subjectName = sub?.name || 'Subject';
            }
            return { id: d.id, ...data };
          });
          setTodaySchedule(schedule.sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || '')));
        });
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeNotices) unsubscribeNotices();
      if (unsubscribeAssignments) unsubscribeAssignments();
      if (unsubscribeAttendance) unsubscribeAttendance();
      if (unsubscribeTT) unsubscribeTT();
    };
  }, [profile]);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-32 bg-slate-200 rounded-3xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2].map(i => <div key={i} className="h-64 bg-slate-200 rounded-3xl" />)}
    </div>
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Arambh Student Portal</h2>
          <p className="text-slate-500">Welcome back, {profile?.name}</p>
        </div>
        <div className="flex gap-4">
          {studentClass && (
            <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm font-bold text-indigo-600 shadow-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Class: {studentClass.name}
            </div>
          )}
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 shadow-sm">
            Roll No: {profile?.rollNo || 'N/A'}
          </div>
          <div className={`px-4 py-2 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2 ${attStats.percentage >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
            <TrendingUp className="w-4 h-4" />
            Attendance: {attStats.percentage}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Latest Notices
              </h3>
              <Link to="/notices" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
            </div>
            <div className="space-y-4">
              {notices.length > 0 ? notices.map((notice) => (
                <div key={notice.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900">{notice.title}</h4>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      {notice.authorName}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{notice.content}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {notice.createdAt?.toDate().toLocaleDateString()}
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-center py-8">No new notices.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Assignments
              </h3>
              <Link to="/assignments" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</Link>
            </div>
            <div className="space-y-4">
              {assignments.length > 0 ? assignments.map((assign) => (
                <div key={assign.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{assign.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{assign.className} • Due: {assign.dueDate}</p>
                  </div>
                  <button className="p-3 bg-white text-indigo-600 rounded-xl border border-slate-200 hover:bg-indigo-50 transition-all shadow-sm">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              )) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No assignments found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Today's Schedule
              </h3>
              <Link to="/timetable" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Full View</Link>
            </div>
            <div className="space-y-3">
              {todaySchedule.length > 0 ? todaySchedule.map((slot) => (
                <div key={slot.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{slot.startTime} - {slot.endTime}</p>
                      <p className="font-bold text-slate-900 mt-1">{slot.subjectName || 'Subject'}</p>
                    </div>
                    {slot.room && (
                      <span className="text-[10px] bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-400 font-bold uppercase">
                        {slot.room}
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 text-center py-8">No classes today.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                Recent Attendance
              </h3>
              <Link to="/attendance" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">History</Link>
            </div>
            <div className="space-y-3">
              {attendance.length > 0 ? attendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">{record.date}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                    record.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {record.status}
                  </span>
                </div>
              )) : (
                <p className="text-slate-500 text-center py-8">No attendance records yet.</p>
              )}
            </div>
            {attStats.total > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Attendance Summary</span>
                  <span>{attStats.present} / {attStats.total} Days</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${attStats.percentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${attStats.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

