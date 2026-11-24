import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { BookMarked, BookOpen, CheckCircle2, Clock, ExternalLink, Globe, Plus, RotateCcw, Search } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { LibraryBook, LibraryIssue, LibraryReservation } from '../types';

const DIGITAL_RESOURCES = [
  { id: 'ieee', title: 'IEEE Xplore Digital Library Open', category: 'Engineering & Computing', url: 'https://ieeexplore.ieee.org', desc: 'Peer-reviewed technical papers, standards, and conference proceedings.' },
  { id: 'arxiv', title: 'arXiv Preprint Repository', category: 'Mathematics, Physics & CS', url: 'https://arxiv.org', desc: 'Open-access scholarly archive covering computer science, math, and quantitative research.' },
  { id: 'nptel', title: 'NPTEL Video Courses & Lecture Notes', category: 'STEM & Management', url: 'https://nptel.ac.in', desc: 'University-level video lectures, syllabus notes, and verified assignments.' },
  { id: 'doaj', title: 'Directory of Open Access Journals (DOAJ)', category: 'Multidisciplinary Journals', url: 'https://doaj.org', desc: 'Curated directory of peer-reviewed open access academic journals worldwide.' },
  { id: 'mitocw', title: 'MIT OpenCourseWare', category: 'Open Courseware', url: 'https://ocw.mit.edu', desc: 'Complete university lecture notes, problem sets, and textbook references.' },
  { id: 'ncbi', title: 'PubMed Central (PMC)', category: 'Biomedical & Life Sciences', url: 'https://pmc.ncbi.nlm.nih.gov', desc: 'Free full-text archive of biomedical and life sciences journal literature.' }
];

export const Library: React.FC = () => {
  const { profile, isStudent, can } = useAuth();
  const { university, users } = useUniversity();
  const canManage = can('library.manage');

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [issues, setIssues] = useState<LibraryIssue[]>([]);
  const [reservations, setReservations] = useState<LibraryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'circulation' | 'reservations' | 'digital'>('catalog');
  const [search, setSearch] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  // Book Modal
  const [bookModal, setBookModal] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [publisher, setPublisher] = useState('');
  const [totalCopies, setTotalCopies] = useState(5);
  const [shelfLocation, setShelfLocation] = useState('A-101');

  // Issue Modal
  const [issueTargetBook, setIssueTargetBook] = useState<LibraryBook | null>(null);
  const [issueUserId, setIssueUserId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'libraryBooks'),
      s => {
        setBooks(s.docs.map(d => ({ id: d.id, ...d.data() } as LibraryBook)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const issuesQ = canManage
      ? collection(db, 'libraryIssues')
      : profile?.uid
      ? query(collection(db, 'libraryIssues'), where('userId', '==', profile.uid))
      : null;
    const resQ = canManage
      ? collection(db, 'libraryReservations')
      : profile?.uid
      ? query(collection(db, 'libraryReservations'), where('studentId', '==', profile.uid))
      : null;

    const u2 = issuesQ
      ? onSnapshot(issuesQ, s => setIssues(s.docs.map(d => ({ id: d.id, ...d.data() } as LibraryIssue))), () => {})
      : () => {};
    const u3 = resQ
      ? onSnapshot(resQ, s => setReservations(s.docs.map(d => ({ id: d.id, ...d.data() } as LibraryReservation))), () => {})
      : () => {};
    return () => { u1(); u2(); u3(); };
  }, [canManage, profile?.uid]);

  const filteredBooks = useMemo(() => {
    if (!search.trim()) return books;
    const q = search.toLowerCase();
    return books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q) || b.category.toLowerCase().includes(q));
  }, [books, search]);

  const visibleIssues = useMemo(() => {
    return canManage ? issues : issues.filter(i => i.userId === profile?.uid);
  }, [issues, canManage, profile?.uid]);

  const visibleReservations = useMemo(() => {
    return canManage ? reservations : reservations.filter(r => r.studentId === profile?.uid);
  }, [reservations, canManage, profile?.uid]);

  const unpaidFines = useMemo(() => {
    return visibleIssues.filter(i => i.fineAmount > 0 && !i.finePaid).reduce((a, b) => a + (b.fineAmount || 0), 0);
  }, [visibleIssues]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'libraryBooks'), {
      isbn,
      title,
      author,
      category,
      publisher,
      totalCopies: Number(totalCopies) || 1,
      availableCopies: Number(totalCopies) || 1,
      shelfLocation
    });
    await logAudit(profile, 'ADD_LIBRARY_BOOK', 'Library', ref.id, `${title} (${isbn})`);
    setBookModal(false);
    setTitle('');
    setAuthor('');
    setIsbn('');
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTargetBook || issueTargetBook.availableCopies <= 0) return;
    const borrower = users.find(u => u.uid === issueUserId);
    if (!borrower) return;

    const ref = await addDoc(collection(db, 'libraryIssues'), {
      bookId: issueTargetBook.id,
      bookTitle: issueTargetBook.title,
      userId: borrower.uid,
      userName: borrower.name,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      status: 'issued',
      fineAmount: 0,
      finePaid: true,
      renewCount: 0
    });
    await updateDoc(doc(db, 'libraryBooks', issueTargetBook.id), {
      availableCopies: Math.max(0, issueTargetBook.availableCopies - 1)
    });
    await logAudit(profile, 'ISSUE_BOOK', 'Library', ref.id, `${issueTargetBook.title} -> ${borrower.name}`);
    setIssueTargetBook(null);
  };

  const handleReturnBook = async (issue: LibraryIssue) => {
    const today = new Date();
    const due = new Date(issue.dueDate);
    const lateDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    const fine = lateDays * 10;

    await updateDoc(doc(db, 'libraryIssues', issue.id), {
      status: 'returned',
      returnDate: today.toISOString().split('T')[0],
      fineAmount: fine,
      finePaid: fine === 0
    });
    const book = books.find(b => b.id === issue.bookId);
    if (book) {
      await updateDoc(doc(db, 'libraryBooks', book.id), {
        availableCopies: Math.min(book.totalCopies, book.availableCopies + 1)
      });
    }
    await logAudit(profile, 'RETURN_BOOK', 'Library', issue.id, `${issue.bookTitle} (Fine: ${fine})`);
  };

  const handleRenewBook = async (issue: LibraryIssue & { renewCount?: number }) => {
    const currentRenewals = issue.renewCount || 0;
    if (currentRenewals >= 2) {
      setBanner('Maximum renewal limit (2 renewals) reached for this title.');
      return;
    }
    const base = new Date(issue.dueDate || Date.now());
    base.setDate(base.getDate() + 7);
    const nextDue = base.toISOString().split('T')[0];
    await updateDoc(doc(db, 'libraryIssues', issue.id), {
      dueDate: nextDue,
      renewCount: currentRenewals + 1
    });
    await logAudit(profile, 'RENEW_BOOK', 'Library', issue.id, `${issue.bookTitle} extended to ${nextDue}`);
    setBanner(`Book "${issue.bookTitle}" renewed until ${nextDue}.`);
  };

  const handleReserveBook = async (book: LibraryBook) => {
    if (!profile) return;
    const exists = reservations.find(r => r.bookId === book.id && r.studentId === profile.uid && r.status === 'reserved');
    if (exists) {
      setBanner('You already have an active reservation for this title.');
      return;
    }
    const ref = await addDoc(collection(db, 'libraryReservations'), {
      bookId: book.id,
      bookTitle: book.title,
      studentId: profile.uid,
      studentName: profile.name,
      status: 'reserved',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'RESERVE_BOOK', 'Library', ref.id, book.title);
    setBanner(`Reserved "${book.title}". You will be notified when a copy is returned.`);
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;
  const currency = university.currency || 'INR';

  return (
    <div className="space-y-6">
      <PageHeader
        title="University Library"
        subtitle="Catalog search, book renewals, queue reservations, circulation tracking, and digital resources."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setBookModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
            >
              <Plus className="w-3.5 h-3.5" /> Add Catalog Book
            </button>
          ) : undefined
        }
      />

      {banner && (
        <div className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs text-[#111111] dark:text-zinc-200 flex justify-between items-center">
          <span className="font-medium">{banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Catalog Titles" value={books.length} icon={BookOpen} tone="indigo" />
        <StatCard label="Available Copies" value={books.reduce((a, b) => a + (b.availableCopies || 0), 0)} icon={CheckCircle2} tone="emerald" />
        <StatCard label={isStudent ? 'My Borrowed Books' : 'Active Circulation'} value={visibleIssues.filter(i => i.status === 'issued').length} icon={BookMarked} tone="amber" />
        <StatCard label={isStudent ? 'Unpaid Library Fines' : 'Active Reservations'} value={isStudent ? `${currency} ${unpaidFines}` : visibleReservations.filter(r => r.status === 'reserved').length} icon={Clock} tone={isStudent && unpaidFines > 0 ? 'rose' : 'default'} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedTabs
          active={activeTab}
          onChange={v => setActiveTab(v as any)}
          tabs={[
            { id: 'catalog', label: 'Book Catalog', count: filteredBooks.length },
            { id: 'circulation', label: isStudent ? 'My Borrowings' : 'Circulation & Fines', count: visibleIssues.length },
            { id: 'reservations', label: 'Reservations', count: visibleReservations.length },
            { id: 'digital', label: 'Digital Library', count: DIGITAL_RESOURCES.length }
          ]}
        />
        {activeTab === 'catalog' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, author, ISBN..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
            />
          </div>
        )}
      </div>

      {activeTab === 'catalog' && (
        filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map(b => {
              const alreadyReserved = reservations.some(r => r.bookId === b.id && r.studentId === profile?.uid && r.status === 'reserved');
              return (
                <div key={b.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#52525B]">
                      <span className="font-mono">{b.isbn}</span>
                      <span className="font-mono">Shelf {b.shelfLocation}</span>
                    </div>
                    <h3 className="text-base font-semibold mt-1">{b.title}</h3>
                    <p className="text-xs text-[#52525B]">{b.author} · {b.category}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className={`font-mono font-semibold tabular-nums ${b.availableCopies > 0 ? 'text-[#111111] dark:text-zinc-200' : 'text-[#27272A] dark:text-zinc-300'}`}>
                      {b.availableCopies} / {b.totalCopies} available
                    </span>
                    {canManage ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={b.availableCopies <= 0}
                          onClick={() => { setIssueTargetBook(b); setIssueUserId(users[0]?.uid || ''); }}
                          className="font-semibold text-[#111111] dark:text-zinc-200 hover:underline disabled:opacity-40"
                        >
                          Issue Copy
                        </button>
                        <button onClick={() => deleteDoc(doc(db, 'libraryBooks', b.id))} className="text-rose-500 hover:underline">Delete</button>
                      </div>
                    ) : isStudent && (
                      <button
                        type="button"
                        disabled={alreadyReserved}
                        onClick={() => handleReserveBook(b)}
                        className="font-semibold text-[#111111] dark:text-zinc-200 hover:underline disabled:opacity-40"
                      >
                        {alreadyReserved ? 'Reserved' : b.availableCopies > 0 ? 'Hold Copy' : 'Join Queue'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="No Books in Catalog" description="Add ISBN records to begin managing library circulation." />
        )
      )}

      {activeTab === 'circulation' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Book Title</th>
                  {canManage && <th className="py-3 px-4 font-semibold">Borrower</th>}
                  <th className="py-3 px-4 font-semibold">Issue / Due</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Fine</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {visibleIssues.map((i: any) => (
                  <tr key={i.id}>
                    <td className="py-3 px-4 font-medium">{i.bookTitle}</td>
                    {canManage && <td className="py-3 px-4">{i.userName}</td>}
                    <td className="py-3 px-4 font-mono text-xs">{i.issueDate} → {i.dueDate}</td>
                    <td className="py-3 px-4"><StatusText status={i.status} /></td>
                    <td className="py-3 px-4 font-mono text-xs">{i.fineAmount > 0 ? `${currency} ${i.fineAmount} (${i.finePaid ? 'Paid' : 'Unpaid'})` : '—'}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {canManage ? (
                        <>
                          {i.status === 'issued' && (
                            <button onClick={() => handleReturnBook(i)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#111111] hover:underline">
                              <RotateCcw className="w-3 h-3" /> Return Book
                            </button>
                          )}
                          {i.fineAmount > 0 && !i.finePaid && (
                            <button onClick={() => updateDoc(doc(db, 'libraryIssues', i.id), { finePaid: true })} className="text-xs font-semibold text-[#111111] hover:underline">
                              Collect Fine
                            </button>
                          )}
                        </>
                      ) : (
                        i.status === 'issued' && (
                          <button
                            type="button"
                            disabled={(i.renewCount || 0) >= 2}
                            onClick={() => handleRenewBook(i)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline disabled:opacity-40"
                          >
                            <RotateCcw className="w-3 h-3" /> {(i.renewCount || 0) >= 2 ? 'Max Renewals' : 'Renew (+7d)'}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
                {visibleIssues.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-zinc-400">No circulation records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleReservations.map(r => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-4 text-sm">
              <div>
                <p className="font-semibold">{r.bookTitle}</p>
                <p className="text-xs text-[#52525B]">{canManage ? `Requested by ${r.studentName}` : 'Library Hold Queue'}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusText status={r.status} />
                {canManage && r.status === 'reserved' && (
                  <button onClick={() => updateDoc(doc(db, 'libraryReservations', r.id), { status: 'fulfilled' })} className="text-xs font-semibold text-[#111111] hover:underline">
                    Mark Fulfilled
                  </button>
                )}
                {r.status === 'reserved' && (canManage || r.studentId === profile?.uid) && (
                  <button onClick={() => updateDoc(doc(db, 'libraryReservations', r.id), { status: 'cancelled' })} className="text-xs text-rose-600 hover:underline">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
          {visibleReservations.length === 0 && (
            <div className="p-8 text-center text-xs text-zinc-400">No active book reservations.</div>
          )}
        </div>
      )}

      {activeTab === 'digital' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIGITAL_RESOURCES.map(res => (
            <div key={res.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between text-xs text-[#52525B]">
                  <span className="font-semibold text-[#111111] dark:text-zinc-200">{res.category}</span>
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-base font-semibold mt-1">{res.title}</h3>
                <p className="text-xs text-[#52525B] mt-1.5">{res.desc}</p>
              </div>
              <a
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
              >
                Open Digital Repository <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}

      <Modal open={bookModal} onClose={() => setBookModal(false)} title="Add Book to Catalog">
        <form onSubmit={handleAddBook} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Book Title</label><input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Author</label><input type="text" required value={author} onChange={e => setAuthor(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">ISBN</label><input type="text" required value={isbn} onChange={e => setIsbn(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Category</label><input type="text" required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Total Copies</label><input type="number" min={1} value={totalCopies} onChange={e => setTotalCopies(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Shelf Location</label><input type="text" required value={shelfLocation} onChange={e => setShelfLocation(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setBookModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Book</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!issueTargetBook} onClose={() => setIssueTargetBook(null)} title={`Issue Book — ${issueTargetBook?.title || ''}`}>
        <form onSubmit={handleIssueBook} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Borrower (Student / Faculty)</label>
            <select required value={issueUserId} onChange={e => setIssueUserId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {users.map(u => <option key={u.uid} value={u.uid}>{u.name} ({u.rollNo || u.employeeId || u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Return Due Date</label>
            <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIssueTargetBook(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Issue Book</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

