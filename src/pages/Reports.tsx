import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart3, Download, GraduationCap, TrendingUp, Users, Wallet } from 'lucide-react';
import { db } from '../firebase';
import { useUniversity } from '../contexts/UniversityContext';
import { PageHeader, SegmentedTabs, StatCard } from '../components/ui/DataUI';
import { exportToCsv } from '../services/erpService';
import {
  AdmissionApplication,
  Attendance,
  ExamMark,
  HostelAllocation,
  Invoice,
  LibraryIssue,
  PlacementApplication,
  TimetableEntry,
  TransportAllocation
} from '../types';

export const Reports: React.FC = () => {
  const { university, departments, students, teachers, classes } = useUniversity();

  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [libraryIssues, setLibraryIssues] = useState<LibraryIssue[]>([]);
  const [hostelAllocs, setHostelAllocs] = useState<HostelAllocation[]>([]);
  const [transportAllocs, setTransportAllocs] = useState<TransportAllocation[]>([]);
  const [placementApps, setPlacementApps] = useState<PlacementApplication[]>([]);
  const [activeTab, setActiveTab] = useState('academic');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    const subs = [
      onSnapshot(collection(db, 'admissions'), s => setAdmissions(s.docs.map(d => ({ id: d.id, ...d.data() } as AdmissionApplication))), () => {}),
      onSnapshot(collection(db, 'attendance'), s => setAttendance(s.docs.map(d => ({ id: d.id, ...d.data() } as Attendance))), () => {}),
      onSnapshot(collection(db, 'examMarks'), s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark))), () => {}),
      onSnapshot(collection(db, 'invoices'), s => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))), () => {}),
      onSnapshot(collection(db, 'timetable'), s => setTimetable(s.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry))), () => {}),
      onSnapshot(collection(db, 'libraryIssues'), s => setLibraryIssues(s.docs.map(d => ({ id: d.id, ...d.data() } as LibraryIssue))), () => {}),
      onSnapshot(collection(db, 'hostelAllocations'), s => setHostelAllocs(s.docs.map(d => ({ id: d.id, ...d.data() } as HostelAllocation))), () => {}),
      onSnapshot(collection(db, 'transportAllocations'), s => setTransportAllocs(s.docs.map(d => ({ id: d.id, ...d.data() } as TransportAllocation))), () => {}),
      onSnapshot(collection(db, 'placementApplications'), s => setPlacementApps(s.docs.map(d => ({ id: d.id, ...d.data() } as PlacementApplication))), () => {})
    ];
    return () => subs.forEach(u => u());
  }, []);

  const deptEnrollment = useMemo(() => {
    return departments.map(d => ({
      name: d.code || d.name,
      fullName: d.name,
      students: students.filter(s => s.departmentId === d.id).length,
      faculty: teachers.filter(t => t.departmentId === d.id).length,
      classes: classes.filter(c => c.departmentId === d.id).length
    }));
  }, [departments, students, teachers, classes]);

  const financeSummary = useMemo(() => {
    const valid = invoices.filter(i => i.status !== 'refunded');
    const totalBilled = valid.reduce((a, b) => a + (b.totalAmount || 0), 0);
    const totalPaid = valid.reduce((a, b) => a + (b.paidAmount || 0), 0);
    const discountTotal = valid.reduce((a, b) => a + (b.discountAmount || 0), 0);
    return { totalBilled, totalPaid, pending: Math.max(0, totalBilled - totalPaid), discountTotal };
  }, [invoices]);

  const attRate = useMemo(() => {
    if (!attendance.length) return 100;
    const p = attendance.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'excused').length;
    return Math.round((p / attendance.length) * 100);
  }, [attendance]);

  const passRate = useMemo(() => {
    if (!marks.length) return 0;
    const passed = marks.filter(m => m.status === 'pass').length;
    return Math.round((passed / marks.length) * 100);
  }, [marks]);

  const maxDeptStudents = Math.max(1, ...deptEnrollment.map(d => d.students));
  const currency = university.currency || 'INR';

  const exportSnapshot = () => {
    exportToCsv(
      'university_analytics_summary.csv',
      deptEnrollment.map(d => ({
        Department: d.fullName,
        Code: d.name,
        Students: d.students,
        Faculty: d.faculty,
        ActiveClasses: d.classes
      }))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Reports & Analytics"
        subtitle="Real-time metrics across admissions, enrollment, attendance, exam results, faculty workload, finance, and campus operations."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button type="button" onClick={exportSnapshot} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Enrolled Students" value={deptFilter ? students.filter(s => s.departmentId === deptFilter).length : students.length} icon={Users} tone="indigo" />
        <StatCard label="Attendance Average" value={`${attRate}%`} icon={TrendingUp} tone="emerald" />
        <StatCard label="Exam Pass Rate" value={`${passRate}%`} icon={GraduationCap} tone="amber" />
        <StatCard label="Fee Collection" value={`${currency} ${financeSummary.totalPaid.toLocaleString()}`} icon={Wallet} />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'academic', label: 'Enrollment & Academics' },
          { id: 'finance', label: 'Finance & Admissions' },
          { id: 'campus', label: 'Campus & Placements' }
        ]}
      />

      {activeTab === 'academic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SVG Bar Chart: Department Enrollment */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Department Enrollment Distribution</h3>
              <BarChart3 className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="space-y-3">
              {deptEnrollment.map(d => (
                <div key={d.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{d.fullName}</span>
                    <span className="font-mono text-[#52525B] tabular-nums">{d.students} students · {d.faculty} faculty</span>
                  </div>
                  <svg className="w-full h-3 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800" viewBox="0 0 100 6" preserveAspectRatio="none">
                    <rect x="0" y="0" width={Math.max(4, Math.round((d.students / maxDeptStudents) * 100))} height="6" className="fill-[#111111] dark:fill-white" />
                  </svg>
                </div>
              ))}
              {deptEnrollment.length === 0 && <p className="text-xs text-zinc-400 py-6 text-center">No departments configured yet.</p>}
            </div>
          </div>

          {/* Faculty Timetable Load */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <h3 className="text-sm font-semibold">Faculty Scheduled Weekly Sessions</h3>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {teachers.slice(0, 8).map(t => {
                const count = timetable.filter(e => e.teacherId === t.uid || e.substituteTeacherId === t.uid).length;
                return (
                  <div key={t.uid} className="py-2.5 flex items-center justify-between">
                    <span className="font-medium">{t.name}</span>
                    <span className="font-mono tabular-nums text-[#111111] dark:text-zinc-200">{count} / {t.weeklyWorkloadTargetHours || 16} hrs</span>
                  </div>
                );
              })}
              {teachers.length === 0 && <p className="text-xs text-zinc-400 py-6 text-center">No teaching faculty records found.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <h3 className="text-sm font-semibold">Fee & Scholarship Breakdown</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-800"><span>Gross Billed</span><span className="font-mono font-semibold">{currency} {financeSummary.totalBilled.toLocaleString()}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-800"><span>Collected Revenue</span><span className="font-mono font-semibold text-[#111111]">{currency} {financeSummary.totalPaid.toLocaleString()}</span></div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-zinc-800"><span>Outstanding Dues</span><span className="font-mono font-semibold text-[#27272A]">{currency} {financeSummary.pending.toLocaleString()}</span></div>
              <div className="flex justify-between py-2"><span>Scholarship Waivers Applied</span><span className="font-mono font-semibold text-[#111111]">{currency} {financeSummary.discountTotal.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <h3 className="text-sm font-semibold">Admissions Conversion Funnel</h3>
            <div className="space-y-2.5 text-xs">
              {(['applied', 'under_review', 'shortlisted', 'approved', 'enrolled', 'rejected'] as const).map(st => {
                const count = admissions.filter(a => a.status === st).length;
                const pct = admissions.length ? Math.round((count / admissions.length) * 100) : 0;
                return (
                  <div key={st} className="space-y-1">
                    <div className="flex justify-between capitalize"><span>{st.replace('_', ' ')}</span><span className="font-mono">{count} ({pct}%)</span></div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"><div className="h-full bg-[#111111] dark:bg-white dark:text-zinc-950" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'campus' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <p className="text-xs text-[#52525B]">Library Circulation</p>
            <p className="text-2xl font-bold font-mono mt-1">{libraryIssues.filter(i => i.status === 'issued').length}</p>
            <p className="text-xs text-zinc-400 mt-1">Active issued volumes</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <p className="text-xs text-[#52525B]">Hostel Residents</p>
            <p className="text-2xl font-bold font-mono mt-1">{hostelAllocs.filter(a => a.status === 'active').length}</p>
            <p className="text-xs text-zinc-400 mt-1">Currently occupied beds</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <p className="text-xs text-[#52525B]">Transport Commuters</p>
            <p className="text-2xl font-bold font-mono mt-1">{transportAllocs.filter(a => a.status === 'active').length}</p>
            <p className="text-xs text-zinc-400 mt-1">Active student bus passes</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <p className="text-xs text-[#52525B]">Placement Offers</p>
            <p className="text-2xl font-bold font-mono mt-1">{placementApps.filter(a => a.status === 'offered').length}</p>
            <p className="text-xs text-zinc-400 mt-1">Out of {placementApps.length} applications</p>
          </div>
        </div>
      )}
    </div>
  );
};
