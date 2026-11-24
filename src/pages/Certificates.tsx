import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Award, CheckCircle2, FileCheck2, Plus, Printer } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { Modal, PageHeader, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { CertificateRequest } from '../types';

export const Certificates: React.FC = () => {
  const { profile, isStudent, can } = useAuth();
  const { university } = useUniversity();
  const canManage = can('certificates.manage');

  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reqModal, setReqModal] = useState(false);
  const [certType, setCertType] = useState<CertificateRequest['type']>('bonafide');
  const [purpose, setPurpose] = useState('');
  const [printCert, setPrintCert] = useState<CertificateRequest | null>(null);

  useEffect(() => {
    const reqQ = canManage
      ? collection(db, 'certificateRequests')
      : profile?.uid
      ? query(collection(db, 'certificateRequests'), where('studentId', '==', profile.uid))
      : null;
    if (!reqQ) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      reqQ,
      s => {
        setRequests(s.docs.map(d => ({ id: d.id, ...d.data() } as CertificateRequest)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [canManage, profile?.uid]);

  const visibleRequests = useMemo(() => {
    return canManage ? requests : requests.filter(r => r.studentId === profile?.uid);
  }, [requests, canManage, profile?.uid]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const certNo = `CERT-${Date.now().toString().slice(-6)}`;
    const ref = await addDoc(collection(db, 'certificateRequests'), {
      certificateNo: certNo,
      studentId: profile.uid,
      studentName: profile.name,
      rollNo: profile.rollNo || '',
      type: certType,
      status: 'requested',
      purpose,
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'REQUEST_CERTIFICATE', 'Certificates', ref.id, `${certType} (${certNo})`);
    setReqModal(false);
    setPurpose('');
  };

  const handleIssue = async (req: CertificateRequest, status: 'approved' | 'issued' | 'rejected') => {
    await updateDoc(doc(db, 'certificateRequests', req.id), {
      status,
      issuedAt: status === 'issued' ? new Date().toISOString().split('T')[0] : null,
      issuedBy: profile?.name || profile?.uid
    });
    await logAudit(profile, `CERTIFICATE_${status.toUpperCase()}`, 'Certificates', req.id, `${req.studentName} · ${req.type}`);
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates & Official Documents"
        subtitle="Request, verify, and issue bonafide, migration, degree, character, and transcript certificates."
        actions={
          <button type="button" onClick={() => setReqModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
            <Plus className="w-3.5 h-3.5" /> Request Certificate
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={visibleRequests.length} icon={FileCheck2} tone="indigo" />
        <StatCard label="Pending Review" value={visibleRequests.filter(r => r.status === 'requested').length} icon={Award} tone="amber" />
        <StatCard label="Issued Certificates" value={visibleRequests.filter(r => r.status === 'issued').length} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
        {visibleRequests.map(r => (
          <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-[#111111] dark:text-zinc-200">{r.certificateNo}</span>
                <span className="capitalize font-semibold text-sm">{r.type.replace('_', ' ')} Certificate</span>
                <StatusText status={r.status} />
              </div>
              <p className="text-xs text-[#52525B] mt-0.5">{r.studentName} {r.rollNo ? `(${r.rollNo})` : ''} · Purpose: {r.purpose}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.status === 'issued' && (
                <button onClick={() => setPrintCert(r)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <Printer className="w-3.5 h-3.5" /> View / Print
                </button>
              )}
              {canManage && r.status === 'requested' && (
                <>
                  <button onClick={() => handleIssue(r, 'issued')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Approve & Issue</button>
                  <button onClick={() => handleIssue(r, 'rejected')} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600">Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
        {visibleRequests.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No certificate requests found.</p>}
      </div>

      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Request Official Certificate">
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Document Type</label>
            <select value={certType} onChange={e => setCertType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="bonafide">Bonafide Student Certificate</option>
              <option value="transcript">Official Grade Transcript</option>
              <option value="character">Character Certificate</option>
              <option value="migration">Migration Certificate</option>
              <option value="degree">Provisional Degree Certificate</option>
              <option value="course_completion">Course Completion Certificate</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Purpose / Authority</label>
            <textarea required rows={3} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Education loan application, Passport verification, Internship..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReqModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Request</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!printCert} onClose={() => setPrintCert(null)} title="Official University Certificate" maxWidth="max-w-2xl">
        {printCert && (
          <div className="space-y-5 p-4 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl">
            <div className="text-center border-b border-zinc-200 dark:border-zinc-700 pb-4">
              <h3 className="text-xl font-bold">{university.name}</h3>
              <p className="text-xs text-[#52525B]">{university.accreditation} · {university.address}</p>
              <p className="text-sm font-bold uppercase tracking-wider text-[#111111] dark:text-zinc-200 mt-3">
                {printCert.type.replace('_', ' ')} Certificate
              </p>
            </div>
            <p className="text-sm leading-relaxed">
              This is to certify that <strong>{printCert.studentName}</strong>
              {printCert.rollNo ? ` (Roll No: ${printCert.rollNo})` : ''} is a bonafide student of{' '}
              <strong>{university.name}</strong>. This document is issued on official request for the purpose of{' '}
              <em>{printCert.purpose}</em>.
            </p>
            <div className="flex items-center justify-between text-xs text-[#52525B] pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <span className="font-mono">Serial: {printCert.certificateNo}</span>
              <span>Issued: {printCert.issuedAt || new Date().toISOString().split('T')[0]} · By {printCert.issuedBy || 'Registrar Office'}</span>
            </div>
            <div className="flex justify-end print:hidden">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
                <Printer className="w-3.5 h-3.5" /> Print Certificate
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
