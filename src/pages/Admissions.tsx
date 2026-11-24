import React, { useEffect, useState } from 'react';
import { addDoc, arrayUnion, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, getSecondaryAuth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { AdmissionApplication } from '../types';
import { exportToCsv, logAudit, syncPublicProfile } from '../services/erpService';
import { Modal, PageHeader, StatCard, StatusText } from '../components/ui/DataUI';
import { Download, Plus, UserCheck, Users, CheckCircle2, Clock } from 'lucide-react';
import {
  generateCompliantRollNo,
  generateCompliantTempPassword,
  isInWhitelist,
  sanitizeText,
  validateAmount,
  validateEmail,
  validateFreeText,
  validateIsoDate,
  validateName,
  validatePhone
} from '../utils/validation';

const VALID_ADMISSION_STATUSES: AdmissionApplication['status'][] = [
  'applied',
  'under_review',
  'shortlisted',
  'approved',
  'enrolled',
  'rejected'
];

export const Admissions: React.FC = () => {
  const { profile } = useAuth();
  const { programs, classes } = useUniversity();
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
    const errors: Record<string, string> = {};

    const nameErr = validateName(form.applicantName, 'Applicant Full Name');
    if (nameErr) errors.applicantName = nameErr;

    const emailErr = validateEmail(form.email, true);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validatePhone(form.phone, true, 'Phone Number');
    if (phoneErr) errors.phone = phoneErr;

    const dobErr = validateIsoDate(form.dob, true, 'Date of Birth');
    if (dobErr) errors.dob = dobErr;

    if (!form.programId) errors.programId = 'Select a target degree program.';

    const scoreErr = validateAmount(form.academicScore, { min: 0, max: 100, label: 'Qualifying Score (%)' });
    if (scoreErr) errors.academicScore = scoreErr;

    if (form.guardianName.trim()) {
      const gNameErr = validateName(form.guardianName, 'Guardian Name');
      if (gNameErr) errors.guardianName = gNameErr;
    }

    const gPhoneErr = validatePhone(form.guardianPhone, false, 'Guardian Phone');
    if (gPhoneErr) errors.guardianPhone = gPhoneErr;

    const prevInstErr = validateFreeText(form.previousInstitution, { required: false, maxLen: 150, label: 'Previous Institution' });
    if (prevInstErr) errors.previousInstitution = prevInstErr;

    const addrErr = validateFreeText(form.address, { required: false, maxLen: 240, label: 'Address' });
    if (addrErr) errors.address = addrErr;

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const appNo = `ADM-${new Date().getFullYear()}-${String(applications.length + 101).padStart(4, '0')}`;
    const cleanApplicant = sanitizeText(form.applicantName);
    const ref = await addDoc(collection(db, 'admissions'), {
      ...form,
      applicantName: cleanApplicant,
      email: form.email.trim(),
      phone: sanitizeText(form.phone),
      address: sanitizeText(form.address),
      guardianName: sanitizeText(form.guardianName),
      guardianPhone: sanitizeText(form.guardianPhone),
      previousInstitution: sanitizeText(form.previousInstitution),
      notes: sanitizeText(form.notes),
      academicScore: Number(form.academicScore),
      applicationNo: appNo,
      status: 'applied',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_ADMISSION', 'Admissions', ref.id, `New application ${appNo} for ${cleanApplicant}`);
    setShowModal(false);
    setFormErrors({});
    setForm({
      applicantName: '', email: '', phone: '', gender: 'male', dob: '',
      address: '', guardianName: '', guardianPhone: '', programId: '', departmentId: '',
      batchId: '', previousInstitution: '', academicScore: 85, notes: ''
    });
  };

  const updateStatus = async (app: AdmissionApplication, status: AdmissionApplication['status']) => {
    if (!isInWhitelist(status, VALID_ADMISSION_STATUSES)) return;
    await updateDoc(doc(db, 'admissions', app.id), { status, reviewedBy: profile?.name || 'Admissions' });
    await logAudit(profile, 'UPDATE_ADMISSION_STATUS', 'Admissions', app.id, `${app.applicationNo} -> ${status}`);
  };

  const enrollAsStudent = async (app: AdmissionApplication) => {
    setEnrollingId(app.id);
    setFeedback(null);
    try {
      const tempPassword = generateCompliantTempPassword();
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, app.email.trim(), tempPassword);
      const uid = cred.user.uid;
      const rollNo = generateCompliantRollNo();
      const matchedClass = classes.find(c => c.programId === app.programId) || classes[0];

      const userPayload: Record<string, any> = {
        uid,
        name: sanitizeText(app.applicantName),
        email: app.email.trim(),
        phone: sanitizeText(app.phone || ''),
        gender: app.gender || 'other',
        dob: app.dob || '',
        address: sanitizeText(app.address || ''),
        guardianName: sanitizeText(app.guardianName || ''),
        guardianPhone: sanitizeText(app.guardianPhone || ''),
        role: 'student',
        status: 'active',
        rollNo,
        studentId: rollNo,
        programId: app.programId,
        departmentId: app.departmentId || '',
        batchId: app.batchId || '',
        classId: matchedClass?.id || '',
        admissionId: app.id,
        admissionDate: new Date().toISOString().split('T')[0],
        isFirstLogin: true,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', uid), userPayload);
      await syncPublicProfile(uid, userPayload);

      if (matchedClass) {
        await updateDoc(doc(db, 'classes', matchedClass.id), { students: arrayUnion(uid) });
      }

      await addDoc(collection(db, 'invoices'), {
        invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
        studentId: uid,
        studentName: sanitizeText(app.applicantName),
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
      setFeedback(`Enrolled ${app.applicantName} (${app.email}, Roll: ${rollNo}, Temporary password: ${tempPassword}) and generated admission invoice.`);
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setFeedback('Unable to complete enrollment. Verify applicant email uniqueness and permissions.');
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
            <button type="button" onClick={() => { setFormErrors({}); setShowModal(true); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200">
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
          <input maxLength={100} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicant name, email, or application no..." className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
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
        <form onSubmit={handleSubmitApplication} noValidate className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input required maxLength={80} placeholder="Applicant Full Name" value={form.applicantName} onChange={e => setForm({ ...form, applicantName: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {formErrors.applicantName && <p className="mt-1 text-[11px] text-rose-600">{formErrors.applicantName}</p>}
            </div>
            <div>
              <input type="email" required maxLength={254} placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {formErrors.email && <p className="mt-1 text-[11px] text-rose-600">{formErrors.email}</p>}
            </div>
            <div>
              <input required maxLength={15} pattern="^\+?[0-9\s-]{10,15}$" placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {formErrors.phone && <p className="mt-1 text-[11px] text-rose-600">{formErrors.phone}</p>}
            </div>
            <div>
              <input type="date" required value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {formErrors.dob && <p className="mt-1 text-[11px] text-rose-600">{formErrors.dob}</p>}
            </div>
            <div>
              <select required value={form.programId} onChange={e => {
                const p = programs.find(x => x.id === e.target.value);
                setForm({ ...form, programId: e.target.value, departmentId: p?.departmentId || '' });
              }} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {formErrors.programId && <p className="mt-1 text-[11px] text-rose-600">{formErrors.programId}</p>}
            </div>
            <div>
              <input type="number" min={0} max={100} required placeholder="Qualifying Score (%)" value={form.academicScore} onChange={e => setForm({ ...form, academicScore: Number(e.target.value) })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {formErrors.academicScore && <p className="mt-1 text-[11px] text-rose-600">{formErrors.academicScore}</p>}
            </div>
            <div>
              <input maxLength={80} placeholder="Guardian Name" value={form.guardianName} onChange={e => setForm({ ...form, guardianName: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {formErrors.guardianName && <p className="mt-1 text-[11px] text-rose-600">{formErrors.guardianName}</p>}
            </div>
            <div>
              <input maxLength={15} placeholder="Guardian Phone" value={form.guardianPhone} onChange={e => setForm({ ...form, guardianPhone: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {formErrors.guardianPhone && <p className="mt-1 text-[11px] text-rose-600">{formErrors.guardianPhone}</p>}
            </div>
          </div>
          <div>
            <input maxLength={150} placeholder="Previous School / University" value={form.previousInstitution} onChange={e => setForm({ ...form, previousInstitution: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            {formErrors.previousInstitution && <p className="mt-1 text-[11px] text-rose-600">{formErrors.previousInstitution}</p>}
          </div>
          <div>
            <textarea rows={2} maxLength={240} placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            {formErrors.address && <p className="mt-1 text-[11px] text-rose-600">{formErrors.address}</p>}
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Submit Application</button>
        </form>
      </Modal>
    </div>
  );
};
