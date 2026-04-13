import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

export const Timetable: React.FC = () => {
  const { profile, isStudent, isTeacher } = useAuth();
  const [timetable, setTimetable] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchData = async () => {
      // Fetch subjects, classes, and teachers for mapping
      const [subSnap, clsSnap, teaSnap] = await Promise.all([
        getDocs(collection(db, 'subjects')),
        getDocs(collection(db, 'classes')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')))
      ]);

      setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClasses(clsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTeachers(teaSnap.docs.map(d => ({ uid: d.id, ...d.data() })));

      let ttQuery;
      if (isStudent) {
        // Find student's class
        const studentClass = clsSnap.docs.find(d => d.data().students?.includes(profile.uid));
        if (studentClass) {
          ttQuery = query(collection(db, 'timetable'), where('classId', '==', studentClass.id));
        }
      } else if (isTeacher) {
        ttQuery = query(collection(db, 'timetable'), where('teacherId', '==', profile.uid));
      }

      if (ttQuery) {
        const unsub = onSnapshot(ttQuery, (snap) => {
          setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        return unsub;
      } else {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, isStudent, isTeacher]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-64 bg-slate-200 rounded-3xl" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Weekly Timetable</h2>
          <p className="text-slate-500">Your scheduled classes and sessions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {days.map(day => {
          const dayEntries = timetable
            .filter(t => t.day === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <motion.div 
              key={day}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4"
            >
              <h3 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {day}
              </h3>
              
              <div className="space-y-3">
                {dayEntries.length > 0 ? dayEntries.map(entry => {
                  const sub = subjects.find(s => s.id === entry.subjectId);
                  const cls = classes.find(c => c.id === entry.classId);
                  const teacher = teachers.find(t => t.uid === entry.teacherId);

                  return (
                    <div key={entry.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                          <Clock className="w-4 h-4" />
                          {entry.startTime} - {entry.endTime}
                        </div>
                        {entry.room && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <MapPin className="w-3 h-3" />
                            {entry.room}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <p className="font-bold text-slate-900">{sub?.name || 'Unknown Subject'}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <BookOpen className="w-3 h-3" />
                            {cls?.name || 'Unknown Class'}
                          </div>
                          {isStudent && teacher && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <User className="w-3 h-3" />
                              {teacher.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center py-4 text-slate-400 text-sm italic">No classes scheduled</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
