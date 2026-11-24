import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  GraduationCap,
  Layers,
  Lock,
  ShieldCheck,
  Users,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';

const HERO_CAMPUS_IMAGE =
  'https://static.toiimg.com/thumb/msid-111062959,width-1280,height-720,resizemode-4/111062959.jpg';

type PortalCategory = 'all' | 'students' | 'faculty' | 'admin';

interface PortalSpec {
  id: string;
  category: Exclude<PortalCategory, 'all'>;
  title: string;
  scope: string;
  summary: string;
  modules: string;
}

const PORTAL_SPECS: PortalSpec[] = [
  {
    id: 'student',
    category: 'students',
    title: 'Student Self-Service Portal',
    scope: 'Own Academic & Campus Records',
    summary:
      'Access live course registration, personalized weekly timetable, LMS lectures, assignments, quizzes, published grades, degree progress, fee ledger, library loans, hostel, and transport passes.',
    modules: 'My Courses · Registration · Attendance · Exams & Results · Fees · Support'
  },
  {
    id: 'parent',
    category: 'students',
    title: 'Parent & Guardian Portal',
    scope: 'Linked Student Oversight',
    summary:
      'Monitor attendance thresholds, published examination marks, fee invoices, payment receipts, hostel allocations, and institutional circulars for linked wards.',
    modules: 'Attendance · Published Results · Fee Invoices · Campus Notices'
  },
  {
    id: 'faculty',
    category: 'faculty',
    title: 'HOD & Teaching Faculty Workspace',
    scope: 'Department & Assigned Classes',
    summary:
      'Deliver course modules and study materials, publish timed quizzes, mark lecture-wise attendance, grade coursework submissions, approve course requests, and enter examination marks.',
    modules: 'LMS Builder · Question Bank · Attendance · Assignments · Marks Entry'
  },
  {
    id: 'exam',
    category: 'faculty',
    title: 'Examination Controller Center',
    scope: 'Institution-Wide Assessment Governance',
    summary:
      'Schedule semester examinations, assign invigilators, manage seating plans, lock internal marks, verify GPA/CGPA computation, publish results, and resolve revaluation requests.',
    modules: 'Exam Schedules · Marks Verification · Result Publishing · Revaluation'
  },
  {
    id: 'admin',
    category: 'admin',
    title: 'University Admin & IT Governance',
    scope: 'Institution-Wide Control',
    summary:
      'Configure campuses, academic years, grading scales, organizational offices, custom role-permission matrices, account lifecycle policies, and immutable security audit trails.',
    modules: '19-Step Setup Wizard · User Provisioning · RBAC Engine · Audit Logs'
  },
  {
    id: 'registrar',
    category: 'admin',
    title: 'Registrar, Admissions & Campus Ops',
    scope: 'Office & Operational Scope',
    summary:
      'Run merit admissions, issue official certificates, manage fee structures, scholarships, HR payroll, recruitment, library circulation, hostel rooms, transport routes, and placement drives.',
    modules: 'Admissions · Finance & Payroll · HR & Leave · Library · Hostel · Placements'
  }
];

const HIERARCHY_LEVELS = [
  {
    level: '01. University',
    summary: 'Root institutional configuration, branding, grading scales, academic calendar policies, and global settings.'
  },
  {
    level: '02. Campus',
    summary: 'Physical or regional campuses with dedicated buildings, lecture halls, laboratories, hostels, and transport hubs.'
  },
  {
    level: '03. Faculty',
    summary: 'Academic schools and faculties grouping related engineering, sciences, management, and humanities programs.'
  },
  {
    level: '04. Department',
    summary: 'Subject-owning departments led by HODs with degree programs, batches, curriculum credits, and teaching faculty.'
  },
  {
    level: '05. Office',
    summary: 'Administrative offices including Registrar, Admissions, Examinations, Finance, HR, IT Services, Library, and Student Affairs.'
  },
  {
    level: '06. Team',
    summary: 'Operational squads inside offices or departments with team leaders, assigned tasks, and multi-stage approval routing.'
  },
  {
    level: '07. Member',
    summary: 'Individual teaching faculty, non-teaching staff, or enrolled students governed by scoped role permissions.'
  }
];

const INSTITUTIONAL_OFFICES = [
  "Registrar's Office",
  'Academic Affairs',
  'Examination Center',
  'Admissions Office',
  'Finance & Accounts',
  'Human Resources',
  'IT & Digital Services',
  'Student Affairs',
  'University Library',
  'Hostel Office',
  'Transport Office',
  'Placement & Career Services'
];

const FAQS = [
  {
    q: 'How do students, faculty, and staff receive login credentials?',
    a: 'Accounts are provisioned centrally by University Administrators, HR, or the Registrar/Admissions Office with role-based permissions and temporary credentials. On first login, users are required to set a strong personal password.'
  },
  {
    q: 'Does course registration update the student timetable and LMS automatically?',
    a: 'Yes. Once a student registers for a section (or receives advisor approval when enabled), the unified database links their class roster, weekly timetable, attendance register, and LMS course modules automatically.'
  },
  {
    q: 'How are sensitive student, academic, and financial records protected?',
    a: 'Every collection is guarded by server-enforced Firestore security rules, role-scoped directory separation (/users vs /publicProfiles), finance-only ledger updates, re-authentication on password changes, 15-minute idle session timeouts, and immutable audit logs.'
  },
  {
    q: 'Can institutional offices and approval workflows be customized without code?',
    a: 'Yes. Authorized administrators can create or reorganize campuses, faculties, departments, offices, teams, designations, and multi-stage approval workflows directly from the RBAC and Organizational Management modules.'
  }
];

export const Welcome: React.FC = () => {
  const { user, isStudent } = useAuth();
  const { university } = useUniversity();

  const [imgError, setImgError] = useState(false);
  const [portalFilter, setPortalFilter] = useState<PortalCategory>('all');
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const brandName =
    university.name && university.name !== 'University Portal'
      ? university.name
      : 'Arambh University';

  const destinationPath = user ? (isStudent ? '/student-dashboard' : '/dashboard') : '/login';

  const filteredPortals = useMemo(
    () => (portalFilter === 'all' ? PORTAL_SPECS : PORTAL_SPECS.filter(p => p.category === portalFilter)),
    [portalFilter]
  );

  const pillars = [
    {
      index: '01.',
      icon: Calendar,
      title: 'Timetabling & Attendance',
      description:
        'Conflict-free weekly scheduling across rooms and faculty with lecture-wise attendance and threshold alerts.'
    },
    {
      index: '02.',
      icon: BookOpen,
      title: 'Integrated LMS & Coursework',
      description:
        'Structured modules, study notes, video resources, timed quizzes, coursework submissions, and completion tracking.'
    },
    {
      index: '03.',
      icon: Award,
      title: 'Examinations & Transcripts',
      description:
        'Exam schedules, marks entry, grade computation, GPA/CGPA verification, result publishing, and revaluations.'
    },
    {
      index: '04.',
      icon: Wallet,
      title: 'Finance, HR & Campus Ops',
      description:
        'Fee structures, payment verification, scholarships, payroll, library loans, hostel rooms, transport, and placements.'
    }
  ];

  const activeHierarchy = HIERARCHY_LEVELS[selectedLevelIdx];

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-zinc-950 text-[#111111] dark:text-zinc-100">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-[#111111] dark:text-zinc-100 whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <span className="w-8 h-8 rounded-2xl bg-[#111111] dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </span>
            {brandName}
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#52525B] dark:text-zinc-300">
            <a href="#capabilities" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#portals" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Role Portals
            </a>
            <a href="#offices" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Offices
            </a>
            <a href="#governance" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Governance
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={destinationPath}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-2xl transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Workspace' : 'Sign In'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Split Section */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold text-[#52525B] dark:text-zinc-400 mb-3">
                {brandName} · Unified University ERP · Integrated LMS
              </p>

              <h1 className="text-4xl lg:text-[3.25rem] font-bold tracking-tight text-[#111111] dark:text-zinc-100 leading-[1.1] [text-wrap:balance]">
                One connected platform for university academics, campus operations, and learning.
              </h1>

              <p className="mt-5 text-base text-[#52525B] dark:text-zinc-400 leading-relaxed max-w-xl">
                {university.tagline ||
                  'Manage admissions, degree programs, conflict-free timetabling, LMS coursework, examinations, student self-service, finance, HR payroll, library, hostel, and transport inside a single role-governed workspace.'}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={destinationPath}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold rounded-2xl transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'Enter University Portal' : 'Sign In to Portal'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#portals"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 text-[#111111] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold rounded-2xl transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Role Portals
                </a>
              </div>

              {/* Claim-to-Proof Metric Bar */}
              <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#111111] dark:text-zinc-100">20+</p>
                  <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-0.5">Institutional offices</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#111111] dark:text-zinc-100">50+</p>
                  <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-0.5">Permission-scoped roles</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#111111] dark:text-zinc-100">1</p>
                  <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-0.5">Shared campus database</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full min-h-[340px] lg:min-h-[440px] rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 relative shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]">
                {!imgError ? (
                  <>
                    <img
                      src={HERO_CAMPUS_IMAGE}
                      alt={`${brandName} campus building and academic grounds`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 text-white">
                      <p className="text-xs font-medium text-white/80">
                        {university.accreditation
                          ? `${university.accreditation} · Digital Campus Platform`
                          : 'Academic Affairs · Examination Center · Student Portal'}
                      </p>
                      <p className="text-lg sm:text-xl font-semibold tracking-tight mt-1">
                        {brandName} — Unified Academic &amp; Operational Workspace
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-900">
                    <div className="w-14 h-14 rounded-2xl bg-[#111111] dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center mb-4">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <p className="text-base font-semibold text-[#111111] dark:text-zinc-100">{brandName}</p>
                    <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1 max-w-xs">
                      Unified University ERP, Learning Management System, and Campus Services
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-Column Core Capabilities Strip */}
          <div id="capabilities" className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((item) => (
              <div
                key={item.title}
                className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#111111] dark:bg-zinc-800 text-white flex items-center justify-center">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono tabular-nums font-semibold text-[#52525B] dark:text-zinc-400">
                      {item.index}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{item.title}</h2>
                  <p className="mt-2 text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dedicated Role Portals with Working Segmented Filter */}
        <section id="portals" className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div className="max-w-2xl">
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#111111] dark:text-zinc-100 [text-wrap:balance]">
                  Dedicated Role-Based Portals
                </h2>
                <p className="mt-2 text-sm text-[#52525B] dark:text-zinc-400 leading-relaxed">
                  Every stakeholder works inside a focused interface governed by role, office, department, and record ownership rules.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Filter role portals"
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl self-start"
              >
                {(
                  [
                    ['all', 'All Portals'],
                    ['students', 'Students & Guardians'],
                    ['faculty', 'Faculty & Exams'],
                    ['admin', 'Admin & Operations']
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={portalFilter === key}
                    onClick={() => setPortalFilter(key)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                      portalFilter === key
                        ? 'bg-[#111111] text-white dark:bg-white dark:text-zinc-950'
                        : 'text-[#52525B] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-zinc-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPortals.map((portal) => (
                <div
                  key={portal.id}
                  className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] flex flex-col justify-between gap-5"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#111111] dark:text-zinc-200 mt-1 shrink-0" />
                      <div>
                        <h3 className="text-base font-semibold text-[#111111] dark:text-zinc-100">{portal.title}</h3>
                        <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-0.5">
                          Scope: {portal.scope}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed">
                      {portal.summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-[#52525B] dark:text-zinc-400 truncate">{portal.modules}</p>
                    <Link
                      to={destinationPath}
                      className="text-xs font-semibold text-[#111111] dark:text-zinc-100 hover:underline whitespace-nowrap shrink-0"
                    >
                      {user ? 'Open' : 'Sign In'} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Organizational Structure & Institutional Offices */}
        <section id="offices" className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/30 py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2.5 mb-2">
                <Layers className="w-4 h-4 text-[#111111] dark:text-zinc-200" />
                <h2 className="text-xl font-bold text-[#111111] dark:text-zinc-100">
                  Configurable University Hierarchy
                </h2>
              </div>
              <p className="text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed mb-5">
                Select any structural tier to see how permissions, reporting lines, and operational teams connect across the university.
              </p>

              <div className="flex flex-wrap gap-2 mb-5">
                {HIERARCHY_LEVELS.map((item, idx) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setSelectedLevelIdx(idx)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                      selectedLevelIdx === idx
                        ? 'bg-[#111111] text-white border-[#111111] dark:bg-white dark:text-zinc-950 dark:border-white'
                        : 'bg-white dark:bg-zinc-950 text-[#111111] dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.level}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{activeHierarchy.level}</p>
                <p className="mt-1.5 text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed">
                  {activeHierarchy.summary}
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2.5 mb-2">
                <Users className="w-4 h-4 text-[#111111] dark:text-zinc-200" />
                <h2 className="text-xl font-bold text-[#111111] dark:text-zinc-100">
                  Institutional Offices &amp; Services
                </h2>
              </div>
              <p className="text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed mb-5">
                Dedicated workspaces and multi-stage approval routing for academic, administrative, and campus support units.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                {INSTITUTIONAL_OFFICES.map((office, idx) => (
                  <div
                    key={office}
                    className="py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-[#111111] dark:text-zinc-100">{office}</span>
                    <span className="font-mono tabular-nums text-[11px] text-[#52525B] dark:text-zinc-400">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Security, Governance & Portal FAQ */}
        <section id="governance" className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div className="p-7 rounded-3xl bg-[#111111] dark:bg-zinc-900 text-white border border-[#111111] dark:border-zinc-800 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18)]">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Security &amp; Compliance Built In</h2>
                <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
                  Architected around strict least-privilege rules, protected student PII, and verifiable administrative workflows.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-zinc-200">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <span>Server-enforced Firestore RBAC &amp; schema validation per collection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileCheck2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <span>Immutable audit logs and security login event monitoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <span>Brute-force lockout, password re-authentication, and 15-min idle timeout</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-7">
              <h2 className="text-2xl font-bold tracking-tight text-[#111111] dark:text-zinc-100 mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-[#52525B] dark:text-zinc-400 mb-6">
                Common questions for students, faculty members, and university administrators.
              </p>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-b border-zinc-200 dark:border-zinc-800">
                {FAQS.map((item, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div key={item.q} className="py-4">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-4 text-left"
                      >
                        <span className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#52525B] shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="mt-2.5 text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed pr-6">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">
                    Ready to access your institutional workspace?
                  </h3>
                  <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1">
                    Sign in with your university-issued email to load your scoped dashboard and courses.
                  </p>
                </div>
                <Link
                  to={destinationPath}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-xs font-semibold rounded-2xl transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'Go to Dashboard' : 'Proceed to Sign In'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52525B] dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#111111] dark:text-zinc-200 shrink-0" />
            <span className="font-medium text-[#111111] dark:text-zinc-200">{brandName}</span>
            <span aria-hidden="true">·</span>
            <span>University ERP &amp; Learning Management System</span>
            {university.email && (
              <>
                <span aria-hidden="true">·</span>
                <span>{university.email}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-5">
            <a href="#capabilities" className="hover:text-[#111111] dark:hover:text-zinc-100 whitespace-nowrap">
              Modules
            </a>
            <a href="#portals" className="hover:text-[#111111] dark:hover:text-zinc-100 whitespace-nowrap">
              Portals
            </a>
            <Link to={destinationPath} className="font-semibold text-[#111111] dark:text-zinc-100 hover:underline whitespace-nowrap">
              {user ? 'Open Workspace' : 'Sign In'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
