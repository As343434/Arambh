import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import {
  GraduationCap,
  ArrowRight,
  Calendar,
  BookOpen,
  Award,
  Wallet,
  Building2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const Welcome: React.FC = () => {
  const { user, isStudent } = useAuth();
  const { university } = useUniversity();
  const [imgError, setImgError] = useState(false);

  const pillars = [
    {
      icon: Calendar,
      title: 'Conflict-Free Timetable & Attendance',
      description: 'Automatic weekly scheduling across classrooms, labs, and faculty with lecture-wise attendance and threshold alerts.'
    },
    {
      icon: BookOpen,
      title: 'Integrated LMS & Assessments',
      description: 'Structured course modules, video lectures, question banks, timed quizzes, assignments, and student completion tracking.'
    },
    {
      icon: Award,
      title: 'Examinations & Transcripts',
      description: 'Exam scheduling, seating plans, invigilation, marks approval, GPA/CGPA computation, revaluation, and transcripts.'
    },
    {
      icon: Wallet,
      title: 'Finance, Campus & Governance',
      description: 'Fee structures, scholarships, invoices, receipts, library, hostel, transport, HR payroll, placements, and audit logs.'
    }
  ];

  const brandName = university.name && university.name !== 'University Portal' ? university.name : 'University ERP & LMS';

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-zinc-950 text-[#111111] dark:text-zinc-100">
      {/* Three-Zone Top Bar Contract */}
      <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8 border-b border-zinc-200 dark:border-zinc-800">
        <Link to="/" className="text-lg font-bold tracking-tight text-[#111111] dark:text-zinc-100 whitespace-nowrap shrink-0 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-2xl bg-[#111111] dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </span>
          {brandName}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#52525B] dark:text-zinc-300">
          <a href="#modules" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">Modules</a>
          <a href="#portals" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">Role Portals</a>
          <a href="#architecture" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">Architecture</a>
          <Link to="/login" className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0">Portal Login</Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={user ? (isStudent ? '/student-dashboard' : '/dashboard') : '/login'}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-2xl transition-colors whitespace-nowrap shrink-0"
          >
            {user ? 'Open Workspace' : 'Sign In'}
          </Link>
        </div>
      </header>

      {/* Hero Split */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold text-[#52525B] dark:text-zinc-400 mb-3">
              University ERP · Learning Management · Campus Operations
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#111111] dark:text-zinc-100 leading-[1.12] [text-wrap:balance]">
              One connected platform for university academics, operations, and learning.
            </h1>
            <p className="mt-5 text-base text-[#52525B] dark:text-zinc-400 leading-relaxed max-w-xl">
              Unifying permission-based portals — from admissions, curriculum, and conflict-free timetabling to LMS courses, examinations, finance, hostel, library, and placement services.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={user ? (isStudent ? '/student-dashboard' : '/dashboard') : '/login'}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#111111] hover:bg-[#27272A] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white text-sm font-semibold rounded-2xl transition-colors whitespace-nowrap"
              >
                {user ? 'Enter University Portal' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#portals"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-zinc-900 text-[#111111] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold rounded-2xl transition-colors whitespace-nowrap"
              >
                Explore Role Portals
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 relative shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]">
              {!imgError ? (
                <img
                  src="/src/assets/images/university_campus_hero_1795502471369.jpg"
                  alt="University campus quad and academic center"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <Building2 className="w-12 h-12 text-[#111111] dark:text-zinc-200 mb-3" />
                  <p className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{brandName}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Summary Strip */}
        <div id="modules" className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((item) => (
            <div key={item.title} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
              <div className="w-10 h-10 rounded-2xl bg-[#111111] dark:bg-zinc-800 text-white flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{item.title}</h2>
              <p className="mt-2 text-xs text-[#52525B] dark:text-zinc-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role Portals Matrix */}
      <section id="portals" className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl font-bold text-[#111111] dark:text-zinc-100">Dedicated Role-Based Portals</h2>
            <p className="mt-2 text-sm text-[#52525B] dark:text-zinc-400">
              Every stakeholder operates inside a focused workspace scoped strictly by role and permission rules.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['Super Admin & University Admin', '19-step University Setup Wizard, multi-campus infrastructure, RBAC matrix, and full audit trails.'],
              ['Department Head (HOD) & Faculty', 'Curriculum delivery, course LMS modules, video lectures, quizzes, lecture attendance, and marks entry.'],
              ['Student & Parent / Guardian', 'Enrolled courses, weekly timetable, attendance warnings, assignments, transcripts, fees, and campus services.'],
              ['Admission Officer & Registrar', 'Application pipeline, merit shortlisting, document verification, and one-click student enrollment.'],
              ['Examination Controller', 'Exam schedules, seating plan generator, invigilation, result approval, publishing, and revaluation.'],
              ['Finance, HR, Library, Hostel & Transport', 'Invoices, receipts, scholarships, payroll, library circulation, room allotment, bus passes, and placements.']
            ].map(([title, desc]) => (
              <div key={title} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#111111] dark:text-zinc-200 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{title}</h3>
                    <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Footer */}
      <footer id="architecture" className="border-t border-zinc-200 dark:border-zinc-800 py-8 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52525B] dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#111111] dark:text-zinc-200" />
            <span>{brandName} · Normalized Academic &amp; Operations Platform</span>
          </div>
          <Link to="/login" className="font-semibold text-[#111111] dark:text-zinc-100 hover:underline">
            Sign in to portal
          </Link>
        </div>
      </footer>
    </div>
  );
};
