import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { PageHeader, StatCard, StatusText } from '../../components/ui/DataUI';
import {
  Users,
  GraduationCap,
  BookOpen,
  Wallet,
  UserCheck,
  Wand2,
  Building2,
  FileCheck2,
  ArrowRight,
  Calendar
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const { profile, can } = useAuth();
  const { university, students, employees, departments, classes, offices, approvalRequests, academicEvents } = useUniversity();
  const [admissionsCount, setAdmissionsCount] = useState(0);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [attendanceDocs, setAttendanceDocs] = useState<any[]>([]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'admissions'), s => setAdmissionsCount(s.docs.filter(d => d.data().status !== 'enrolled' && d.data().status !== 'rejected').length), () => {});
    const u2 = onSnapshot(collection(db, 'invoices'), s => setInvoices(s.docs.map(d => d.data())), () => {});
    const u3 = onSnapshot(collection(db, 'attendance'), s => setAttendanceDocs(s.docs.map(d => d.data())), () => {});
    return () => { u1(); u2(); u3(); };
  }, []);

  const totalCollected = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
  const totalBilled = invoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const presentCount = attendanceDocs.filter(a => a.status === 'present' || a.status === 'late').length;
  const attRate = attendanceDocs.length > 0 ? Math.round((presentCount / attendanceDocs.length) * 100) : 0;
  const pendingApprovals = approvalRequests.filter(a => a.status === 'pending');

  const setupDone = university.setupCompletedSteps?.length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${university.name || 'University Portal'} — Executive Console`}
        subtitle={`Welcome back, ${profile?.name}. ${university.tagline || 'Institutional ERP & LMS oversight'}`}
        actions={
          <div className="flex items-center gap-2">
            {can('university.setup') && (
              <Link
                to="/admin/setup"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-2xl transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" /> Setup Wizard ({setupDone}/19)
              </Link>
            )}
          </div>
        }
      />

      {setupDone < 19 && can('university.setup') && (
        <div className="bg-[#111111] dark:bg-zinc-900 border border-[#111111] dark:border-zinc-800 rounded-3xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18)]">
          <div>
            <p className="text-sm font-bold text-white">
              University Configuration: {setupDone} of 19 setup milestones completed
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Configure campuses, departments, academic structure, grading policies, and RBAC rules in the Setup Wizard.
            </p>
          </div>
          <Link to="/admin/setup" className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-[#111111] hover:bg-zinc-200 text-xs font-semibold rounded-2xl shrink-0 transition-colors">
            Continue Setup <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Enrolled Students" value={students.length} hint={`${classes.length} active sections`} icon={Users} tone="navy" />
        <StatCard label="Faculty & Staff" value={employees.length} hint={`${departments.length} departments · ${offices.length} offices`} icon={GraduationCap} tone="dark" />
        <StatCard label="Fee Collection" value={`${university.currency || 'INR'} ${totalCollected.toLocaleString()}`} hint={`Out of ${totalBilled.toLocaleString()} billed`} icon={Wallet} />
        <StatCard label="Avg Attendance" value={`${attRate}%`} hint={`${admissionsCount} open admission files`} icon={UserCheck} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Enrollment Breakdown */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">Department Distribution</h2>
            <Link to="/admin/academic" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Manage Academics</Link>
          </div>
          {departments.length > 0 ? (
            <div className="space-y-3.5">
              {departments.map(dept => {
                const deptStudents = students.filter(s => s.departmentId === dept.id).length;
                const deptStaff = employees.filter(e => e.departmentId === dept.id).length;
                const pct = students.length > 0 ? Math.round((deptStudents / students.length) * 100) : 0;
                return (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#111111] dark:text-zinc-200">
                        <span className="font-mono text-zinc-500 mr-2">{dept.code}</span>
                        {dept.name}
                      </span>
                      <span className="font-mono text-zinc-500 tabular-nums">{deptStudents} students · {deptStaff} staff</span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#111111] dark:bg-white rounded-full" style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-8 px-4 text-center">
              <p className="text-xs text-[#52525B] dark:text-zinc-400">No departments configured yet. Visit the Setup Wizard to create departments.</p>
            </div>
          )}
        </div>

        {/* Pending Approvals & Quick Navigation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">Pending Approval Inbox ({pendingApprovals.length})</h2>
              <Link to="/approvals" className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">Open Inbox</Link>
            </div>
            {pendingApprovals.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pendingApprovals.slice(0, 4).map(req => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111111] dark:text-zinc-100 truncate">{req.title}</p>
                      <p className="text-[#52525B] truncate">{req.requesterName} · {req.processType.replace(/_/g, ' ')}</p>
                    </div>
                    <StatusText status={req.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl py-6 text-center">
                <p className="text-xs text-[#52525B] dark:text-zinc-400">No pending approval requests.</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100 mb-3">Quick Institutional Workflows</h2>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link to="/offices-teams" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <Building2 className="w-4 h-4 shrink-0" /> Offices & Teams
              </Link>
              <Link to="/rbac" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <FileCheck2 className="w-4 h-4 shrink-0" /> Roles & RBAC
              </Link>
              <Link to="/timetable" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <Calendar className="w-4 h-4 shrink-0" /> Timetable Engine
              </Link>
              <Link to="/reports" className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 flex items-center gap-2 font-medium transition-colors">
                <BookOpen className="w-4 h-4 shrink-0" /> Analytics Reports
              </Link>
            </div>
          </div>

          {academicEvents.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
              <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100 mb-3">Upcoming Calendar Milestones</h2>
              <div className="space-y-2 text-xs">
                {academicEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className="flex items-center justify-between">
                    <span className="font-medium truncate">{ev.title}</span>
                    <span className="font-mono text-zinc-500 shrink-0">{ev.startDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
