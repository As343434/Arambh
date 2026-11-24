import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc, updateDoc, arrayUnion, onSnapshot, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, initializeAuth, browserLocalPersistence, getAuth, inMemoryPersistence } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { db, auth } from '../../firebase';
import { Users, BookOpen, Bell, Calendar, UserPlus, GraduationCap, CheckCircle2, AlertCircle, Upload, FileSpreadsheet, Loader2, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import Papa from 'papaparse';

// Helper to create users without signing out the admin
// In a real app, use Cloud Functions. For this prototype, we use a secondary app instance.
const getSecondaryAuth = () => {
  const secondaryAppName = 'secondary-auth-app';
  let secondaryApp;
  try {
    secondaryApp = getApp(secondaryAppName);
  } catch (e) {
    const mainApp = getApp();
    secondaryApp = initializeApp(mainApp.options, secondaryAppName);
  }
  
  // Use inMemoryPersistence to ensure the secondary auth session 
  // doesn't persist or interfere with the main app session
  try {
    return initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
  } catch (e) {
    return getAuth(secondaryApp);
  }
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'register' | 'bulk' | 'subjects'>('overview');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  
  // Registration Form State
  const [regType, setRegType] = useState<'teacher' | 'student'>('student');
  const [name, setName] = useState('');
  const [idValue, setIdValue] = useState(''); // Roll No or Employee ID
  const [selectedClassId, setSelectedClassId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('arambh123'); // Default password
  const [regLoading, setRegLoading] = useState(false);
  const [regMessage, setRegMessage] = useState({ type: '', text: '' });

  // Bulk Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<{ success: number, error: number, details: string[] }>({ success: 0, error: 0, details: [] });

  useEffect(() => {
    fetchStats();
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => {
      unsubSubjects();
      unsubClasses();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const classesQuery = collection(db, 'classes');

      const [teachersSnap, studentsSnap, classesSnap] = await Promise.all([
        getDocs(teachersQuery),
        getDocs(studentsQuery),
        getDocs(classesQuery)
      ]);

      setStats({
        teachers: teachersSnap.size,
        students: studentsSnap.size,
        classes: classesSnap.size
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Handle offline or error state
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegMessage({ type: '', text: '' });

    try {
      const finalEmail = email || (regType === 'student' ? `roll${idValue}@arambh.com` : `emp${idValue}@arambh.com`);
      
      // Use secondary auth to avoid signing out the admin
      const secondaryAuth = getSecondaryAuth();
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, password);
      const user = userCredential.user;
      
      console.log('User created in Auth with UID:', user.uid);

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email: finalEmail,
        role: regType,
        [regType === 'student' ? 'rollNo' : 'employeeId']: idValue,
        isFirstLogin: true,
        createdAt: serverTimestamp()
      });

      // Assign to class if student and class selected
      if (regType === 'student' && selectedClassId) {
        await updateDoc(doc(db, 'classes', selectedClassId), {
          students: arrayUnion(user.uid)
        });
      }

      // Sign out from secondary auth immediately
      await secondaryAuth.signOut();

      const typeLabel = regType ? regType.charAt(0).toUpperCase() + regType.slice(1) : 'User';
      setRegMessage({ 
        type: 'success', 
        text: `${typeLabel} registered successfully! Login Email: ${finalEmail}` 
      });
      setName('');
      setIdValue('');
      setEmail('');
      setSelectedClassId('');
      fetchStats();
    } catch (error: any) {
      setRegMessage({ type: 'error', text: error.message || 'Failed to register user.' });
    } finally {
      setRegLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkResults({ success: 0, error: 0, details: [] });
    
    Papa.parse(bulkFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        setBulkProgress({ current: 0, total: data.length });
        
        const secondaryAuth = getSecondaryAuth();
        let successCount = 0;
        let errorCount = 0;
        const details: string[] = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          setBulkProgress(prev => ({ ...prev, current: i + 1 }));
          
          try {
            const { name, id, email, role, className } = row;
            if (!name || !id || !role) throw new Error(`Missing required fields for row ${i + 1}`);
            
            const finalEmail = email || (role === 'student' ? `roll${id}@arambh.com` : `emp${id}@arambh.com`);
            const finalPassword = 'arambh123';

            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, finalPassword);
            const user = userCredential.user;

            // 2. Create Profile
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              name,
              email: finalEmail,
              role,
              [role === 'student' ? 'rollNo' : 'employeeId']: id,
              isFirstLogin: true,
              createdAt: serverTimestamp()
            });

            // 3. Assign to Class if mentioned
            if (className && role === 'student') {
              const classesRef = collection(db, 'classes');
              const q = query(classesRef, where('name', '==', className));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const classDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, 'classes', classDoc.id), {
                  students: arrayUnion(user.uid)
                });
                details.push(`Added ${name} to class ${className}`);
              } else {
                details.push(`Class ${className} not found for ${name}`);
              }
            }

            successCount++;
          } catch (err: any) {
            errorCount++;
            details.push(`Error row ${i + 1}: ${err.message}`);
          }
        }

        await secondaryAuth.signOut();
        setBulkResults({ success: successCount, error: errorCount, details });
        setBulkLoading(false);
        setBulkFile(null);
        fetchStats();
      }
    });
  };

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

  const handleDeleteSubject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      await deleteDoc(doc(db, 'subjects', id));
    }
  };

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-3xl" />)}
    </div>
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111111]">Arambh Admin Panel</h2>
          <p className="text-[#52525B]">Manage your institution's digital infrastructure.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white shadow-md shadow-black/10' : 'text-[#52525B] hover:bg-zinc-50'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'register' ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white shadow-md shadow-black/10' : 'text-[#52525B] hover:bg-zinc-50'}`}
          >
            Registration
          </button>
          <button 
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'bulk' ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white shadow-md shadow-black/10' : 'text-[#52525B] hover:bg-zinc-50'}`}
          >
            Bulk Upload
          </button>
          <button 
            onClick={() => setActiveTab('subjects')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'subjects' ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white shadow-md shadow-black/10' : 'text-[#52525B] hover:bg-zinc-50'}`}
          >
            Subjects
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Teachers', value: stats.teachers, icon: GraduationCap, color: 'bg-[#27272A]' },
              { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-zinc-1000' },
              { label: 'Active Classes', value: stats.classes, icon: BookOpen, color: 'bg-[#27272A]' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6"
              >
                <div className={`${stat.color} p-4 rounded-2xl text-white`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#52525B]">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#111111]">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#111111] mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button onClick={() => { setActiveTab('register'); setRegType('student'); }} className="p-6 bg-zinc-100 text-[#111111] rounded-2xl font-bold hover:bg-zinc-200 transition-all flex flex-col items-center gap-2">
                <UserPlus className="w-6 h-6" />
                Add Student
              </button>
              <button onClick={() => { setActiveTab('register'); setRegType('teacher'); }} className="p-6 bg-zinc-100 text-[#111111] rounded-2xl font-bold hover:bg-zinc-200 transition-all flex flex-col items-center gap-2">
                <GraduationCap className="w-6 h-6" />
                Add Teacher
              </button>
              <button onClick={() => { setActiveTab('bulk'); }} className="p-6 bg-zinc-100 text-[#111111] rounded-2xl font-bold hover:bg-zinc-200 transition-all flex flex-col items-center gap-2">
                <Upload className="w-6 h-6" />
                Bulk Upload
              </button>
              <button onClick={() => { setActiveTab('subjects'); }} className="p-6 bg-zinc-100 text-[#111111] rounded-2xl font-bold hover:bg-zinc-200 transition-all flex flex-col items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Manage Subjects
              </button>
              <button onClick={() => { window.location.href = '/classes'; }} className="p-6 bg-zinc-100 text-[#27272A] rounded-2xl font-bold hover:bg-amber-100 transition-all flex flex-col items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Manage Classes
              </button>
            </div>
          </div>
        </>
      ) : activeTab === 'bulk' ? (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-zinc-100 text-[#111111] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#111111]">Bulk User Upload</h3>
            <p className="text-[#52525B] text-sm mt-2">Upload a CSV file to register multiple students or teachers at once.</p>
          </div>

          <div className="p-6 border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50 text-center">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
            />
            {!bulkFile ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 mx-auto"
              >
                <Upload className="w-8 h-8 text-zinc-400" />
                <span className="text-sm font-bold text-[#52525B]">Click to select CSV file</span>
                <span className="text-xs text-zinc-400 italic">Expected columns: name, id, email, role, className</span>
              </button>
            ) : (
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                  <span className="text-sm font-medium text-[#3F3F46]">{bulkFile.name}</span>
                </div>
                <button onClick={() => setBulkFile(null)} className="text-zinc-400 hover:text-red-500">
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {bulkLoading && (
            <div className="mt-8 space-y-4">
              <div className="flex justify-between text-sm font-bold text-[#52525B]">
                <span>Processing Users...</span>
                <span>{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#111111] dark:bg-white dark:text-zinc-950 transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-center text-xs text-zinc-400 animate-pulse flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Creating accounts and assigning classes...
              </p>
            </div>
          )}

          {bulkResults.details.length > 0 && !bulkLoading && (
            <div className="mt-8 p-6 bg-zinc-50 rounded-3xl border border-zinc-200">
              <h4 className="font-bold text-[#111111] mb-4">Upload Results</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-100 p-4 rounded-2xl text-center border border-emerald-100">
                  <p className="text-2xl font-bold text-[#111111]">{bulkResults.success}</p>
                  <p className="text-xs font-medium text-[#111111]">Successful</p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl text-center border border-red-100">
                  <p className="text-2xl font-bold text-red-700">{bulkResults.error}</p>
                  <p className="text-xs font-medium text-red-600">Errors</p>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {bulkResults.details.map((detail, idx) => (
                  <p key={idx} className={`text-xs ${detail.startsWith('Error') ? 'text-red-500' : 'text-[#52525B]'}`}>
                    • {detail}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={handleBulkUpload}
            disabled={!bulkFile || bulkLoading}
            className="w-full mt-8 bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white font-bold py-4 rounded-2xl shadow-lg shadow-black/15 transition-all disabled:opacity-50"
          >
            {bulkLoading ? 'Processing...' : 'Start Bulk Registration'}
          </button>
        </motion.div>
      ) : activeTab === 'subjects' ? (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-[#111111] mb-6 flex items-center gap-2">
                {editingSubject ? <BookOpen className="w-5 h-5 text-[#111111]" /> : <Plus className="w-5 h-5 text-[#111111]" />}
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#3F3F46] mb-2">Subject Name</label>
                  <input 
                    type="text" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="e.g. Physics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#3F3F46] mb-2">Subject Code</label>
                  <input 
                    type="text" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    placeholder="e.g. PHY-101"
                  />
                </div>
                <div className="flex gap-3">
                  {editingSubject && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingSubject(null); setSubjectName(''); setSubjectCode(''); }}
                      className="flex-1 bg-zinc-100 text-[#52525B] font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="flex-[2] bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-bold py-4 rounded-2xl hover:bg-[#27272A] dark:hover:bg-zinc-200 transition-all">
                    {editingSubject ? 'Update Subject' : 'Add Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-[#111111] mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#111111]" />
                Subject List
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map(sub => (
                  <div key={sub.id} className="p-6 bg-zinc-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-[#111111]">{sub.name}</p>
                      <p className="text-xs text-[#52525B] uppercase tracking-wider">{sub.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingSubject(sub); setSubjectName(sub.name); setSubjectCode(sub.code); }} 
                        className="p-2 text-zinc-400 hover:text-[#111111] transition-colors"
                      >
                        <Plus className="w-5 h-5 rotate-45" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSubject(sub.id)} 
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {subjects.length === 0 && <p className="col-span-full text-center py-8 text-zinc-400 italic">No subjects added yet.</p>}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-8 p-1 bg-zinc-50 rounded-2xl border border-zinc-200">
            <button 
              onClick={() => setRegType('student')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${regType === 'student' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#52525B]'}`}
            >
              Student
            </button>
            <button 
              onClick={() => setRegType('teacher')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${regType === 'teacher' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#52525B]'}`}
            >
              Teacher
            </button>
          </div>

          {regMessage.text && (
            <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm ${regMessage.type === 'success' ? 'bg-zinc-100 text-[#111111] border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {regMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <p>{regMessage.text}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#3F3F46] mb-2">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#3F3F46] mb-2">{regType === 'student' ? 'Roll Number' : 'Employee ID'}</label>
                <input 
                  type="text" 
                  required 
                  value={idValue}
                  onChange={(e) => setIdValue(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  placeholder={regType === 'student' ? "101" : "T-501"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#3F3F46] mb-2">Email (Optional)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                placeholder={regType === 'student' ? `roll${idValue || '101'}@arambh.com` : `emp${idValue || '501'}@arambh.com`}
              />
              <p className="text-[10px] text-zinc-400 mt-1 italic">If left blank, a default email will be generated using the ID.</p>
            </div>

            {regType === 'student' && (
              <div>
                <label className="block text-sm font-bold text-[#3F3F46] mb-2">Assign Class (Optional)</label>
                <select 
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">No Class Assigned</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="p-4 bg-zinc-100 rounded-2xl border border-amber-100">
              <p className="text-xs text-[#27272A] font-medium">
                <strong>Note:</strong> The default password will be <code className="bg-amber-100 px-1 rounded">arambh123</code>. 
                The user will be forced to change it on their first login.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={regLoading}
              className="w-full bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white font-bold py-4 rounded-2xl shadow-lg shadow-black/15 transition-all disabled:opacity-50"
            >
              {regLoading ? 'Registering...' : `Register ${regType ? regType.charAt(0).toUpperCase() + regType.slice(1) : 'User'}`}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};
