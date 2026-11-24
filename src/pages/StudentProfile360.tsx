import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { PageHeader, SegmentedTabs, StatusText } from '../components/ui/DataUI';
import { UserProfile } from '../types';
import { ArrowLeft, Printer, Save } from 'lucide-react';

export const StudentProfile360: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { profile, isStudent, isParent, can, canViewField } = useAuth();
  const { departments, programs, batches, classes, subjects, semesters, academicYears } = useUniversity();

  const targetUid = studentId || profile?.uid || '';
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<UserProfile>>({});

  const [attendance, setAttendance] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [libraryIssues, setLibraryIssues] = useState<any[]>([]);
  const [hostelAlloc, setHostelAlloc] = useState<any[]>([]);
  const [transportAlloc, setTransportAlloc] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [discipline, setDiscipline] = useState<any[]>([]);

  useEffect(() => {
    if (!targetUid) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(doc(db, 'users', targetUid), snap => {
      if (snap.exists()) {
        const data = { uid: snap.id, ...snap.data() } as UserProfile;
        setStudent(data);
        setForm(data);
      }
    }, () => {}));

    const listenByStudent = (col: string, field: string, setter: (v: any[]) => void) => {
      unsubs.push(onSnapshot(query(collection(db, col), where(field, '==', targetUid)), s => setter(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}));
    };

    listenByStudent('attendance', 'studentId', setAttendance);
    listenByStudent('submissions', 'studentId', setSubmissions);
    if (isStudent || isParent) {
      unsubs.push(onSnapshot(query(collection(db, 'examMarks'), where('studentId', '==', targetUid), where('isPublished', '==', true)), s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}));
    } else {
      listenByStudent('examMarks', 'studentId', setMarks);
    }
    listenByStudent('invoices', 'studentId', setInvoices);
    listenByStudent('payments', 'studentId', setPayments);
    listenByStudent('libraryIssues', 'userId', setLibraryIssues);
    listenByStudent('hostelAllocations', 'studentId', setHostelAlloc);
    listenByStudent('transportAllocations', 'studentId', setTransportAlloc);
    listenByStudent('certificateRequests', 'studentId', setCertificates);
    listenByStudent('supportTickets', 'userId', setTickets);
    if (!isStudent && !isParent) {
      listenByStudent('disciplineRecords', 'studentId', setDiscipline);
    }

    return () => unsubs.forEach(u => u());
  }, [targetUid, isStudent, isParent]);

  const studentClass = classes.find(c => c.id === student?.classId || c.students?.includes(targetUid));

  useEffect(() => {
    if (!studentClass?.id) return;
    return onSnapshot(query(collection(db, 'timetable'), where('classId', '==', studentClass.id)), s => {
      setTimetable(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
  }, [studentClass?.id]);

  if (!student) {
    return <div className="p-8 text-center text-sm text-[#52525B]">Loading student record...</div>;
  }

  const dept = departments.find(d => d.id === student.departmentId);
  const prog = programs.find(p => p.id === student.programId);
  const batch = batches.find(b => b.id === student.batchId);
  const sem = semesters.find(s => s.id === student.semesterId);
  const ay = academicYears.find(y => y.id === student.academicYearId);

  const attPresent = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const attPct = attendance.length ? Math.round((attPresent / attendance.length) * 100) : 0;

  const publishedMarks = marks.filter(m => m.isPublished || can('results.approve') || can('marks.enter'));
  const cgpa = publishedMarks.length
    ? (publishedMarks.reduce((acc, m) => acc + (Number(m.gradePoint) || 0), 0) / publishedMarks.length).toFixed(2)
    : 'N/A';

  const totalFees = invoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  const paidFees = invoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDoc(doc(db, 'users', student.uid), {
      name: form.name || student.name,
      phone: form.phone || '',
      gender: form.gender || 'other',
      dob: form.dob || '',
      address: form.address || '',
      bloodGroup: form.bloodGroup || '',
      emergencyContactName: form.emergencyContactName || '',
      emergencyContactPhone: form.emergencyContactPhone || '',
      guardianName: form.guardianName || '',
      guardianPhone: form.guardianPhone || '',
      guardianEmail: form.guardianEmail || '',
      guardianRelation: form.guardianRelation || ''
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52525B] hover:text-[#111111] dark:hover:text-slate-100 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </Link>
        <PageHeader
          title={student.name}
          subtitle={`ID: ${student.rollNo || student.studentId || student.uid.slice(0, 8)} · ${prog?.name || 'Program Unassigned'} · ${dept?.name || 'Department Unassigned'} · ${studentClass?.name || 'No Section'}`}
          actions={
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <Printer className="w-3.5 h-3.5" /> Print Record
              </button>
              {can('users.manage') && (
                <button type="button" onClick={() => setEditing(!editing)} className="px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg">
                  {editing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          ['Status', student.status || 'active'],
          ['Attendance', `${attPct}% (${attPresent}/${attendance.length})`],
          ['CGPA', String(cgpa)],
          ['Fee Balance', canViewField('financials') ? `₹${(totalFees - paidFees).toLocaleString()}` : 'Restricted'],
          ['Library Books', String(libraryIssues.filter(l => l.status !== 'returned').length)]
        ].map(([k, v]) => (
          <div key={k} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-4">
            <p className="text-[11px] text-[#52525B]">{k}</p>
            <p className="text-base font-bold font-mono tabular-nums mt-1 capitalize">{v}</p>
          </div>
        ))}
      </div>

      <SegmentedTabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Personal & Guardian' },
          { id: 'academics', label: 'Program, Courses & Timetable' },
          { id: 'attendance', label: 'Attendance & Assignments' },
          { id: 'exams', label: 'Exams, Grades & CGPA' },
          { id: 'finance', label: 'Fees & Scholarships' },
          { id: 'campus', label: 'Library, Hostel & Transport' },
          { id: 'support', label: 'Certificates, Support & Discipline' },
        ]}
      />

      {tab === 'overview' && (
        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Full Name</label>
              <input disabled={!editing} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Email</label>
              <input disabled value={student.email} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Phone</label>
              <input disabled={!editing} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Date of Birth</label>
              <input type="date" disabled={!editing} value={form.dob || ''} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Blood Group</label>
              <input disabled={!editing} value={form.bloodGroup || ''} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Address</label>
              <input disabled={!editing} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Guardian Name</label>
              <input disabled={!editing} value={form.guardianName || ''} onChange={e => setForm({ ...form, guardianName: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Guardian Phone</label>
              <input disabled={!editing} value={form.guardianPhone || ''} onChange={e => setForm({ ...form, guardianPhone: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
            <div>
              <label className="block font-semibold text-[#52525B] mb-1">Emergency Contact</label>
              <input disabled={!editing} value={form.emergencyContactPhone || ''} onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })} placeholder="Name & Phone" className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-75" />
            </div>
          </div>
          {editing && (
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">
              <Save className="w-3.5 h-3.5" /> Save Student Details
            </button>
          )}
        </form>
      )}

      {tab === 'academics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-2 text-xs">
            <h3 className="text-sm font-semibold mb-3">Academic Enrollment</h3>
            <p><span className="text-[#52525B]">Program:</span> {prog?.name || '—'}</p>
            <p><span className="text-[#52525B]">Department:</span> {dept?.name || '—'}</p>
            <p><span className="text-[#52525B]">Academic Year:</span> {ay?.name || '—'}</p>
            <p><span className="text-[#52525B]">Semester:</span> {sem?.name || `Sem ${student.semesterNumber || 1}`}</p>
            <p><span className="text-[#52525B]">Batch:</span> {batch?.name || '—'}</p>
            <p><span className="text-[#52525B]">Class / Section:</span> {studentClass?.name || '—'}</p>
            <p><span className="text-[#52525B]">Registered Subjects:</span> {(studentClass?.subjectIds || []).map(sid => subjects.find(s => s.id === sid)?.name).filter(Boolean).join(', ') || 'None'}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-3">Weekly Schedule ({timetable.length} slots)</h3>
            <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
              {timetable.map(t => (
                <div key={t.id} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <span className="font-medium">{t.day} · {t.subjectName}</span>
                  <span className="font-mono text-[#52525B]">{t.startTime}–{t.endTime} · {t.room}</span>
                </div>
              ))}
              {timetable.length === 0 && <p className="text-[#52525B]">No timetable slots assigned.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-3">Attendance History ({attendance.length})</h3>
            <div className="space-y-2 text-xs max-h-72 overflow-y-auto">
              {attendance.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <span><span className="font-mono">{a.date}</span> · {a.subjectName || a.className}</span>
                  <StatusText status={a.status} />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-3">Assignment Submissions ({submissions.length})</h3>
            <div className="space-y-2 text-xs max-h-72 overflow-y-auto">
              {submissions.map(s => (
                <div key={s.id} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                  <span>{s.assignmentTitle || 'Assignment'}</span>
                  <span className="font-mono">{s.marks !== undefined ? `${s.marks} marks (${s.grade || ''})` : s.status || 'submitted'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'exams' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left">Exam</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Grade</th>
                <th className="px-4 py-3 text-right">GP</th>
                <th className="px-4 py-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {publishedMarks.map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-3">{m.examTitle || 'Exam'}</td>
                  <td className="px-4 py-3 font-medium">{m.subjectName}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{m.totalMarks} / {m.maxMarks}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{m.grade}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{m.gradePoint}</td>
                  <td className="px-4 py-3 text-right"><StatusText status={m.status} /></td>
                </tr>
              ))}
              {publishedMarks.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-[#52525B]">No published examination records.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'finance' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
          {!canViewField('financials') ? (
            <p className="text-xs text-[#52525B]">Financial records are restricted for your role.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-semibold">
                <span>Invoices ({invoices.length})</span>
                <span className="font-mono">Paid ₹{paidFees.toLocaleString()} / Total ₹{totalFees.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {invoices.map(inv => (
                  <div key={inv.id} className="py-2.5 flex justify-between">
                    <span><span className="font-mono">{inv.invoiceNo}</span> · {inv.title}</span>
                    <span className="font-mono">₹{inv.paidAmount} / ₹{inv.totalAmount} · <StatusText status={inv.status} /></span>
                  </div>
                ))}
                {payments.length > 0 && <p className="pt-3 text-[#52525B]">Total payment transactions recorded: {payments.length}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'campus' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-2">Library Issues ({libraryIssues.length})</h3>
            {libraryIssues.map(l => <p key={l.id} className="py-1 border-b border-slate-100 dark:border-zinc-800">{l.bookTitle} · {l.status}</p>)}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-2">Hostel Allocation</h3>
            {hostelAlloc.map(h => <p key={h.id}>{h.hostelName} · Room {h.roomNumber} ({h.status})</p>)}
            {hostelAlloc.length === 0 && <p className="text-[#52525B]">Day scholar / Not allocated.</p>}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-2">Transport Pass</h3>
            {transportAlloc.map(t => <p key={t.id}>{t.routeName} · Stop: {t.stopName} ({t.status})</p>)}
            {transportAlloc.length === 0 && <p className="text-[#52525B]">No transport allocation.</p>}
          </div>
        </div>
      )}

      {tab === 'support' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-2">Certificates ({certificates.length})</h3>
            {certificates.map(c => <p key={c.id} className="py-1">{c.certificateNo} · {c.type} · {c.status}</p>)}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-2">Support Tickets ({tickets.length})</h3>
            {tickets.map(t => <p key={t.id} className="py-1">{t.ticketNo} · {t.subject} · {t.status}</p>)}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-2">Disciplinary Records ({discipline.length})</h3>
            {discipline.map(d => <p key={d.id} className="py-1">{d.incidentDate} · {d.category} ({d.severity})</p>)}
          </div>
        </div>
      )}
    </div>
  );
};
