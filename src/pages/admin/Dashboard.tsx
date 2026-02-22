import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { Users, BookOpen, Bell, Calendar, UserPlus, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'register'>('overview');
  
  // Registration Form State
  const [regType, setRegType] = useState<'teacher' | 'student'>('student');
  const [name, setName] = useState('');
  const [idValue, setIdValue] = useState(''); // Roll No or Employee ID
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('arambh123'); // Default password
  const [regLoading, setRegLoading] = useState(false);
  const [regMessage, setRegMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStats();
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
      // For students, use roll number as email if not provided
      const finalEmail = email || (regType === 'student' ? `roll${idValue}@arambh.com` : `emp${idValue}@arambh.com`);
      
      // 1. Create user in Firebase Auth
      // Note: This will sign out the admin if not careful in a real app, 
      // but for this demo/prototype we'll assume it's handled or use a secondary auth instance if needed.
      // In a production app, you'd use a Cloud Function to create users to avoid signing out the admin.
      const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
      const user = userCredential.user;

      // 2. Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email: finalEmail,
        role: regType,
        [regType === 'student' ? 'rollNo' : 'employeeId']: idValue,
        isFirstLogin: true,
        createdAt: serverTimestamp()
      });

      const typeLabel = regType ? regType.charAt(0).toUpperCase() + regType.slice(1) : 'User';
      setRegMessage({ type: 'success', text: `${typeLabel} registered successfully!` });
      setName('');
      setIdValue('');
      setEmail('');
      fetchStats();
    } catch (error: any) {
      setRegMessage({ type: 'error', text: error.message || 'Failed to register user.' });
    } finally {
      setRegLoading(false);
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
          <h2 className="text-2xl font-bold text-slate-900">Arambh Admin Panel</h2>
          <p className="text-slate-500">Manage your institution's digital infrastructure.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'register' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Registration
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Teachers', value: stats.teachers, icon: GraduationCap, color: 'bg-blue-500' },
              { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-emerald-500' },
              { label: 'Active Classes', value: stats.classes, icon: BookOpen, color: 'bg-indigo-500' },
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
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button onClick={() => { setActiveTab('register'); setRegType('student'); }} className="p-6 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-100 transition-all flex flex-col items-center gap-2">
                <UserPlus className="w-6 h-6" />
                Add Student
              </button>
              <button onClick={() => { setActiveTab('register'); setRegType('teacher'); }} className="p-6 bg-emerald-50 text-emerald-700 rounded-2xl font-bold hover:bg-emerald-100 transition-all flex flex-col items-center gap-2">
                <GraduationCap className="w-6 h-6" />
                Add Teacher
              </button>
              <button className="p-6 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-100 transition-all flex flex-col items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Assign Subject
              </button>
              <button className="p-6 bg-amber-50 text-amber-700 rounded-2xl font-bold hover:bg-amber-100 transition-all flex flex-col items-center gap-2">
                <Bell className="w-6 h-6" />
                Post Notice
              </button>
            </div>
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-8 p-1 bg-slate-50 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setRegType('student')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${regType === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Student
            </button>
            <button 
              onClick={() => setRegType('teacher')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${regType === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Teacher
            </button>
          </div>

          {regMessage.text && (
            <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm ${regMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {regMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <p>{regMessage.text}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{regType === 'student' ? 'Roll Number' : 'Employee ID'}</label>
                <input 
                  type="text" 
                  required 
                  value={idValue}
                  onChange={(e) => setIdValue(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={regType === 'student' ? "101" : "T-501"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email (Optional)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={regType === 'student' ? `roll${idValue || '101'}@arambh.com` : `emp${idValue || '501'}@arambh.com`}
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">If left blank, a default email will be generated using the ID.</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-xs text-amber-700 font-medium">
                <strong>Note:</strong> The default password will be <code className="bg-amber-100 px-1 rounded">arambh123</code>. 
                The user will be forced to change it on their first login.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={regLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {regLoading ? 'Registering...' : `Register ${regType ? regType.charAt(0).toUpperCase() + regType.slice(1) : 'User'}`}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};
