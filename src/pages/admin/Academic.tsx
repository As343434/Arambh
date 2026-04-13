import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Calendar, Plus, Trash2, Clock, MapPin, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';

export const AcademicManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'subjects' | 'timetable'>('subjects');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  
  const [ttClassId, setTtClassId] = useState('');
  const [ttDay, setTtDay] = useState('Monday');
  const [ttStartTime, setTtStartTime] = useState('');
  const [ttEndTime, setTtEndTime] = useState('');
  const [ttSubjectId, setTtSubjectId] = useState('');
  const [ttTeacherId, setTtTeacherId] = useState('');
  const [ttRoom, setTtRoom] = useState('');

  // Bulk Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ success: number, error: number, details: string[] }>({ success: 0, error: 0, details: [] });

  useEffect(() => {
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTimetable = onSnapshot(collection(db, 'timetable'), (snap) => {
      setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const fetchTeachers = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const snap = await getDocs(q);
      setTeachers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    };

    fetchTeachers();
    setLoading(false);
    return () => {
      unsubSubjects();
      unsubTimetable();
      unsubClasses();
    };
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id), {
          name: subjectName,
          code: subjectCode,
          updatedAt: serverTimestamp()
        });
        setEditingSubject(null);
      } else {
        await addDoc(collection(db, 'subjects'), {
          name: subjectName,
          code: subjectCode,
          createdAt: serverTimestamp()
        });
      }
      setSubjectName('');
      setSubjectCode('');
    } catch (err) {
      alert('Error saving subject');
    }
  };

  const startEditing = (sub: any) => {
    setEditingSubject(sub);
    setSubjectName(sub.name);
    setSubjectCode(sub.code);
  };

  const cancelEditing = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectCode('');
  };

  const handleAddTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedSubject = subjects.find(s => s.id === ttSubjectId);
      const selectedTeacher = teachers.find(t => t.uid === ttTeacherId);
      const selectedClass = classes.find(c => c.id === ttClassId);

      await addDoc(collection(db, 'timetable'), {
        classId: ttClassId,
        className: selectedClass?.name || '',
        day: ttDay,
        startTime: ttStartTime,
        endTime: ttEndTime,
        subjectId: ttSubjectId,
        subjectName: selectedSubject?.name || '',
        teacherId: ttTeacherId,
        teacherName: selectedTeacher?.name || '',
        room: ttRoom,
        createdAt: serverTimestamp()
      });
      setTtStartTime('');
      setTtEndTime('');
      setTtRoom('');
      setTtTeacherId('');
    } catch (err) {
      alert('Error adding timetable entry');
    }
  };

  const handleBulkTimetable = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkResults({ success: 0, error: 0, details: [] });

    Papa.parse(bulkFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let success = 0;
        let error = 0;
        const details: string[] = [];

        for (const row of data) {
          try {
            const { className, day, startTime, endTime, subjectName, teacherEmail, room } = row;
            
            // Find Class
            const cls = classes.find(c => c.name.toLowerCase() === className?.toLowerCase());
            if (!cls) throw new Error(`Class ${className} not found`);

            // Find Subject
            let sub = subjects.find(s => s.name.toLowerCase() === subjectName?.toLowerCase());
            if (!sub) {
              // Create subject if not exists? Or throw error?
              // Let's create it for convenience
              const subRef = await addDoc(collection(db, 'subjects'), {
                name: subjectName,
                code: subjectName.substring(0, 3).toUpperCase(),
                createdAt: serverTimestamp()
              });
              sub = { id: subRef.id, name: subjectName };
            }

            // Find Teacher
            const teacher = teachers.find(t => t.email.toLowerCase() === teacherEmail?.toLowerCase());
            if (!teacher) throw new Error(`Teacher with email ${teacherEmail} not found`);

            await addDoc(collection(db, 'timetable'), {
              classId: cls.id,
              className: cls.name,
              day: day || 'Monday',
              startTime,
              endTime,
              subjectId: sub.id,
              subjectName: sub.name,
              teacherId: teacher.uid,
              teacherName: teacher.name,
              room: room || '',
              createdAt: serverTimestamp()
            });

            success++;
          } catch (err: any) {
            error++;
            details.push(err.message);
          }
        }

        setBulkResults({ success, error, details });
        setBulkLoading(false);
        setBulkFile(null);
      }
    });
  };

  const handleDelete = async (coll: string, id: string) => {
    if (window.confirm('Are you sure?')) {
      await deleteDoc(doc(db, coll, id));
    }
  };

  if (!isAdmin) return <div className="p-8 text-center">Unauthorized</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Academic Management</h2>
          <p className="text-slate-500">Manage subjects and class schedules.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('subjects')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'subjects' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Subjects
          </button>
          <button 
            onClick={() => setActiveTab('timetable')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'timetable' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Timetable
          </button>
        </div>
      </div>

      {activeTab === 'subjects' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                {editingSubject ? <BookOpen className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subject Name</label>
                  <input 
                    type="text" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Physics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subject Code</label>
                  <input 
                    type="text" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. PHY-101"
                  />
                </div>
                <div className="flex gap-3">
                  {editingSubject && (
                    <button 
                      type="button" 
                      onClick={cancelEditing}
                      className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all">
                    {editingSubject ? 'Update Subject' : 'Add Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Subject List
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map(sub => (
                  <div key={sub.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-slate-900">{sub.name}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{sub.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => startEditing(sub)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit Subject"
                      >
                        <Plus className="w-5 h-5 rotate-45" />
                      </button>
                      <button 
                        onClick={() => handleDelete('subjects', sub.id)} 
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {subjects.length === 0 && <p className="col-span-full text-center py-8 text-slate-400 italic">No subjects added yet.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Schedule Class
              </h3>
              <form onSubmit={handleAddTimetable} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Class</label>
                  <select required value={ttClassId} onChange={(e) => setTtClassId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Day</label>
                  <select value={ttDay} onChange={(e) => setTtDay(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Start</label>
                    <input type="time" required value={ttStartTime} onChange={(e) => setTtStartTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">End</label>
                    <input type="time" required value={ttEndTime} onChange={(e) => setTtEndTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                  <select required value={ttSubjectId} onChange={(e) => setTtSubjectId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Teacher</label>
                  <select required value={ttTeacherId} onChange={(e) => setTtTeacherId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select Teacher</option>
                    {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Room / Lab</label>
                  <input type="text" value={ttRoom} onChange={(e) => setTtRoom(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Room 302" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all">
                  Add to Schedule
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  Bulk Timetable Upload
                </h3>
                <input 
                  type="file" accept=".csv" className="hidden" ref={fileInputRef}
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Select CSV
                </button>
              </div>

              {bulkFile && (
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">{bulkFile.name}</span>
                  <button 
                    onClick={handleBulkTimetable}
                    disabled={bulkLoading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    {bulkLoading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              )}

              {bulkResults.details.length > 0 && (
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-600">Results: {bulkResults.success} Success, {bulkResults.error} Errors</p>
                  <div className="max-h-24 overflow-y-auto text-[10px] text-slate-400">
                    {bulkResults.details.map((d, i) => <p key={i}>• {d}</p>)}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 italic">
                CSV format: className, day, startTime, endTime, subjectName, teacherEmail, room
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Weekly Schedule
              </h3>
              <div className="space-y-6">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                  const dayEntries = timetable.filter(t => t.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  if (dayEntries.length === 0) return null;
                  return (
                    <div key={day} className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{day}</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {dayEntries.map(entry => {
                          const cls = classes.find(c => c.id === entry.classId);
                          const sub = subjects.find(s => s.id === entry.subjectId);
                          const teacher = teachers.find(t => t.uid === entry.teacherId);
                          return (
                            <div key={entry.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{entry.startTime} - {entry.endTime}</p>
                                  <p className="text-sm text-slate-600">{sub?.name || 'Unknown'} • {cls?.name || 'Unknown'}</p>
                                  <p className="text-[10px] text-slate-400">Teacher: {teacher?.name || 'Not Assigned'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {entry.room && (
                                  <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                    <MapPin className="w-3 h-3" />
                                    {entry.room}
                                  </div>
                                )}
                                <button onClick={() => handleDelete('timetable', entry.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {timetable.length === 0 && <p className="text-center py-8 text-slate-400 italic">No schedule entries yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
