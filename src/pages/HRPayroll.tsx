import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Download,
  FileText,
  Lock,
  Plus,
  Printer,
  Search,
  UserCheck,
  Users
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { ROLE_METADATA, normalizeRole } from '../config/rbac';
import { exportToCsv, logAudit } from '../services/erpService';
import {
  EmploymentContract,
  LeaveRequest,
  PayrollRecord,
  RecruitmentApplicant,
  RecruitmentOpening,
  StaffAttendance,
  StaffPerformanceReview,
  TimetableEntry,
  UserProfile
} from '../types';

export const HRPayroll: React.FC = () => {
  const { profile, can, canViewField } = useAuth();
  const { university, employees, departments, offices, teams, campuses, designations, contracts, users } = useUniversity();

  const canManageHR = can('hr.manage');
  const canManagePayroll = can('payroll.manage') && canViewField('salary');

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendance[]>([]);
  const [openings, setOpenings] = useState<RecruitmentOpening[]>([]);
  const [applicants, setApplicants] = useState<RecruitmentApplicant[]>([]);
  const [reviews, setReviews] = useState<StaffPerformanceReview[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>(canManageHR ? 'directory' : 'leave');
  const [empFilter, setEmpFilter] = useState<'all' | 'teaching' | 'non_teaching'>('all');
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<UserProfile | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Leave modal
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('casual');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Contract modal
  const [contractModal, setContractModal] = useState(false);
  const [cEmpId, setCEmpId] = useState('');
  const [cType, setCType] = useState<EmploymentContract['contractType']>('permanent');
  const [cStart, setCStart] = useState('');
  const [cEnd, setCEnd] = useState('');
  const [cSalary, setCSalary] = useState(65000);
  const [cAllowances, setCAllowances] = useState(12000);
  const [cHours, setCHours] = useState(40);

  // Recruitment modal
  const [jobModal, setJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDeptId, setJobDeptId] = useState('');
  const [jobType, setJobType] = useState<'teaching' | 'non_teaching'>('teaching');
  const [jobVacancies, setJobVacancies] = useState(1);
  const [jobClose, setJobClose] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  // Performance review modal
  const [revModal, setRevModal] = useState(false);
  const [revEmpId, setRevEmpId] = useState('');
  const [revPeriod, setRevPeriod] = useState('AY 2026–27');
  const [revRating, setRevRating] = useState(4);
  const [revGoals, setRevGoals] = useState('');
  const [revRemarks, setRevRemarks] = useState('');

  // Staff Attendance date
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);

  // Payroll generation
  const [payMonth, setPayMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const leavesQ = canManageHR ? collection(db, 'leaveRequests') : query(collection(db, 'leaveRequests'), where('staffId', '==', profile.uid));
    const payQ = canManagePayroll ? collection(db, 'payrollRecords') : query(collection(db, 'payrollRecords'), where('staffId', '==', profile.uid));
    const attQ = canManageHR ? collection(db, 'staffAttendance') : query(collection(db, 'staffAttendance'), where('employeeId', '==', profile.uid));
    const revQ = canManageHR ? collection(db, 'staffPerformanceReviews') : query(collection(db, 'staffPerformanceReviews'), where('employeeId', '==', profile.uid));

    const u1 = onSnapshot(leavesQ, s => {
      setLeaves(s.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
      setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(payQ, s => setPayroll(s.docs.map(d => ({ id: d.id, ...d.data() } as PayrollRecord))), () => {});
    const u3 = onSnapshot(attQ, s => setStaffAttendance(s.docs.map(d => ({ id: d.id, ...d.data() } as StaffAttendance))), () => {});
    const u4 = onSnapshot(collection(db, 'recruitmentOpenings'), s => setOpenings(s.docs.map(d => ({ id: d.id, ...d.data() } as RecruitmentOpening))), () => {});
    const u5 = canManageHR
      ? onSnapshot(collection(db, 'recruitmentApplicants'), s => setApplicants(s.docs.map(d => ({ id: d.id, ...d.data() } as RecruitmentApplicant))), () => {})
      : () => {};
    const u6 = onSnapshot(revQ, s => setReviews(s.docs.map(d => ({ id: d.id, ...d.data() } as StaffPerformanceReview))), () => {});
    const u7 = onSnapshot(collection(db, 'timetable'), s => setTimetable(s.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry))), () => {});
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, [profile?.uid, canManageHR, canManagePayroll]);

  const teachingRoles = new Set(['teacher', 'professor', 'hod', 'teaching_assistant', 'research_assistant']);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const isTeach = e.employeeType === 'teaching' || teachingRoles.has(normalizeRole(e.role));
      if (empFilter === 'teaching' && !isTeach) return false;
      if (empFilter === 'non_teaching' && isTeach) return false;
      if (empSearch.trim()) {
        const q = empSearch.toLowerCase();
        return (
          e.name?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          (e.employeeId || '').toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, empFilter, empSearch]);

  const getEmployeeWorkloadHours = (uid: string) => {
    return timetable.filter(t => t.teacherId === uid || t.substituteTeacherId === uid).length;
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const ref = await addDoc(collection(db, 'leaveRequests'), {
      staffId: profile.uid,
      staffName: profile.name,
      departmentId: profile.departmentId || '',
      officeId: profile.officeId || '',
      leaveType,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: leaveReason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'APPLY_LEAVE', 'HR', ref.id, `${leaveType}: ${leaveStart} to ${leaveEnd}`);
    setLeaveModal(false);
    setLeaveReason('');
    setBanner('Leave request submitted.');
  };

  const handleReviewLeave = async (lv: LeaveRequest, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'leaveRequests', lv.id), { status, approvedBy: profile?.name || profile?.uid });
    await logAudit(profile, `LEAVE_${status.toUpperCase()}`, 'HR', lv.id, `${lv.staffName} (${lv.startDate})`);
    setBanner(`Leave request ${status}.`);
  };

  const handleMarkStaffAttendance = async (emp: UserProfile, status: StaffAttendance['status']) => {
    await addDoc(collection(db, 'staffAttendance'), {
      staffId: emp.uid,
      staffName: emp.name,
      date: attDate,
      status,
      checkIn: status === 'present' ? '09:00' : status === 'late' ? '09:25' : '',
      markedBy: profile?.uid
    });
    setBanner(`Marked ${emp.name} as ${status} for ${attDate}.`);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.uid === cEmpId);
    if (!emp) return;
    const ref = await addDoc(collection(db, 'employmentContracts'), {
      employeeId: emp.uid,
      employeeName: emp.name,
      contractNumber: `CTR-${Date.now().toString().slice(-6)}`,
      contractType: cType,
      startDate: cStart,
      endDate: cEnd || null,
      salaryBasic: Number(cSalary),
      allowances: Number(cAllowances),
      weeklyHours: Number(cHours),
      status: 'active',
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'users', emp.uid), {
      salaryBasic: Number(cSalary),
      salaryAllowances: Number(cAllowances),
      weeklyWorkloadTargetHours: Number(cHours)
    });
    await logAudit(profile, 'CREATE_CONTRACT', 'HR', ref.id, `${emp.name} (${cType})`);
    setContractModal(false);
    setBanner('Employment contract saved.');
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'recruitmentOpenings'), {
      title: jobTitle,
      departmentId: jobDeptId || null,
      employeeType: jobType,
      vacancies: Number(jobVacancies) || 1,
      closingDate: jobClose,
      description: jobDesc,
      status: 'open',
      createdAt: serverTimestamp()
    });
    setJobModal(false);
    setJobTitle('');
    setBanner('Recruitment opening published.');
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.uid === revEmpId);
    if (!emp || !profile) return;
    await addDoc(collection(db, 'staffPerformanceReviews'), {
      employeeId: emp.uid,
      employeeName: emp.name,
      reviewerId: profile.uid,
      reviewerName: profile.name,
      period: revPeriod,
      rating: Number(revRating),
      goals: revGoals,
      remarks: revRemarks,
      status: 'submitted',
      createdAt: serverTimestamp()
    });
    setRevModal(false);
    setBanner(`Performance review logged for ${emp.name}.`);
  };

  const handleRunMonthlyPayroll = async () => {
    if (!canManagePayroll) return;
    let count = 0;
    for (const emp of employees) {
      const exists = payroll.some(p => p.staffId === emp.uid && p.month === payMonth && p.year === payYear);
      if (exists) continue;
      const basic = emp.salaryBasic || 0;
      const allowances = emp.salaryAllowances || 0;
      const deductions = Math.round(basic * 0.08);
      await addDoc(collection(db, 'payrollRecords'), {
        staffId: emp.uid,
        staffName: emp.name,
        employeeId: emp.employeeId || '',
        month: payMonth,
        year: payYear,
        basicPay: basic,
        allowances,
        deductions,
        netPay: basic + allowances - deductions,
        status: 'processed'
      });
      count++;
    }
    await logAudit(profile, 'RUN_PAYROLL', 'Payroll', `${payMonth}-${payYear}`, `Processed ${count} payslips`);
    setBanner(`Generated ${count} payroll record(s) for ${payMonth} ${payYear}.`);
  };

  const visibleLeaves = useMemo(() => {
    return canManageHR ? leaves : leaves.filter(l => l.staffId === profile?.uid);
  }, [leaves, canManageHR, profile?.uid]);

  const currency = university.currency || 'INR';

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty, Staff & HR Management"
        subtitle="Teaching & non-teaching employee profiles, organizational assignments, contracts, recruitment, attendance, leave, performance, and payroll."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManageHR && (
              <button
                type="button"
                onClick={() =>
                  exportToCsv(
                    'university_staff_directory.csv',
                    employees.map(e => ({
                      EmployeeID: e.employeeId || '',
                      Name: e.name,
                      Email: e.email,
                      Role: ROLE_METADATA[normalizeRole(e.role)]?.label || e.role,
                      Type: e.employeeType || 'teaching',
                      Department: departments.find(d => d.id === e.departmentId)?.name || '',
                      Office: offices.find(o => o.id === e.officeId)?.name || '',
                      Team: teams.find(t => t.id === e.teamId)?.name || '',
                      Status: e.status || 'active'
                    }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                <Download className="w-3.5 h-3.5" /> Export Staff Report
              </button>
            )}
            <button
              type="button"
              onClick={() => setLeaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
            >
              <Plus className="w-3.5 h-3.5" /> Apply Leave
            </button>
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
        <StatCard label="Total Employees" value={employees.length} icon={Users} tone="indigo" />
        <StatCard label="Teaching Faculty" value={employees.filter(e => e.employeeType === 'teaching' || teachingRoles.has(normalizeRole(e.role))).length} icon={Briefcase} tone="emerald" />
        <StatCard label="Pending Leave Requests" value={visibleLeaves.filter(l => l.status === 'pending').length} icon={Calendar} tone="amber" />
        <StatCard label="Open Positions" value={openings.filter(o => o.status === 'open').length} icon={UserCheck} />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          ...(canManageHR ? [
            { id: 'directory', label: 'Employee Directory', count: employees.length },
            { id: 'attendance', label: 'Staff Attendance' },
            { id: 'contracts', label: 'Contracts', count: contracts.length },
            { id: 'recruitment', label: 'Recruitment', count: openings.length },
            { id: 'performance', label: 'Performance', count: reviews.length },
          ] : []),
          { id: 'leave', label: 'Leave Requests', count: visibleLeaves.length },
          ...(canManagePayroll ? [{ id: 'payroll', label: 'Payroll (Restricted)', count: payroll.length }] : [])
        ]}
      />

      {/* Employee Directory + Workload */}
      {activeTab === 'directory' && canManageHR && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                placeholder="Search employees by name, ID, role, or designation..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'teaching', 'non_teaching'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setEmpFilter(f)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border capitalize ${
                    empFilter === f
                      ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white border-[#111111] dark:border-white'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[#52525B] dark:text-slate-300'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Role / Designation</th>
                    <th className="py-3 px-4 font-semibold">Office & Department</th>
                    <th className="py-3 px-4 font-semibold">Workload</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                  {filteredEmployees.map(emp => {
                    const dept = departments.find(d => d.id === emp.departmentId);
                    const office = offices.find(o => o.id === emp.officeId);
                    const hrs = getEmployeeWorkloadHours(emp.uid);
                    return (
                      <tr key={emp.uid}>
                        <td className="py-3 px-4">
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs font-mono text-zinc-400">{emp.employeeId || emp.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-semibold">{ROLE_METADATA[normalizeRole(emp.role)]?.label || emp.role}</p>
                          {emp.designation && <p className="text-xs text-[#52525B]">{emp.designation}</p>}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#52525B] dark:text-slate-300">
                          <p>{office?.name || 'Central Administration'}</p>
                          <p className="text-zinc-400">{dept?.name || 'Cross-Functional'}</p>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs tabular-nums">
                          {hrs} / {emp.weeklyWorkloadTargetHours || 16} hrs
                        </td>
                        <td className="py-3 px-4"><StatusText status={emp.status || 'active'} /></td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEmp(emp)}
                            className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline"
                          >
                            Inspect Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-xs text-zinc-400">No employees match the current filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Attendance */}
      {activeTab === 'attendance' && canManageHR && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Daily Staff Attendance Register</h3>
            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {employees.map(emp => {
              const todayRec = staffAttendance.find(a => a.staffId === emp.uid && a.date === attDate);
              return (
                <div key={emp.uid} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{emp.name}</p>
                    <p className="text-xs text-zinc-400">{emp.employeeId || emp.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {todayRec && <StatusText status={todayRec.status} />}
                    {(['present', 'absent', 'late', 'on_leave'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleMarkStaffAttendance(emp, st)}
                        className="px-2.5 py-1 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-slate-800 capitalize"
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contracts */}
      {activeTab === 'contracts' && canManageHR && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => { setCEmpId(employees[0]?.uid || ''); setContractModal(true); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Plus className="w-3.5 h-3.5" /> Add Employment Contract
            </button>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
            {contracts.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-semibold">{c.employeeName} <span className="font-mono text-xs text-zinc-400">({c.contractNumber})</span></p>
                  <p className="text-xs text-[#52525B] capitalize">{c.contractType.replace('_', ' ')} · {c.startDate} to {c.endDate || 'Ongoing'} · {c.weeklyHours}h/wk</p>
                </div>
                <div className="text-right">
                  {canViewField('salary') && (
                    <p className="font-mono text-xs font-semibold">{currency} {(c.salaryBasic + c.allowances).toLocaleString()} / mo</p>
                  )}
                  <StatusText status={c.status} />
                </div>
              </div>
            ))}
            {contracts.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No employment contracts logged yet.</p>}
          </div>
        </div>
      )}

      {/* Recruitment */}
      {activeTab === 'recruitment' && canManageHR && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setJobModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Plus className="w-3.5 h-3.5" /> Post Job Opening
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openings.map(o => (
              <div key={o.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#52525B]">
                  <span className="capitalize">{o.employeeType.replace('_', ' ')} · {o.vacancies} positions</span>
                  <StatusText status={o.status} />
                </div>
                <h3 className="text-base font-semibold">{o.title}</h3>
                <p className="text-xs text-[#52525B]">{o.description}</p>
                <p className="text-xs font-mono text-zinc-400">Closes: {o.closingDate}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance */}
      {activeTab === 'performance' && canManageHR && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => { setRevEmpId(employees[0]?.uid || ''); setRevModal(true); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Plus className="w-3.5 h-3.5" /> Log Performance Review
            </button>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
            {reviews.map(r => (
              <div key={r.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{r.employeeName} · <span className="text-xs font-mono text-zinc-400">{r.period}</span></p>
                  <p className="text-xs text-[#52525B] mt-1">Goals: {r.goals}</p>
                  <p className="text-xs text-[#52525B] dark:text-slate-300 mt-1">{r.remarks}</p>
                </div>
                <span className="font-mono font-bold text-[#111111] dark:text-zinc-200 text-sm shrink-0">{r.rating} / 5.0</span>
              </div>
            ))}
            {reviews.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No performance appraisals logged yet.</p>}
          </div>
        </div>
      )}

      {/* Leave Management */}
      {activeTab === 'leave' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleLeaves.map(lv => (
            <div key={lv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-sm">{lv.staffName}</span>
                  <span className="capitalize text-[#111111] dark:text-zinc-200">{lv.leaveType} leave</span>
                  <StatusText status={lv.status} />
                </div>
                <p className="text-xs font-mono text-[#52525B] mt-0.5">{lv.startDate} to {lv.endDate}</p>
                <p className="text-xs text-[#52525B] dark:text-slate-300 mt-1">{lv.reason}</p>
              </div>
              {canManageHR && lv.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleReviewLeave(lv, 'approved')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Approve</button>
                  <button onClick={() => handleReviewLeave(lv, 'rejected')} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600">Reject</button>
                </div>
              )}
            </div>
          ))}
          {visibleLeaves.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No leave requests found.</p>}
        </div>
      )}

      {/* Payroll (Restricted) */}
      {activeTab === 'payroll' && canManagePayroll && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#52525B]">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Restricted Payroll Engine — visible only to Finance Director, HR Manager & Payroll Officer</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={payMonth} onChange={e => setPayMonth(e.target.value)} className="w-28 px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <input type="number" value={payYear} onChange={e => setPayYear(Number(e.target.value))} className="w-20 px-2.5 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <button type="button" onClick={handleRunMonthlyPayroll} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
                Generate Monthly Payroll
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-[#52525B]">
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Period</th>
                  <th className="py-3 px-4 font-semibold">Basic + Allow</th>
                  <th className="py-3 px-4 font-semibold">Deductions</th>
                  <th className="py-3 px-4 font-semibold">Net Pay</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {payroll.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-medium">{p.staffName}</td>
                    <td className="py-3 px-4 font-mono text-xs">{p.month} {p.year}</td>
                    <td className="py-3 px-4 font-mono text-xs">{currency} {(p.basicPay + p.allowances).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-xs text-rose-500">-{currency} {p.deductions.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#111111]">{currency} {p.netPay.toLocaleString()}</td>
                    <td className="py-3 px-4"><StatusText status={p.status} /></td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {p.status !== 'paid' && (
                        <button
                          onClick={() => updateDoc(doc(db, 'payrollRecords', p.id), { status: 'paid', paidAt: serverTimestamp() })}
                          className="text-xs font-semibold text-[#111111] hover:underline"
                        >
                          Disburse
                        </button>
                      )}
                      <button onClick={() => setPayslipRecord(p)} className="text-xs text-[#111111] hover:underline">Payslip</button>
                    </td>
                  </tr>
                ))}
                {payroll.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-zinc-400">No payroll runs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 360° Employee Profile Modal */}
      <Modal
        open={!!selectedEmp}
        onClose={() => setSelectedEmp(null)}
        title={selectedEmp?.name || 'Employee Profile'}
        subtitle={`${ROLE_METADATA[normalizeRole(selectedEmp?.role)]?.label || selectedEmp?.role || ''} · ${selectedEmp?.employeeId || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedEmp && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
              <div><span className="text-zinc-400">Email</span><p className="font-medium">{selectedEmp.email}</p></div>
              <div><span className="text-zinc-400">Phone</span><p className="font-mono">{selectedEmp.phone || '—'}</p></div>
              <div><span className="text-zinc-400">Campus</span><p className="font-medium">{campuses.find(c => c.id === selectedEmp.campusId)?.name || '—'}</p></div>
              <div><span className="text-zinc-400">Department</span><p className="font-medium">{departments.find(d => d.id === selectedEmp.departmentId)?.name || '—'}</p></div>
              <div><span className="text-zinc-400">Office</span><p className="font-medium">{offices.find(o => o.id === selectedEmp.officeId)?.name || '—'}</p></div>
              <div><span className="text-zinc-400">Team</span><p className="font-medium">{teams.find(t => t.id === selectedEmp.teamId)?.name || '—'}</p></div>
              <div><span className="text-zinc-400">Reporting Manager</span><p className="font-medium">{users.find(u => u.uid === selectedEmp.reportingManagerId)?.name || '—'}</p></div>
              <div><span className="text-zinc-400">Qualification</span><p className="font-medium">{selectedEmp.qualification || '—'}</p></div>
              <div><span className="text-zinc-400">Weekly Workload</span><p className="font-mono">{getEmployeeWorkloadHours(selectedEmp.uid)} / {selectedEmp.weeklyWorkloadTargetHours || 0} hrs</p></div>
            </div>

            {canViewField('salary') ? (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Compensation Summary (Authorized View)</p>
                <p className="font-mono">Basic: {currency} {(selectedEmp.salaryBasic || 0).toLocaleString()} · Allowances: {currency} {(selectedEmp.salaryAllowances || 0).toLocaleString()}</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[#52525B] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Payroll & compensation fields hidden by RBAC field-level policy.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modals for Leave, Contract, Job, Review, Payslip */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Apply for Leave">
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Leave Type</label>
              <select value={leaveType} onChange={e => setLeaveType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick / Medical</option>
                <option value="earned">Earned Leave</option>
                <option value="academic">Academic / Conference</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Start Date</label>
              <input type="date" required value={leaveStart} onChange={e => setLeaveStart(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Date</label>
              <input type="date" required value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <textarea required rows={3} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Reason & handover arrangement..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setLeaveModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Leave</button>
          </div>
        </form>
      </Modal>

      <Modal open={contractModal} onClose={() => setContractModal(false)} title="Create Employment Contract">
        <form onSubmit={handleCreateContract} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Employee</label>
              <select required value={cEmpId} onChange={e => setCEmpId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {employees.map(e => <option key={e.uid} value={e.uid}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Contract Type</label>
              <select value={cType} onChange={e => setCType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="permanent">Permanent</option>
                <option value="fixed_term">Fixed Term</option>
                <option value="visiting">Visiting Faculty</option>
                <option value="probation">Probation</option>
              </select>
            </div>
            <div><label className="block text-xs font-medium mb-1">Start Date</label><input type="date" required value={cStart} onChange={e => setCStart(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">End Date (Optional)</label><input type="date" value={cEnd} onChange={e => setCEnd(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Monthly Basic Pay</label><input type="number" required value={cSalary} onChange={e => setCSalary(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Monthly Allowances</label><input type="number" required value={cAllowances} onChange={e => setCAllowances(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setContractModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Contract</button>
          </div>
        </form>
      </Modal>

      <Modal open={jobModal} onClose={() => setJobModal(false)} title="Publish Recruitment Opening">
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Position Title</label><input type="text" required value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Category</label><select value={jobType} onChange={e => setJobType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"><option value="teaching">Teaching Faculty</option><option value="non_teaching">Non-Teaching Staff</option></select></div>
            <div><label className="block text-xs font-medium mb-1">Vacancies</label><input type="number" min={1} value={jobVacancies} onChange={e => setJobVacancies(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Closing Date</label><input type="date" required value={jobClose} onChange={e => setJobClose(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <textarea required rows={3} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Qualifications & role scope..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setJobModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Publish Opening</button>
          </div>
        </form>
      </Modal>

      <Modal open={revModal} onClose={() => setRevModal(false)} title="Submit Staff Performance Review">
        <form onSubmit={handleCreateReview} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select required value={revEmpId} onChange={e => setRevEmpId(e.target.value)} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {employees.map(e => <option key={e.uid} value={e.uid}>{e.name}</option>)}
            </select>
            <input type="text" required value={revPeriod} onChange={e => setRevPeriod(e.target.value)} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input type="number" min={1} max={5} step={0.1} value={revRating} onChange={e => setRevRating(Number(e.target.value))} className="px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <input type="text" required value={revGoals} onChange={e => setRevGoals(e.target.value)} placeholder="Key achievements / goals met" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <textarea required rows={3} value={revRemarks} onChange={e => setRevRemarks(e.target.value)} placeholder="Reviewer evaluation remarks..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRevModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Review</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!payslipRecord} onClose={() => setPayslipRecord(null)} title="Employee Salary Payslip">
        {payslipRecord && (
          <div className="space-y-4 text-xs">
            <div className="border-b border-zinc-200 dark:border-zinc-700 pb-3">
              <h4 className="text-base font-bold">{university.name}</h4>
              <p className="text-[#52525B]">Payslip for {payslipRecord.month} {payslipRecord.year}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-zinc-400">Employee</span><p className="font-semibold">{payslipRecord.staffName}</p></div>
              <div><span className="text-zinc-400">Employee ID</span><p className="font-mono">{payslipRecord.employeeId || '—'}</p></div>
              <div><span className="text-zinc-400">Basic Pay</span><p className="font-mono">{currency} {payslipRecord.basicPay.toLocaleString()}</p></div>
              <div><span className="text-zinc-400">Allowances</span><p className="font-mono">{currency} {payslipRecord.allowances.toLocaleString()}</p></div>
              <div><span className="text-zinc-400">Deductions</span><p className="font-mono text-rose-500">-{currency} {payslipRecord.deductions.toLocaleString()}</p></div>
              <div><span className="text-zinc-400">Net Disbursed</span><p className="font-mono font-bold text-base text-[#111111]">{currency} {payslipRecord.netPay.toLocaleString()}</p></div>
            </div>
            <div className="flex justify-end print:hidden">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
                <Printer className="w-3.5 h-3.5" /> Print Payslip
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
