import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Notice } from '../types';
import { Bell, Calendar, Plus, Megaphone, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Notices: React.FC = () => {
  const { profile, isAdmin, isTeacher } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // New Notice State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'teacher' | 'student'>('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    const roles = ['all'];
    if (profile.role === 'teacher') roles.push('teacher');
    if (profile.role === 'student') roles.push('student');
    if (profile.role === 'admin') roles.push('teacher', 'student');

    const noticesQuery = query(
      collection(db, 'notices'),
      where('targetRole', 'in', roles)
    );

    const unsubscribe = onSnapshot(noticesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
      // Sort in memory
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotices(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notices:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'notices'), {
        title,
        content,
        targetRole,
        authorId: profile.uid,
        authorName: profile.name,
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setTitle('');
      setContent('');
      setTargetRole('all');
    } catch (error) {
      console.error('Error posting notice:', error);
      alert('Failed to post notice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-3xl" />)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">School Notices</h2>
          <p className="text-slate-500">Stay updated with the latest announcements.</p>
        </div>
        {(isAdmin || isTeacher) && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus className="w-5 h-5" />
            Post Notice
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {notices.length > 0 ? notices.map((notice, index) => (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{notice.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <User className="w-3 h-3" />
                      {notice.authorName}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {notice.createdAt?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                notice.targetRole === 'all' ? 'bg-blue-50 text-blue-600' :
                notice.targetRole === 'teacher' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                For: {notice.targetRole}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">{notice.content}</p>
          </motion.div>
        )) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
            <Bell className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No notices found.</p>
          </div>
        )}
      </div>

      {/* Post Notice Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-lg"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Post New Notice</h3>
              <form onSubmit={handlePostNotice} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                  <input 
                    type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Holiday Announcement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                  >
                    <option value="all">All (Teachers & Students)</option>
                    <option value="teacher">Teachers Only</option>
                    <option value="student">Students Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Content</label>
                  <textarea 
                    required rows={5} value={content} onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Write your announcement here..."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Posting...' : 'Post Notice'}
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
