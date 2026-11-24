import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { DEFAULT_APPROVAL_WORKFLOWS } from '../config/rbac';
import { ApprovalProcessType, ApprovalRequest } from '../types';
import { logAudit } from '../services/erpService';
import { Modal, PageHeader, StatCard, StatusText } from '../components/ui/DataUI';
import { CheckCircle2, Clock, FileCheck2, Plus, XCircle } from 'lucide-react';

export const ApprovalsInbox: React.FC = () => {
  const { profile, normalizedRole, isAdmin } = useAuth();
  const { approvalRequests, approvalWorkflows, employees } = useUniversity();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'escalated'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [delegateModal, setDelegateModal] = useState<ApprovalRequest | null>(null);
  const [delegateUid, setDelegateUid] = useState('');
  const [comment, setComment] = useState('');

  const [form, setForm] = useState({
    processType: 'leave_request' as ApprovalProcessType,
    title: '',
    description: '',
    amount: 0
  });

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const wf = approvalWorkflows.find(w => w.processType === form.processType) || DEFAULT_APPROVAL_WORKFLOWS.find(w => w.processType === form.processType);
    const stages = wf?.stages || [{ stageOrder: 1, stageName: 'Admin Approval', approverRole: 'university_admin' }];

    const ref = await addDoc(collection(db, 'approvalRequests'), {
      ...form,
      requesterId: profile.uid,
      requesterName: profile.name,
      requesterRole: profile.role,
      departmentId: profile.departmentId || '',
      officeId: profile.officeId || '',
      currentStageIndex: 0,
      stages,
      status: 'pending',
      history: [{
        stageName: 'Submission',
        actorId: profile.uid,
        actorName: profile.name,
        actorRole: profile.role,
        action: 'submitted',
        comment: 'Request submitted into workflow',
        timestamp: new Date().toISOString()
      }],
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'SUBMIT_APPROVAL_REQUEST', 'Approvals', ref.id, `${form.processType}: ${form.title}`);
    setShowCreate(false);
    setForm({ processType: 'leave_request', title: '', description: '', amount: 0 });
  };

  const canActOnStage = (req: ApprovalRequest) => {
    if (req.status !== 'pending' && req.status !== 'escalated') return false;
    if (isAdmin) return true;
    if (req.delegatedToUid === profile?.uid) return true;
    const stage = req.stages[req.currentStageIndex];
    if (!stage) return false;
    const userRoles = [normalizedRole, ...(profile?.roles || [])];
    return userRoles.includes(stage.approverRole);
  };

  const handleDecision = async (req: ApprovalRequest, decision: 'approved' | 'rejected' | 'escalated') => {
    if (!profile) return;
    const currentStage = req.stages[req.currentStageIndex];
    const historyItem = {
      stageName: currentStage?.stageName || 'Review',
      actorId: profile.uid,
      actorName: profile.name,
      actorRole: profile.role,
      action: decision,
      comment: comment || `Marked ${decision}`,
      timestamp: new Date().toISOString()
    };

    let nextStatus = req.status;
    let nextStageIndex = req.currentStageIndex;

    if (decision === 'rejected') {
      nextStatus = 'rejected';
    } else if (decision === 'escalated') {
      nextStatus = 'escalated';
    } else if (decision === 'approved') {
      if (req.currentStageIndex + 1 < req.stages.length) {
        nextStageIndex = req.currentStageIndex + 1;
        nextStatus = 'pending';
      } else {
        nextStatus = 'approved';
      }
    }

    await updateDoc(doc(db, 'approvalRequests', req.id), {
      status: nextStatus,
      currentStageIndex: nextStageIndex,
      history: [...(req.history || []), historyItem]
    });
    await logAudit(profile, `APPROVAL_${decision.toUpperCase()}`, 'Approvals', req.id, `${req.title} -> ${nextStatus}`);
    setComment('');
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateModal || !delegateUid || !profile) return;
    const target = employees.find(emp => emp.uid === delegateUid);
    await updateDoc(doc(db, 'approvalRequests', delegateModal.id), {
      delegatedToUid: delegateUid,
      history: [...(delegateModal.history || []), {
        stageName: delegateModal.stages[delegateModal.currentStageIndex]?.stageName || 'Delegation',
        actorId: profile.uid,
        actorName: profile.name,
        actorRole: profile.role,
        action: 'delegated',
        comment: `Delegated to ${target?.name || delegateUid}`,
        timestamp: new Date().toISOString()
      }]
    });
    setDelegateModal(null);
    setDelegateUid('');
  };

  const filtered = approvalRequests.filter(r => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Workflows Inbox"
        subtitle="Multi-stage institutional approval engine for registration, course changes, leave, marks, refunds, scholarships, and onboarding."
        actions={
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Submit Approval Request
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Pending Review" value={approvalRequests.filter(r => r.status === 'pending').length} icon={Clock} tone="amber" />
        <StatCard label="Approved" value={approvalRequests.filter(r => r.status === 'approved').length} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Rejected" value={approvalRequests.filter(r => r.status === 'rejected').length} icon={XCircle} tone="rose" />
        <StatCard label="Total Requests" value={approvalRequests.length} icon={FileCheck2} tone="indigo" />
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected', 'escalated'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize border ${filter === f ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white border-[#111111] dark:border-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map(req => {
          const currentStage = req.stages?.[req.currentStageIndex];
          const actionable = canActOnStage(req);
          return (
            <div key={req.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#52525B]">
                    <span className="font-mono uppercase">{req.processType.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>Requested by {req.requesterName}</span>
                    {req.amount ? <><span>·</span><span className="font-mono">₹{req.amount.toLocaleString()}</span></> : null}
                  </div>
                  <h3 className="text-sm font-semibold mt-1">{req.title}</h3>
                  <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1">{req.description}</p>
                </div>
                <StatusText status={req.status} />
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                {req.stages?.map((st, idx) => (
                  <span key={st.stageOrder} className={`px-2.5 py-1 rounded border ${
                    idx < req.currentStageIndex || req.status === 'approved'
                      ? 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-zinc-200'
                      : idx === req.currentStageIndex && req.status === 'pending'
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-zinc-200 font-semibold'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[#52525B]'
                  }`}>
                    {st.stageOrder}. {st.stageName} ({st.approverRole})
                  </span>
                ))}
              </div>

              {actionable && (
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Decision note (optional)..." className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  <button onClick={() => handleDecision(req, 'approved')} className="px-3 py-1.5 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg">Approve Stage</button>
                  <button onClick={() => handleDecision(req, 'rejected')} className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg">Reject</button>
                  <button onClick={() => handleDecision(req, 'escalated')} className="px-3 py-1.5 text-xs font-semibold bg-[#27272A] text-white rounded-lg">Escalate</button>
                  <button onClick={() => setDelegateModal(req)} className="px-3 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-lg">Delegate</button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="p-10 text-center text-xs text-[#52525B] bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">No approval requests in this view.</div>}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Submit Institutional Approval Request">
        <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
          <select value={form.processType} onChange={e => setForm({ ...form, processType: e.target.value as ApprovalProcessType })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            {DEFAULT_APPROVAL_WORKFLOWS.map(w => <option key={w.processType} value={w.processType}>{w.name}</option>)}
          </select>
          <input required placeholder="Request Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <input type="number" placeholder="Financial Amount (if applicable)" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <textarea required rows={3} placeholder="Justification & details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Submit into Workflow</button>
        </form>
      </Modal>

      <Modal open={!!delegateModal} onClose={() => setDelegateModal(null)} title="Delegate Approval Authority">
        <form onSubmit={handleDelegate} className="space-y-3 text-xs">
          <select required value={delegateUid} onChange={e => setDelegateUid(e.target.value)} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <option value="">Select Delegated Approver</option>
            {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name} ({emp.role})</option>)}
          </select>
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Confirm Delegation</button>
        </form>
      </Modal>
    </div>
  );
};
