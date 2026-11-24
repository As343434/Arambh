import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Bell, Calendar, Megaphone, MessageSquare, Plus, Send, Trash2, User } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { DirectMessage, Notice } from '../types';

export const Notices: React.FC = () => {
  const { profile, normalizedRole, isAdmin, can } = useAuth();
  const { classes, departments, users } = useUniversity();
  const canPostNotice = isAdmin || can('communication.manage') || can('academics.manage');

  const [notices, setNotices] = useState<Notice[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notices' | 'messages'>('notices');

  // Notice modal
  const [noticeModal, setNoticeModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<string>('all');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

  // Message modal
  const [msgModal, setMsgModal] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;
    const u1 = onSnapshot(collection(db, 'notices'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notice));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotices(list);
      setLoading(false);
    }, () => setLoading(false));

    if (isAdmin) {
      const u2 = onSnapshot(collection(db, 'messages'), snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as DirectMessage));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMessages(list);
      }, () => {});
      return () => { u1(); u2(); };
    }

    let sentList: DirectMessage[] = [];
    let recList: DirectMessage[] = [];
    const mergeMessages = () => {
      const map = new Map<string, DirectMessage>();
      [...sentList, ...recList].forEach(m => map.set(m.id, m));
      const merged = Array.from(map.values()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMessages(merged);
    };

    const u2a = onSnapshot(query(collection(db, 'messages'), where('senderId', '==', profile.uid)), snap => {
      sentList = snap.docs.map(d => ({ id: d.id, ...d.data() } as DirectMessage));
      mergeMessages();
    }, () => {});
    const u2b = onSnapshot(query(collection(db, 'messages'), where('recipientId', '==', profile.uid)), snap => {
      recList = snap.docs.map(d => ({ id: d.id, ...d.data() } as DirectMessage));
      mergeMessages();
    }, () => {});

    return () => { u1(); u2a(); u2b(); };
  }, [profile?.uid, isAdmin]);

  const visibleNotices = useMemo(() => {
    return notices.filter(n => {
      if (isAdmin || n.authorId === profile?.uid) return true;
      if (n.targetRole === 'all') return true;
      if (n.targetRole === normalizedRole || n.targetRole === profile?.role) return true;
      if (n.targetRole === 'class') {
        const cls = classes.find(c => c.id === n.targetClassId);
        return cls?.students?.includes(profile?.uid || '') || cls?.teacherId === profile?.uid || cls?.mentorId === profile?.uid;
      }
      return false;
    });
  }, [notices, isAdmin, profile?.uid, profile?.role, normalizedRole, classes]);

  const myMessages = useMemo(() => {
    return messages.filter(m => m.recipientId === profile?.uid || m.senderId === profile?.uid);
  }, [messages, profile?.uid]);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const ref = await addDoc(collection(db, 'notices'), {
      title,
      content,
      targetRole,
      targetClassId: targetRole === 'class' ? targetClassId : null,
      targetClassName: targetRole === 'class' ? classes.find(c => c.id === targetClassId)?.name : null,
      targetDepartmentId: targetDeptId || null,
      priority,
      authorId: profile.uid,
      authorName: profile.name,
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'POST_NOTICE', 'Communication', ref.id, title);
    setNoticeModal(false);
    setTitle('');
    setContent('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !recipientId) return;
    const rec = users.find(u => u.uid === recipientId);
    if (!rec) return;
    await addDoc(collection(db, 'messages'), {
      senderId: profile.uid,
      senderName: profile.name,
      senderRole: profile.role,
      recipientId: rec.uid,
      recipientName: rec.name,
      subject: msgSubject,
      body: msgBody,
      read: false,
      createdAt: serverTimestamp()
    });
    setMsgModal(false);
    setMsgSubject('');
    setMsgBody('');
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication, Notices & Direct Messages"
        subtitle="University circulars, class/department announcements, and direct institutional messaging."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setRecipientId(users.find(u => u.uid !== profile?.uid)?.uid || ''); setMsgModal(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <Send className="w-3.5 h-3.5" /> New Message
            </button>
            {canPostNotice && (
              <button
                type="button"
                onClick={() => setNoticeModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
              >
                <Plus className="w-3.5 h-3.5" /> Post Notice
              </button>
            )}
          </div>
        }
      />

      <SegmentedTabs
        active={activeTab}
        onChange={v => setActiveTab(v as any)}
        tabs={[
          { id: 'notices', label: 'Notices & Circulars', count: visibleNotices.length },
          { id: 'messages', label: 'Direct Messages', count: myMessages.length }
        ]}
      />

      {activeTab === 'notices' && (
        visibleNotices.length > 0 ? (
          <div className="space-y-4">
            {visibleNotices.map(n => (
              <div key={n.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{n.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#52525B] mt-0.5">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {n.authorName}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                        <span className="capitalize font-medium text-[#111111] dark:text-zinc-200">
                          Audience: {n.targetRole === 'class' ? n.targetClassName : n.targetRole}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.priority && n.priority !== 'normal' && <StatusText status={n.priority} tone="danger" />}
                    {(isAdmin || n.authorId === profile?.uid) && (
                      <button onClick={() => deleteDoc(doc(db, 'notices', n.id))} className="p-1 text-zinc-400 hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#52525B] dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Bell} title="No Notices Posted" description="Institutional announcements and circulars will appear here." />
        )
      )}

      {activeTab === 'messages' && (
        myMessages.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
            {myMessages.map(m => {
              const incoming = m.recipientId === profile?.uid;
              return (
                <div
                  key={m.id}
                  onClick={() => incoming && !m.read && updateDoc(doc(db, 'messages', m.id), { read: true })}
                  className="p-4 space-y-1.5 cursor-pointer hover:bg-zinc-50/70 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      {incoming ? `From: ${m.senderName}` : `To: ${m.recipientName}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {incoming && !m.read && <span className="text-[#111111] dark:text-zinc-200 font-semibold">Unread</span>}
                      <span className="text-zinc-400">{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium">{m.subject}</h4>
                  <p className="text-xs text-[#52525B] dark:text-slate-300 whitespace-pre-wrap">{m.body}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={MessageSquare} title="Inbox Empty" description="Send direct messages to faculty, advisors, students, or university offices." />
        )
      )}

      <Modal open={noticeModal} onClose={() => setNoticeModal(false)} title="Publish Announcement">
        <form onSubmit={handlePostNotice} className="space-y-4">
          <div><label className="block text-xs font-medium mb-1">Title</label><input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Audience</label>
              <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="all">University-Wide (All)</option>
                <option value="student">Students Only</option>
                <option value="teacher">Teaching Faculty</option>
                <option value="class">Specific Class</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          {targetRole === 'class' && (
            <select required value={targetClassId} onChange={e => setTargetClassId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select value={targetDeptId} onChange={e => setTargetDeptId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <textarea required rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Write official notice content..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNoticeModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Post Notice</button>
          </div>
        </form>
      </Modal>

      <Modal open={msgModal} onClose={() => setMsgModal(false)} title="Send Direct Message">
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Recipient</label>
            <select required value={recipientId} onChange={e => setRecipientId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {users.filter(u => u.uid !== profile?.uid).map(u => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Subject</label><input type="text" required value={msgSubject} onChange={e => setMsgSubject(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <textarea required rows={4} value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Write your message..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMsgModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Send Message</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
