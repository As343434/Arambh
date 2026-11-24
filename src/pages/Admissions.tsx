import React, { useEffect, useState } from 'react';
import { addDoc, arrayUnion, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, getSecondaryAuth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { AdmissionApplication } from '../types';
import { exportToCsv, logAudit } from '../services/erpService';
import { Modal, PageHeader, StatCard, StatusText } from '../components/ui/DataUI';
import { Download, Plus, UserCheck, Users, CheckCircle2, Clock } from 'lucide-react';

export const Admissions: React.FC = () => {
  const { profile } = useAuth();
  const { programs, departments, batches, classes } = useUniversity();
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    applicantName: '', email: '', phone: '', gender: 'male' as const, dob: '',
    address: '', guardianName: '', guardianPhone: '', programId: '', departmentId: '',
    batchId: '', previousInstitution: '', academicScore: 85, notes: ''
  });

  useEffect(() => {
    return onSnapshot(collection(db, 'admissions'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdmissionApplication));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setApplications(data);
    }, () => {});
  }, []);

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    const appNo = `ADM-${new Date().getFullYear()}-${String(applications.length + 101).padStart(4, '0')}`;
    const ref = await addDoc(collection(db, 'admissions'), {
      ...form,
      applicationNo: appNo,
      status: 'applied',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_ADMISSION', 'Admissions', ref.id, `New application ${appNo} for ${form.applicantName}`);
    setShowModal(false);
    setForm({
      applicantName: '', email: '', phone: '', gender: 'male', dob: '',
      address: '', guardianName: '', guardianPhone: '', programId: '', departmentId: '',
      batchId: '', previousInstitution: '', academicScore: 85, notes: ''
    });
  };

  const updateStatus = async (app: AdmissionApplication, status: AdmissionApplication['status']) => {
    await updateDoc(doc(db, 'admissions', app.id), { status, reviewedBy: profile?.name || 'Admissions' });
    await logAudit(profile, 'UPDATE_ADMISSION_STATUS', 'Admissions', app.id, `${app.applicationNo} -> ${status}`);
  };

  const enrollAsStudent = async (app: AdmissionApplication) => {
    setEnrollingId(app.id);
    setFeedback(null);
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, app.email, 'arambh123');
      const uid = cred.user.uid;
      const rollNo = `STU-${new Date().getFullYear().toString().slice(-2)}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const matchedClass = classes.find(c => c.programId === app.programId) || classes[0];

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: app.applicantName,
        email: app.email,
        phone: app.phone,
        gender: app.gender,
        dob: app.dob,
        address: app.address,
        guardianName: app.guardianName,
        guardianPhone: app.guardianPhone,
        role: 'student',
        status: 'active',
        rollNo,
        studentId: rollNo,
        programId: app.programId,
        departmentId: app.departmentId,
        batchId: app.batchId || '',
        classId: matchedClass?.id || '',
        admissionId: app.id,
        admissionDate: new Date().toISOString().split('T')[0],
        isFirstLogin: true,
        createdAt: serverTimestamp()
      });

      if (matchedClass) {
        await updateDoc(doc(db, 'classes', matchedClass.id), { students: arrayUnion(uid) });
      }

      await addDoc(collection(db, 'invoices'), {
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        studentId: uid,
        studentName: app.applicantName,
        rollNo,
        title: 'Admission & Semester I Tuition Fee',
        category: 'admission',
        baseAmount: 50000,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 50000,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'unpaid',
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'admissions', app.id), { status: 'enrolled', enrolledUid: uid });
      await secondaryAuth.signOut();
      await logAudit(profile, 'ENROLL_STUDENT', 'Admissions', uid, `Enrolled ${app.applicantName} (${rollNo})`);
      setFeedback(`Enrolled ${app.applicantName} (${app.email}, Roll: ${rollNo}, Default password: arambh123) and generated admission invoice.`);
    } catch (err: any) {
      setFeedback(`Enrollment error: ${err.message}`);
    } finally {
      setEnrollingId(null);
    }
  };

  const filtered = applications.filter(a => {
    const q = search.toLowerCase();
    const matchQ = a.applicantName.toLowerCase().includes(q) || a.applicationNo.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchQ && matchStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions & Enrollment Pipeline"
        subtitle="Manage applicant intake, merit shortlisting, document review, and one-click student enrollment."
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportToCsv('admissions', filtered)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button type="button" onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200">
              <Plus className="w-3.5 h-3.5" /> New Application
            </button>
          </div>
        }
      />

      {feedback && (
        <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-[#111111] dark:text-zinc-200">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Total Applications" value={applications.length} icon={Users} tone="indigo" />
        <StatCard label="Under Review / Shortlisted" value={applications.filter(a => a.status === 'under_review' || a.status === 'shortlisted').length} icon={Clock} tone="amber" />
        <StatCard label="Approved for Enrollment" value={applications.filter(a => a.status === 'approved').length} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Enrolled Students" value={applications.filter(a => a.status === 'enrolled').length} icon={UserCheck} />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicant name, email, or application no..." className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <option value="all">All Stages</option>
            <option value="applied">Applied</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="approved">Approved</option>
            <option value="enrolled">Enrolled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-[#52525B]">
              <tr>
                <th className="py-2.5 px-3 text-left">App No</th>
                <th className="py-2.5 px-3 text-left">Applicant</th>
                <th className="py-2.5 px-3 text-left">Program</th>
                <th className="py-2.5 px-3 text-right">Score</th>
                <th className="py-2.5 px-3 text-left">Status</th>
                <th className="py-2.5 px-3 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map(app => (
                <tr key={app.id}>
                  <td className="py-3 px-3 font-mono font-semibold">{app.applicationNo}</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold">{app.applicantName}</p>
                    <p className="text-[#52525B]">{app.email} · {app.phone}</p>
                  </td>
                  <td className="py-3 px-3">{programs.find(p => p.id === app.programId)?.name || '—'}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">{app.academicScore}%</td>
                  <td className="py-3 px-3"><StatusText status={app.status} /></td>
                  <td className="py-3 px-3 text-right space-x-2">
                    {app.status !== 'enrolled' && (
                      <>
                        <select
                          value={app.status}
                          onChange={e => updateStatus(app, e.target.value as any)}
                          className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[11px]"
                        >
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        {app.status === 'approved' && (
                          <button
                            type="button"
                            disabled={enrollingId === app.id}
                            onClick={() => enrollAsStudent(app)}
                            className="px-3 py-1 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded font-semibold hover:bg-[#27272A] disabled:opacity-50"
                          >
                            {enrollingId === app.id ? 'Enrolling...' : 'Enroll Student'}
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#52525B]">No applications found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Submit Admission Application">
        <form onSubmit={handleSubmitApplication} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required placeholder="Applicant Full Name" value={form.applicantName} onChange={e => setForm({ ...form, applicantName: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input type="email" required placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input type="date" required value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select required value={form.programId} onChange={e => {
              const p = programs.find(x => x.id === e.target.value);
              setForm({ ...form, programId: e.target.value, departmentId: p?.departmentId || '' });
            }} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" min={0} max={100} required placeholder="Qualifying Score (%)" value={form.academicScore} onChange={e => setForm({ ...form, academicScore: Number(e.target.value) })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input placeholder="Guardian Name" value={form.guardianName} onChange={e => setForm({ ...form, guardianName: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input placeholder="Guardian Phone" value={form.guardianPhone} onChange={e => setForm({ ...form, guardianPhone: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <input placeholder="Previous School / University" value={form.previousInstitution} onChange={e => setForm({ ...form, previousInstitution: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <textarea rows={2} placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Submit Application</button>
        </form>
      </Modal>
    </div>
  );
};
