import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  Award,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { exportToCsv, logAudit } from '../services/erpService';
import { ApprovalRequest, FeeStructure, Invoice, Payment, Scholarship, ScholarshipApplication } from '../types';

export const Finance: React.FC = () => {
  const { profile, isStudent, isParent, can, canViewField } = useAuth();
  const { university, students, programs, departments, semesters, users } = useUniversity();

  const canManageFinance = can('finance.manage');
  const canManageScholarships = can('scholarships.manage');
  const allowFinancials = isStudent || isParent || canViewField('financials') || canManageFinance;

  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [schApps, setSchApps] = useState<ScholarshipApplication[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refundApprovals, setRefundApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('invoices');
  const [banner, setBanner] = useState<string | null>(null);

  // Fee Structure Modal
  const [feeModal, setFeeModal] = useState(false);
  const [feeName, setFeeName] = useState('');
  const [feeCategory, setFeeCategory] = useState<FeeStructure['category']>('tuition');
  const [feeAmount, setFeeAmount] = useState(50000);
  const [feeDueDate, setFeeDueDate] = useState('');
  const [feeLatePerDay, setFeeLatePerDay] = useState(50);
  const [feeProgId, setFeeProgId] = useState('');
  const [feeDesc, setFeeDesc] = useState('');

  // Invoice Modal
  const [invModal, setInvModal] = useState(false);
  const [invStudentId, setInvStudentId] = useState('');
  const [invFeeId, setInvFeeId] = useState('');
  const [invTitle, setInvTitle] = useState('');
  const [invCategory, setInvCategory] = useState('tuition');
  const [invBaseAmount, setInvBaseAmount] = useState(50000);
  const [invDueDate, setInvDueDate] = useState('');

  // Payment Modal
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<Payment['method']>('upi');
  const [payRef, setPayRef] = useState('');

  // Refund Modals (Staff direct refund & Student request)
  const [refundModalPay, setRefundModalPay] = useState<Payment | null>(null);
  const [refundReasonInput, setRefundReasonInput] = useState('Withdrawal / Fee Adjustment');
  const [studentRefundPay, setStudentRefundPay] = useState<Payment | null>(null);
  const [studentRefundReason, setStudentRefundReason] = useState('');

  // Receipt Modal
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Scholarship Modals
  const [schModal, setSchModal] = useState(false);
  const [schName, setSchName] = useState('');
  const [schCode, setSchCode] = useState('');
  const [schType, setSchType] = useState<Scholarship['type']>('merit');
  const [schDiscountType, setSchDiscountType] = useState<Scholarship['discountType']>('percentage');
  const [schValue, setSchValue] = useState(25);
  const [schCriteria, setSchCriteria] = useState('');

  const [schApplyTarget, setSchApplyTarget] = useState<Scholarship | null>(null);
  const [schStatement, setSchStatement] = useState('');

  const linkedStudent = useMemo(() => {
    if (!isParent || !profile?.parentOfStudentIds?.length) return null;
    return users.find(u => profile.parentOfStudentIds?.includes(u.uid)) || null;
  }, [isParent, profile?.parentOfStudentIds, users]);

  const targetStudentUid = isStudent ? profile?.uid : isParent ? linkedStudent?.uid : undefined;

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'feeStructures'),
      s => {
        setFeeStructures(s.docs.map(d => ({ id: d.id, ...d.data() } as FeeStructure)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = onSnapshot(collection(db, 'scholarships'), s => setScholarships(s.docs.map(d => ({ id: d.id, ...d.data() } as Scholarship))), () => {});

    const schAppQ = targetStudentUid
      ? query(collection(db, 'scholarshipApplications'), where('studentId', '==', targetStudentUid))
      : collection(db, 'scholarshipApplications');
    const invQ = targetStudentUid
      ? query(collection(db, 'invoices'), where('studentId', '==', targetStudentUid))
      : collection(db, 'invoices');
    const payQ = targetStudentUid
      ? query(collection(db, 'payments'), where('studentId', '==', targetStudentUid))
      : collection(db, 'payments');
    const refQ = targetStudentUid
      ? query(collection(db, 'approvalRequests'), where('requesterId', '==', targetStudentUid))
      : collection(db, 'approvalRequests');

    const u3 = onSnapshot(schAppQ, s => setSchApps(s.docs.map(d => ({ id: d.id, ...d.data() } as ScholarshipApplication))), () => {});
    const u4 = onSnapshot(invQ, s => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))), () => {});
    const u5 = onSnapshot(payQ, s => setPayments(s.docs.map(d => ({ id: d.id, ...d.data() } as Payment))), () => {});
    const u6 = onSnapshot(
      refQ,
      s => {
        setRefundApprovals(
          s.docs
            .map(d => ({ id: d.id, ...d.data() } as ApprovalRequest))
            .filter(a => a.processType === 'fee_refund')
        );
      },
      () => {}
    );
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [targetStudentUid]);

  const visibleInvoices = useMemo(() => {
    return targetStudentUid ? invoices.filter(i => i.studentId === targetStudentUid) : invoices;
  }, [invoices, targetStudentUid]);

  const visiblePayments = useMemo(() => {
    return targetStudentUid ? payments.filter(p => p.studentId === targetStudentUid) : payments;
  }, [payments, targetStudentUid]);

  const visibleSchApps = useMemo(() => {
    return targetStudentUid ? schApps.filter(a => a.studentId === targetStudentUid) : schApps;
  }, [schApps, targetStudentUid]);

  const stats = useMemo(() => {
    const billed = visibleInvoices.filter(i => i.status !== 'refunded').reduce((a, b) => a + (b.totalAmount || 0), 0);
    const collected = visibleInvoices.filter(i => i.status !== 'refunded').reduce((a, b) => a + (b.paidAmount || 0), 0);
    const pending = Math.max(0, billed - collected);
    return { billed, collected, pending };
  }, [visibleInvoices]);

  if (!allowFinancials) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Financial Records Restricted"
        description="Your assigned RBAC role restricts access to university billing, student fee invoices, and payment ledgers."
      />
    );
  }

  const currency = university.currency || 'INR';

  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'feeStructures'), {
      name: feeName,
      category: feeCategory,
      amount: Number(feeAmount),
      dueDate: feeDueDate,
      lateFeePerDay: Number(feeLatePerDay) || 0,
      programId: feeProgId || null,
      description: feeDesc
    });
    await logAudit(profile, 'CREATE_FEE_STRUCTURE', 'Finance', ref.id, `${feeName} (${currency} ${feeAmount})`);
    setFeeModal(false);
    setFeeName('');
    setBanner('Fee structure created.');
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const stu = students.find(s => s.uid === invStudentId);
    if (!stu) return;

    // Auto-calculate approved scholarship discount for this student
    const approvedApp = schApps.find(a => a.studentId === stu.uid && a.status === 'approved');
    const sch = approvedApp ? scholarships.find(s => s.id === approvedApp.scholarshipId) : null;
    let discountAmount = 0;
    if (sch) {
      discountAmount = sch.discountType === 'percentage' ? Math.round((invBaseAmount * sch.value) / 100) : Math.min(invBaseAmount, sch.value);
    }
    const totalAmount = Math.max(0, invBaseAmount - discountAmount);
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;

    const ref = await addDoc(collection(db, 'invoices'), {
      invoiceNo,
      studentId: stu.uid,
      studentName: stu.name,
      rollNo: stu.rollNo || '',
      feeStructureId: invFeeId || null,
      title: invTitle,
      category: invCategory,
      baseAmount: Number(invBaseAmount),
      discountAmount,
      scholarshipName: sch?.name || null,
      lateFeeAmount: 0,
      totalAmount,
      paidAmount: 0,
      dueDate: invDueDate,
      status: totalAmount === 0 ? 'paid' : 'unpaid',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_INVOICE', 'Finance', ref.id, `${invoiceNo} for ${stu.name} (${currency} ${totalAmount})`);
    setInvModal(false);
    setBanner(`Invoice ${invoiceNo} generated.`);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice || payAmount <= 0) return;
    const remaining = Math.max(0, payInvoice.totalAmount - (payInvoice.paidAmount || 0));
    const appliedAmount = Math.min(Number(payAmount), remaining);
    if (appliedAmount <= 0) return;

    const receiptNo = `RCPT-${Date.now().toString().slice(-6)}`;
    const newPaid = (payInvoice.paidAmount || 0) + appliedAmount;
    const newStatus: Invoice['status'] = newPaid >= payInvoice.totalAmount ? 'paid' : 'partial';

    const ref = await addDoc(collection(db, 'payments'), {
      receiptNo,
      invoiceId: payInvoice.id,
      invoiceNo: payInvoice.invoiceNo,
      studentId: payInvoice.studentId,
      studentName: payInvoice.studentName,
      amount: appliedAmount,
      method: payMethod,
      transactionRef: payRef || `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: 'completed',
      collectedBy: profile?.name || profile?.uid,
      paidAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'invoices', payInvoice.id), {
      paidAmount: newPaid,
      status: newStatus
    });
    await logAudit(profile, 'RECORD_PAYMENT', 'Finance', ref.id, `${receiptNo} · ${payInvoice.studentName} (${currency} ${appliedAmount})`);
    setPayInvoice(null);
    setPayRef('');
    setBanner(`Payment receipt ${receiptNo} recorded.`);
  };

  const handleRefundPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalPay || !refundReasonInput.trim()) return;
    const pay = refundModalPay;
    const reason = refundReasonInput.trim();
    await updateDoc(doc(db, 'payments', pay.id), { status: 'refunded', refundReason: reason });
    const inv = invoices.find(i => i.id === pay.invoiceId);
    if (inv) {
      const nextPaid = Math.max(0, (inv.paidAmount || 0) - pay.amount);
      await updateDoc(doc(db, 'invoices', inv.id), {
        paidAmount: nextPaid,
        status: nextPaid === 0 ? 'refunded' : 'partial'
      });
    }
    await logAudit(profile, 'REFUND_PAYMENT', 'Finance', pay.id, `${pay.receiptNo} refunded (${currency} ${pay.amount}): ${reason}`);
    setRefundModalPay(null);
    setRefundReasonInput('Withdrawal / Fee Adjustment');
    setBanner(`Payment ${pay.receiptNo} marked as refunded.`);
  };

  const handleStudentRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRefundPay || !profile || !studentRefundReason.trim()) return;
    const ref = await addDoc(collection(db, 'approvalRequests'), {
      processType: 'fee_refund',
      title: `Fee Refund Request: ${studentRefundPay.receiptNo}`,
      description: `Receipt ${studentRefundPay.receiptNo} (${currency} ${studentRefundPay.amount.toLocaleString()}): ${studentRefundReason.trim()}`,
      requesterId: profile.uid,
      requesterName: profile.name,
      requesterRole: profile.role,
      targetEntityId: studentRefundPay.id,
      targetCollection: 'payments',
      amount: studentRefundPay.amount,
      currentStageIndex: 0,
      stages: [
        { stageOrder: 1, stageName: 'Accounts Officer Review', approverRole: 'accountant' },
        { stageOrder: 2, stageName: 'Finance Director Approval', approverRole: 'finance_director' }
      ],
      status: 'pending',
      history: [
        {
          stageName: 'Submitted',
          actorId: profile.uid,
          actorName: profile.name,
          actorRole: profile.role,
          action: 'submitted',
          comment: studentRefundReason.trim(),
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'REQUEST_FEE_REFUND', 'Finance', ref.id, `${studentRefundPay.receiptNo} (${currency} ${studentRefundPay.amount})`);
    setStudentRefundPay(null);
    setStudentRefundReason('');
    setBanner(`Refund request submitted for receipt ${studentRefundPay.receiptNo}.`);
  };

  const handleCreateScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'scholarships'), {
      name: schName,
      code: schCode,
      type: schType,
      discountType: schDiscountType,
      value: Number(schValue),
      eligibilityCriteria: schCriteria,
      status: 'active'
    });
    await logAudit(profile, 'CREATE_SCHOLARSHIP', 'Finance', ref.id, schName);
    setSchModal(false);
    setSchName('');
    setSchCode('');
    setBanner('Scholarship program created.');
  };

  const handleApplyScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schApplyTarget || !profile) return;
    await addDoc(collection(db, 'scholarshipApplications'), {
      scholarshipId: schApplyTarget.id,
      scholarshipName: schApplyTarget.name,
      studentId: profile.uid,
      studentName: profile.name,
      statement: schStatement,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    setSchApplyTarget(null);
    setSchStatement('');
    setBanner('Scholarship application submitted.');
  };

  const handleReviewScholarship = async (app: ScholarshipApplication, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'scholarshipApplications', app.id), {
      status,
      reviewedBy: profile?.name || profile?.uid
    });
    await logAudit(profile, `SCHOLARSHIP_${status.toUpperCase()}`, 'Finance', app.id, `${app.studentName} · ${app.scholarshipName}`);
    setBanner(`Scholarship application ${status}.`);
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance, Fees & Scholarships"
        subtitle="Institutional fee structures, student invoices, payment receipts, refunds, and scholarship awards."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  'finance_invoices.csv',
                  visibleInvoices.map(i => ({
                    InvoiceNo: i.invoiceNo,
                    Student: i.studentName,
                    RollNo: i.rollNo || '',
                    Title: i.title,
                    Category: i.category,
                    Base: i.baseAmount,
                    Discount: i.discountAmount,
                    Total: i.totalAmount,
                    Paid: i.paidAmount,
                    DueDate: i.dueDate,
                    Status: i.status
                  }))
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <Download className="w-3.5 h-3.5" /> Export Ledger
            </button>
            {canManageFinance && (
              <>
                <button
                  type="button"
                  onClick={() => setFeeModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                >
                  <Plus className="w-3.5 h-3.5" /> Fee Structure
                </button>
                <button
                  type="button"
                  onClick={() => { setInvStudentId(students[0]?.uid || ''); setInvModal(true); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Generate Invoice
                </button>
              </>
            )}
          </div>
        }
      />

      {banner && (
        <div className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs text-[#111111] dark:text-zinc-200 flex justify-between">
          <span className="font-medium">{banner}</span>
          <button onClick={() => setBanner(null)} className="underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Billed" value={`${currency} ${stats.billed.toLocaleString()}`} icon={FileText} tone="indigo" />
        <StatCard label="Total Collected" value={`${currency} ${stats.collected.toLocaleString()}`} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Outstanding Balance" value={`${currency} ${stats.pending.toLocaleString()}`} icon={Wallet} tone={stats.pending > 0 ? 'amber' : 'default'} />
        <StatCard label="Active Scholarships" value={scholarships.filter(s => s.status === 'active').length} icon={Award} />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'invoices', label: 'Invoices & Dues', count: visibleInvoices.length },
          { id: 'payments', label: 'Payment Receipts', count: visiblePayments.length },
          { id: 'structures', label: 'Fee Structures', count: feeStructures.length },
          { id: 'scholarships', label: 'Scholarships', count: scholarships.length }
        ]}
      />

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Invoice</th>
                  {!targetStudentUid && <th className="py-3 px-4 font-semibold">Student</th>}
                  <th className="py-3 px-4 font-semibold">Fee Title</th>
                  <th className="py-3 px-4 font-semibold">Net Payable</th>
                  <th className="py-3 px-4 font-semibold">Paid</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {visibleInvoices.map(inv => {
                  const balance = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
                  return (
                    <tr key={inv.id}>
                      <td className="py-3 px-4 font-mono text-xs font-semibold">{inv.invoiceNo}</td>
                      {!targetStudentUid && <td className="py-3 px-4 font-medium">{inv.studentName} <span className="text-xs font-mono text-zinc-400">{inv.rollNo}</span></td>}
                      <td className="py-3 px-4">
                        <p className="font-medium">{inv.title}</p>
                        {inv.discountAmount > 0 && <p className="text-[11px] text-[#111111] dark:text-zinc-200">Scholarship: -{currency} {inv.discountAmount.toLocaleString()}</p>}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">{currency} {inv.totalAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-[#111111] dark:text-zinc-200">{currency} {(inv.paidAmount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-xs">{inv.dueDate}</td>
                      <td className="py-3 px-4"><StatusText status={inv.status} /></td>
                      <td className="py-3 px-4 text-right">
                        {balance > 0 && (canManageFinance || isStudent || isParent) && (
                          <button
                            type="button"
                            onClick={() => { setPayInvoice(inv); setPayAmount(balance); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> {canManageFinance ? 'Record Payment' : 'Pay Now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleInvoices.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-zinc-400">No invoices generated yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                    <th className="py-3 px-4 font-semibold">Receipt No</th>
                    {!targetStudentUid && <th className="py-3 px-4 font-semibold">Student</th>}
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Method & Ref</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                  {visiblePayments.map(p => (
                    <tr key={p.id}>
                      <td className="py-3 px-4 font-mono text-xs font-semibold">{p.receiptNo}</td>
                      {!targetStudentUid && <td className="py-3 px-4 font-medium">{p.studentName}</td>}
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold">{currency} {p.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs"><span className="uppercase">{p.method.replace('_', ' ')}</span> · <span className="font-mono text-zinc-400">{p.transactionRef}</span></td>
                      <td className="py-3 px-4"><StatusText status={p.status} /></td>
                      <td className="py-3 px-4 text-right space-x-3">
                        <button type="button" onClick={() => setReceiptPayment(p)} className="text-xs text-[#111111] dark:text-zinc-200 hover:underline inline-flex items-center gap-1">
                          <Printer className="w-3.5 h-3.5" /> Receipt
                        </button>
                        {canManageFinance && p.status === 'completed' && (
                          <button type="button" onClick={() => setRefundModalPay(p)} className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5" /> Refund
                          </button>
                        )}
                        {isStudent && p.status === 'completed' && (
                          <button type="button" onClick={() => setStudentRefundPay(p)} className="text-xs text-[#27272A] dark:text-zinc-300 hover:underline inline-flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5" /> Request Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visiblePayments.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-xs text-zinc-400">No payments recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {refundApprovals.filter(a => !targetStudentUid || a.requesterId === targetStudentUid).length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
              <h3 className="text-sm font-semibold mb-3">Fee Refund Requests</h3>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {refundApprovals
                  .filter(a => !targetStudentUid || a.requesterId === targetStudentUid)
                  .map(req => (
                    <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{req.title}</p>
                        <p className="text-xs text-[#52525B]">{req.description}</p>
                      </div>
                      <StatusText status={req.status} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fee Structures */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feeStructures.map(f => (
            <div key={f.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between text-xs text-[#52525B]">
                  <span className="uppercase font-mono">{f.category}</span>
                  <span>Due: {f.dueDate || 'Flexible'}</span>
                </div>
                <h3 className="text-base font-semibold mt-1">{f.name}</h3>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#111111] dark:text-zinc-200 mt-2">
                  {currency} {f.amount.toLocaleString()}
                </p>
                <p className="text-xs text-[#52525B] mt-2">{f.description}</p>
              </div>
              {canManageFinance && (
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setInvFeeId(f.id);
                      setInvTitle(f.name);
                      setInvCategory(f.category);
                      setInvBaseAmount(f.amount);
                      setInvDueDate(f.dueDate);
                      setInvStudentId(students[0]?.uid || '');
                      setInvModal(true);
                    }}
                    className="font-medium text-[#111111] dark:text-zinc-200 hover:underline"
                  >
                    Bill to Student
                  </button>
                  <button type="button" onClick={() => deleteDoc(doc(db, 'feeStructures', f.id))} className="text-rose-500 hover:underline">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {feeStructures.length === 0 && (
            <div className="col-span-full">
              <EmptyState title="No Fee Structures" description="Define tuition, hostel, exam, or lab fee templates." />
            </div>
          )}
        </div>
      )}

      {/* Scholarships */}
      {activeTab === 'scholarships' && (
        <div className="space-y-5">
          {canManageScholarships && (
            <div className="flex justify-end">
              <button type="button" onClick={() => setSchModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
                <Plus className="w-3.5 h-3.5" /> New Scholarship Program
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scholarships.map(s => (
              <div key={s.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#52525B]">
                    <span className="font-mono">{s.code}</span>
                    <StatusText status={s.status} />
                  </div>
                  <h3 className="text-base font-semibold mt-1">{s.name}</h3>
                  <p className="text-xl font-bold font-mono text-[#111111] dark:text-zinc-200 mt-1">
                    {s.discountType === 'percentage' ? `${s.value}% Tuition Waiver` : `${currency} ${s.value.toLocaleString()} Grant`}
                  </p>
                  <p className="text-xs text-[#52525B] mt-2">{s.eligibilityCriteria}</p>
                </div>
                {isStudent && s.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => setSchApplyTarget(s)}
                    className="w-full py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
                  >
                    Apply for Scholarship
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-3">Scholarship Applications</h3>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleSchApps.map(app => (
                <div key={app.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{app.studentName} · <span className="text-[#111111] dark:text-zinc-200">{app.scholarshipName}</span></p>
                    <p className="text-xs text-[#52525B] mt-0.5">{app.statement}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusText status={app.status} />
                    {canManageScholarships && app.status === 'pending' && (
                      <>
                        <button onClick={() => handleReviewScholarship(app, 'approved')} className="px-3 py-1 text-xs font-semibold rounded-md bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Approve</button>
                        <button onClick={() => handleReviewScholarship(app, 'rejected')} className="px-3 py-1 text-xs font-semibold rounded-md border border-rose-200 text-rose-600">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {visibleSchApps.length === 0 && <p className="py-6 text-center text-xs text-zinc-400">No scholarship applications found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Fee Structure Modal */}
      <Modal open={feeModal} onClose={() => setFeeModal(false)} title="Create Fee Structure">
        <form onSubmit={handleSaveFeeStructure} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Fee Name</label>
              <input type="text" required value={feeName} onChange={e => setFeeName(e.target.value)} placeholder="Semester II Tuition" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select value={feeCategory} onChange={e => setFeeCategory(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="tuition">Tuition</option>
                <option value="semester">Semester Fee</option>
                <option value="admission">Admission Fee</option>
                <option value="exam">Examination Fee</option>
                <option value="hostel">Hostel Fee</option>
                <option value="transport">Transport Fee</option>
                <option value="lab">Lab Fee</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Amount ({currency})</label>
              <input type="number" required min={0} value={feeAmount} onChange={e => setFeeAmount(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Due Date</label>
              <input type="date" required value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <input type="text" value={feeDesc} onChange={e => setFeeDesc(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFeeModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Fee Structure</button>
          </div>
        </form>
      </Modal>

      {/* Generate Invoice Modal */}
      <Modal open={invModal} onClose={() => setInvModal(false)} title="Generate Student Invoice" subtitle="Automatically applies any approved student scholarship waiver.">
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Student</label>
            <select required value={invStudentId} onChange={e => setInvStudentId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Student</option>
              {students.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.rollNo || s.email})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Invoice Title</label>
              <input type="text" required value={invTitle} onChange={e => setInvTitle(e.target.value)} placeholder="Semester Tuition" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Base Amount ({currency})</label>
              <input type="number" required min={0} value={invBaseAmount} onChange={e => setInvBaseAmount(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Due Date</label>
            <input type="date" required value={invDueDate} onChange={e => setInvDueDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setInvModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Issue Invoice</button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={!!payInvoice} onClose={() => setPayInvoice(null)} title={`Pay Invoice ${payInvoice?.invoiceNo || ''}`} subtitle={payInvoice?.studentName}>
        {payInvoice && (() => {
          const remaining = Math.max(0, payInvoice.totalAmount - (payInvoice.paidAmount || 0));
          const halfInstallment = Math.max(1, Math.round(remaining / 2));
          return (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(remaining)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
                >
                  Full Balance ({currency} {remaining.toLocaleString()})
                </button>
                {remaining >= 100 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(halfInstallment)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-slate-800"
                  >
                    50% Installment ({currency} {halfInstallment.toLocaleString()})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Amount ({currency})</label>
                  <input type="number" required min={1} max={remaining} value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Payment Method</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="upi">UPI</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cash">Cash Counter</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Transaction Reference (Optional)</label>
                <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Auto-generated if blank" className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPayInvoice(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Confirm Payment</button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Staff Direct Refund Modal */}
      <Modal
        open={!!refundModalPay}
        onClose={() => setRefundModalPay(null)}
        title={`Process Fee Refund — ${refundModalPay?.receiptNo || ''}`}
        subtitle={refundModalPay ? `${refundModalPay.studentName} · ${currency} ${refundModalPay.amount.toLocaleString()}` : ''}
      >
        <form onSubmit={handleRefundPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Refund Reason</label>
            <textarea required rows={3} value={refundReasonInput} onChange={e => setRefundReasonInput(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRefundModalPay(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white">Confirm Refund</button>
          </div>
        </form>
      </Modal>

      {/* Student Fee Refund Request Modal */}
      <Modal
        open={!!studentRefundPay}
        onClose={() => setStudentRefundPay(null)}
        title={`Request Fee Refund — ${studentRefundPay?.receiptNo || ''}`}
        subtitle={studentRefundPay ? `Paid Amount: ${currency} ${studentRefundPay.amount.toLocaleString()}` : ''}
      >
        <form onSubmit={handleStudentRefundRequest} className="space-y-4">
          <textarea required rows={3} value={studentRefundReason} onChange={e => setStudentRefundReason(e.target.value)} placeholder="Explain reason for refund request (excess payment, course drop, hostel cancellation)..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setStudentRefundPay(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Refund Request</button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt */}
      <Modal open={!!receiptPayment} onClose={() => setReceiptPayment(null)} title="Official Payment Receipt">
        {receiptPayment && (
          <div className="space-y-4">
            <div className="border-b border-zinc-200 dark:border-zinc-700 pb-3">
              <h4 className="text-base font-bold">{university.name}</h4>
              <p className="text-xs text-[#52525B]">Finance & Accounts Office · {university.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-zinc-400">Receipt No</span><p className="font-mono font-bold">{receiptPayment.receiptNo}</p></div>
              <div><span className="text-zinc-400">Invoice Ref</span><p className="font-mono">{receiptPayment.invoiceNo}</p></div>
              <div><span className="text-zinc-400">Student</span><p className="font-semibold">{receiptPayment.studentName}</p></div>
              <div><span className="text-zinc-400">Method</span><p className="uppercase">{receiptPayment.method.replace('_', ' ')} ({receiptPayment.transactionRef})</p></div>
              <div><span className="text-zinc-400">Amount Paid</span><p className="font-mono font-bold text-base text-[#111111]">{currency} {receiptPayment.amount.toLocaleString()}</p></div>
              <div><span className="text-zinc-400">Status</span><div className="mt-0.5"><StatusText status={receiptPayment.status} /></div></div>
            </div>
            <div className="flex justify-end print:hidden">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Scholarship Create & Apply Modals */}
      <Modal open={schModal} onClose={() => setSchModal(false)} title="Create Scholarship Program">
        <form onSubmit={handleCreateScholarship} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Scholarship Name</label>
              <input type="text" required value={schName} onChange={e => setSchName(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Code</label>
              <input type="text" required value={schCode} onChange={e => setSchCode(e.target.value)} placeholder="MERIT-25" className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Discount Type</label>
              <select value={schDiscountType} onChange={e => setSchDiscountType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="percentage">Percentage Waiver (%)</option>
                <option value="fixed">Fixed Grant Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Value</label>
              <input type="number" required min={1} value={schValue} onChange={e => setSchValue(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Eligibility Criteria</label>
            <input type="text" required value={schCriteria} onChange={e => setSchCriteria(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSchModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Scholarship</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!schApplyTarget} onClose={() => setSchApplyTarget(null)} title={`Apply — ${schApplyTarget?.name || ''}`}>
        <form onSubmit={handleApplyScholarship} className="space-y-4">
          <textarea required rows={4} value={schStatement} onChange={e => setSchStatement(e.target.value)} placeholder="State your academic merit, achievements, or financial need..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSchApplyTarget(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Application</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
