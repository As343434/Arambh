import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  LifeBuoy,
  ShieldCheck,
  Users,
  Wallet
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { ROLE_METADATA, normalizeRole } from '../../config/rbac';
import { PageHeader, StatCard, StatusText } from '../../components/ui/DataUI';
import { ExamMark, Invoice, LeaveRequest, LibraryIssue, PlacementDrive, SupportTicket } from '../../types';

export const RoleDashboard: React.FC = () => {
  const { profile, normalizedRole, isAdmin } = useAuth();
  const {
    university,
    departments,
    offices,
    teams,
    students,
    employees,
    classes,
    subjects,
    approvalRequests,
    users
  } = useUniversity();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [issues, setIssues] = useState<LibraryIssue[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [selectedChildUid, setSelectedChildUid] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;
    const r = normalizeRole(normalizedRole);
    const isFinanceRole = isAdmin || ['finance_director', 'accountant', 'fee_officer', 'scholarship_officer'].includes(r);
    const isExamOrFacultyRole = isAdmin || ['hod', 'teacher', 'professor', 'teaching_assistant', 'research_assistant', 'exam_controller', 'deputy_controller', 'exam_coordinator', 'exam_scheduling_officer', 'exam_operations_officer', 'invigilator', 'marks_processing_officer', 'results_officer', 'revaluation_officer', 'university_registrar', 'deputy_registrar', 'records_officer', 'transcript_officer'].includes(r);
    const isLibraryRole = isAdmin || ['librarian', 'library_assistant'].includes(r);
    const isHRRole = isAdmin || ['hr_manager', 'recruitment_officer', 'payroll_officer', 'hod'].includes(r);
    const isSupportRole = isAdmin || ['it_administrator', 'it_support_officer', 'student_affairs_officer', 'support_staff', 'hostel_warden', 'transport_manager', 'hod'].includes(r);
    const linkedIds = (profile.parentOfStudentIds || []).filter(Boolean).slice(0, 10);

    const subs: (() => void)[] = [];

    if (isFinanceRole) {
      subs.push(onSnapshot(collection(db, 'invoices'), s => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))), () => {}));
    } else if (r === 'parent' && linkedIds.length > 0) {
      subs.push(onSnapshot(query(collection(db, 'invoices'), where('studentId', 'in', linkedIds)), s => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))), () => {}));
    }

    if (isExamOrFacultyRole) {
      subs.push(onSnapshot(collection(db, 'examMarks'), s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark))), () => {}));
    } else if (r === 'parent' && linkedIds.length > 0) {
      subs.push(onSnapshot(query(collection(db, 'examMarks'), where('studentId', 'in', linkedIds), where('isPublished', '==', true)), s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark))), () => {}));
    }

    if (isLibraryRole) {
      subs.push(onSnapshot(collection(db, 'libraryIssues'), s => setIssues(s.docs.map(d => ({ id: d.id, ...d.data() } as LibraryIssue))), () => {}));
    }

    subs.push(
      onSnapshot(
        isHRRole ? collection(db, 'leaveRequests') : query(collection(db, 'leaveRequests'), where('staffId', '==', profile.uid)),
        s => setLeaves(s.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest))),
        () => {}
      ),
      onSnapshot(
        isSupportRole ? collection(db, 'supportTickets') : query(collection(db, 'supportTickets'), where('userId', '==', profile.uid)),
        s => setTickets(s.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket))),
        () => {}
      ),
      onSnapshot(collection(db, 'placementDrives'), s => setDrives(s.docs.map(d => ({ id: d.id, ...d.data() } as PlacementDrive))), () => {})
    );

    return () => subs.forEach(u => u());
  }, [profile?.uid, normalizedRole, isAdmin, profile?.parentOfStudentIds]);

  const roleInfo = ROLE_METADATA[normalizedRole] || { label: normalizedRole, portalName: 'Institutional Portal', description: 'Role workspace' };
  const myDepartment = departments.find(d => d.id === profile?.departmentId);
  const myOffice = offices.find(o => o.id === profile?.officeId);
  const myTeam = teams.find(t => t.id === profile?.teamId);
  const pendingApprovals = approvalRequests.filter(r => r.status === 'pending');

  // Parent / Guardian Portal
  if (normalizedRole === 'parent') {
    const linkedIds = profile?.parentOfStudentIds || [];
    const linkedStudents = users.filter(u => linkedIds.includes(u.uid));
    const activeChild = linkedStudents.find(s => s.uid === selectedChildUid) || linkedStudents[0] || null;
    const childInvoices = activeChild ? invoices.filter(i => i.studentId === activeChild.uid) : [];
    const childMarks = activeChild ? marks.filter(m => m.studentId === activeChild.uid && m.isPublished) : [];

    return (
      <div className="space-y-6">
        <PageHeader
          title="Parent & Guardian Portal"
          subtitle={`Academic, attendance, examination, and fee visibility · ${university.shortName || university.name}`}
        />

        {activeChild ? (
          <>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#52525B] dark:text-zinc-400">Linked Ward</p>
                <h3 className="text-lg font-bold text-[#111111] dark:text-zinc-100">{activeChild.name} <span className="font-mono text-xs text-zinc-500">({activeChild.rollNo || 'No Roll'})</span></h3>
              </div>
              {linkedStudents.length > 1 && (
                <select value={activeChild.uid} onChange={e => setSelectedChildUid(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
                  {linkedStudents.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                </select>
              )}
              <Link to={`/students/${activeChild.uid}`} className="px-4 py-2.5 text-xs font-semibold rounded-2xl bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 text-white transition-colors">
                Open Full 360° Progress
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Published Results" value={childMarks.length} icon={Award} tone="navy" />
              <StatCard label="Pending Fee Invoices" value={childInvoices.filter(i => i.status !== 'paid').length} icon={Wallet} tone="dark" />
              <StatCard label="Campus Updates" value="Active" icon={ClipboardCheck} />
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-8 text-center text-sm text-[#52525B] dark:text-zinc-400">
            No student profile is linked to this parent account yet. Contact the Registrar&apos;s Office or Student Directory admin to map your ward&apos;s UID.
          </div>
        )}
      </div>
    );
  }

  // Tailored Operational Portal for all specialized Institutional Roles
  const roleHighlights = useMemo(() => {
    const r = normalizeRole(normalizedRole);
    if (r === 'hod') {
      const deptStudents = students.filter(s => !profile?.departmentId || s.departmentId === profile.departmentId).length;
      const deptClasses = classes.filter(c => !profile?.departmentId || c.departmentId === profile.departmentId).length;
      const deptSubjects = subjects.filter(s => !profile?.departmentId || s.departmentId === profile.departmentId).length;
      return {
        stats: [
          { label: 'Department Students', value: deptStudents, icon: Users, tone: 'navy' as const },
          { label: 'Active Sections', value: deptClasses, icon: BookOpen, tone: 'dark' as const },
          { label: 'Department Subjects', value: deptSubjects, icon: GraduationCap },
          { label: 'Pending Approvals', value: pendingApprovals.length, icon: FileCheck2 }
        ],
        links: [
          { label: 'Academic Structure & Curriculum', to: '/admin/academic' },
          { label: 'Department Timetable & Workload', to: '/timetable' },
          { label: 'Examination Marks & Approvals', to: '/examinations' },
          { label: 'Approval Inbox', to: '/approvals' }
        ]
      };
    }

    if (['finance_director', 'accountant', 'fee_officer', 'scholarship_officer'].includes(r)) {
      const due = invoices.filter(i => i.status !== 'paid' && i.status !== 'refunded').reduce((a, b) => a + Math.max(0, b.totalAmount - (b.paidAmount || 0)), 0);
      const collected = invoices.filter(i => i.status !== 'refunded').reduce((a, b) => a + (b.paidAmount || 0), 0);
      return {
        stats: [
          { label: 'Revenue Collected', value: `${university.currency || 'INR'} ${collected.toLocaleString()}`, icon: Wallet, tone: 'navy' as const },
          { label: 'Outstanding Dues', value: `${university.currency || 'INR'} ${due.toLocaleString()}`, icon: Wallet, tone: 'dark' as const },
          { label: 'Total Invoices', value: invoices.length, icon: FileCheck2 },
          { label: 'Pending Approvals', value: pendingApprovals.length, icon: ClipboardCheck }
        ],
        links: [
          { label: 'Invoices, Fee Structures & Receipts', to: '/finance' },
          { label: 'Scholarship Programs & Waivers', to: '/finance' },
          { label: 'Financial Analytics', to: '/reports' },
          { label: 'Approval Inbox', to: '/approvals' }
        ]
      };
    }

    if (['hr_manager', 'recruitment_officer', 'payroll_officer'].includes(r)) {
      return {
        stats: [
          { label: 'Total Workforce', value: employees.length, icon: Briefcase, tone: 'navy' as const },
          { label: 'Pending Leave Requests', value: leaves.filter(l => l.status === 'pending').length, icon: ClipboardCheck, tone: 'dark' as const },
          { label: 'Institutional Offices', value: offices.length, icon: Building2 },
          { label: 'Active Teams', value: teams.length, icon: Users }
        ],
        links: [
          { label: 'Faculty & Staff HR Portal', to: '/hr' },
          { label: 'Offices, Teams & Designations', to: '/offices-teams' },
          { label: 'Approval Inbox', to: '/approvals' },
          { label: 'Staff & Workload Reports', to: '/reports' }
        ]
      };
    }

    if (['exam_controller', 'deputy_controller', 'exam_coordinator', 'exam_scheduling_officer', 'exam_operations_officer', 'invigilator', 'marks_processing_officer', 'results_officer', 'revaluation_officer'].includes(r)) {
      return {
        stats: [
          { label: 'Marks Entries Logged', value: marks.length, icon: Award, tone: 'navy' as const },
          { label: 'Published Results', value: marks.filter(m => m.isPublished).length, icon: FileCheck2, tone: 'dark' as const },
          { label: 'Active Sections', value: classes.length, icon: BookOpen },
          { label: 'Approval Queue', value: pendingApprovals.length, icon: ClipboardCheck }
        ],
        links: [
          { label: 'Examinations, Seating & Marks', to: '/examinations' },
          { label: 'Certificate & Transcript Issuance', to: '/certificates' },
          { label: 'Approval Inbox', to: '/approvals' },
          { label: 'Academic Calendar', to: '/calendar' }
        ]
      };
    }

    if (['librarian', 'library_assistant'].includes(r)) {
      return {
        stats: [
          { label: 'Issued Volumes', value: issues.filter(i => i.status === 'issued').length, icon: BookOpen, tone: 'navy' as const },
          { label: 'Returned Volumes', value: issues.filter(i => i.status === 'returned').length, icon: FileCheck2, tone: 'dark' as const },
          { label: 'Total Students', value: students.length, icon: Users },
          { label: 'Faculty Members', value: employees.length, icon: Briefcase }
        ],
        links: [
          { label: 'Library Catalog & Circulation', to: '/library' },
          { label: 'Campus Events', to: '/events' },
          { label: 'Support Desk', to: '/support' }
        ]
      };
    }

    if (r === 'hostel_warden') {
      return {
        stats: [
          { label: 'Student Body', value: students.length, icon: Users, tone: 'navy' as const },
          { label: 'Open Support Tickets', value: tickets.filter(t => t.status === 'open').length, icon: LifeBuoy, tone: 'dark' as const },
          { label: 'Pending Approvals', value: pendingApprovals.length, icon: FileCheck2 },
          { label: 'Hostel Office', value: myOffice?.code || 'HST', icon: Building2 }
        ],
        links: [
          { label: 'Hostel Blocks & Room Allocations', to: '/hostel' },
          { label: 'Disciplinary Records', to: '/discipline' },
          { label: 'Support & Grievances', to: '/support' }
        ]
      };
    }

    if (r === 'transport_manager') {
      return {
        stats: [
          { label: 'Active Students', value: students.length, icon: Users, tone: 'navy' as const },
          { label: 'Transport Office', value: myOffice?.code || 'TRN', icon: Bus, tone: 'dark' as const },
          { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open').length, icon: LifeBuoy },
          { label: 'Campus Events', value: 'Live', icon: ClipboardCheck }
        ],
        links: [
          { label: 'Bus Routes & Student Passes', to: '/transport' },
          { label: 'Support Tickets', to: '/support' },
          { label: 'Notices & Alerts', to: '/notices' }
        ]
      };
    }

    if (r === 'placement_officer') {
      return {
        stats: [
          { label: 'Active Placement Drives', value: drives.filter(d => d.status === 'open').length, icon: Briefcase, tone: 'navy' as const },
          { label: 'Eligible Student Pool', value: students.length, icon: Users, tone: 'dark' as const },
          { label: 'Campus Events', value: 'Active', icon: Award },
          { label: 'Placement Office', value: myOffice?.code || 'PLC', icon: Building2 }
        ],
        links: [
          { label: 'Placement Drives & Candidate Pipeline', to: '/placements' },
          { label: 'Career Seminars & Events', to: '/events' },
          { label: 'Placement Analytics', to: '/reports' }
        ]
      };
    }

    if (['it_administrator', 'it_support_officer'].includes(r)) {
      return {
        stats: [
          { label: 'Institutional Offices', value: offices.length, icon: Building2, tone: 'navy' as const },
          { label: 'RBAC Operational Teams', value: teams.length, icon: Users, tone: 'dark' as const },
          { label: 'Open IT Tickets', value: tickets.filter(t => t.status === 'open').length, icon: LifeBuoy },
          { label: 'PII / Payroll Guard', value: 'Enforced', icon: ShieldCheck }
        ],
        links: [
          { label: 'Roles, Scope & Permission Matrix', to: '/rbac' },
          { label: 'Offices & Teams Governance', to: '/offices-teams' },
          { label: 'Security Audit Logs', to: '/audit-logs' },
          { label: 'IT Support Helpdesk', to: '/support' }
        ]
      };
    }

    return {
      stats: [
        { label: 'Total Students', value: students.length, icon: Users, tone: 'navy' as const },
        { label: 'Faculty & Staff', value: employees.length, icon: Briefcase, tone: 'dark' as const },
        { label: 'Pending Approvals', value: pendingApprovals.length, icon: FileCheck2 },
        { label: 'Open Support Tickets', value: tickets.filter(t => t.status === 'open').length, icon: LifeBuoy }
      ],
      links: [
        { label: 'Admissions & Enrollment', to: '/admissions' },
        { label: 'Approval Inbox', to: '/approvals' },
        { label: 'Certificates & Records', to: '/certificates' },
        { label: 'Institutional Notices', to: '/notices' }
      ]
    };
  }, [normalizedRole, profile?.departmentId, students, classes, subjects, pendingApprovals.length, invoices, university.currency, employees.length, leaves, offices.length, teams.length, marks, issues, tickets, drives, myOffice?.code]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={roleInfo.portalName}
        subtitle={`${university.name} · ${profile?.name} (${roleInfo.label})`}
        actions={
          <div className="flex flex-wrap gap-2 text-xs text-[#52525B] dark:text-zinc-300">
            {myOffice && <span className="px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium">Office: {myOffice.name}</span>}
            {myDepartment && <span className="px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium">Dept: {myDepartment.name}</span>}
            {myTeam && <span className="px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium">Team: {myTeam.name}</span>}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roleHighlights.stats.map(st => (
          <StatCard key={st.label} label={st.label} value={st.value} icon={st.icon} tone={st.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-3 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">Primary Workflows</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {roleHighlights.links.map(l => (
              <Link
                key={l.label}
                to={l.to}
                className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 hover:bg-[#111111] hover:text-white hover:border-[#111111] dark:hover:bg-white dark:hover:text-zinc-950 text-xs font-semibold text-[#111111] dark:text-zinc-200 transition-colors"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-3 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">Recent Approval Queue</h3>
            <Link to="/approvals" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Open Inbox</Link>
          </div>
          {pendingApprovals.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pendingApprovals.slice(0, 4).map(req => (
                <div key={req.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-medium text-[#111111] dark:text-zinc-100">{req.title}</p>
                    <p className="text-zinc-500">By {req.requesterName} · Stage {req.currentStageIndex + 1}/{req.stages.length}</p>
                  </div>
                  <StatusText status={req.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
              <p className="text-xs text-[#52525B] dark:text-zinc-400">All approval stages are up to date.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
