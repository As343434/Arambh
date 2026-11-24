import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  Bell,
  FileText,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Calendar,
  Settings,
  GraduationCap,
  Wallet,
  Library,
  Building2,
  Bus,
  Briefcase,
  Award,
  LifeBuoy,
  BarChart3,
  ShieldCheck,
  Search,
  Sun,
  Moon,
  Wand2,
  UserCheck,
  Compass,
  FileCheck2,
  ChevronRight,
  MessageSquare,
  AlertOctagon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUniversity } from '../contexts/UniversityContext';
import { auth, db } from '../firebase';
import { Permission, ROLE_METADATA } from '../config/rbac';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  section:
    | 'Workspace'
    | 'Academics'
    | 'LMS & Exams'
    | 'Finance & Campus'
    | 'Governance'
    | 'Home'
    | 'Learning & Exams'
    | 'Campus & Services'
    | 'Communication & Account';
  hideForRoles?: string[];
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, normalizedRole, isAdmin, isStudent, can } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { university, users, classes, subjects } = useUniversity();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'notices')),
      (snap) => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(n => n.targetRole === 'all' || n.targetRole === normalizedRole || n.targetRole === profile.role || isAdmin)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 6);
        setRecentNotices(list);
      },
      () => {}
    );
    return () => unsub();
  }, [profile?.uid, normalizedRole, profile?.role, isAdmin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const staffNavItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: 'Workspace' },
    { name: 'Setup Wizard', path: '/admin/setup', icon: Wand2, permission: 'university.setup', section: 'Workspace' },
    { name: 'Messages & Notices', path: '/notices', icon: Bell, section: 'Workspace' },
    { name: 'Calendar', path: '/calendar', icon: Calendar, section: 'Workspace' },

    { name: 'Admissions', path: '/admissions', icon: UserCheck, permission: 'admissions.manage', section: 'Academics' },
    { name: 'Users & Students', path: '/admin/users', icon: Users, permission: 'users.manage', section: 'Academics' },
    { name: 'Academic Structure', path: '/admin/academic', icon: Compass, permission: 'academics.manage', section: 'Academics' },
    { name: 'Classes & Sections', path: '/classes', icon: BookOpen, permission: 'classes.view', section: 'Academics' },
    { name: 'Timetable', path: '/timetable', icon: Calendar, permission: 'timetable.view', section: 'Academics' },
    { name: 'Attendance', path: '/attendance', icon: ClipboardCheck, permission: 'attendance.view', section: 'Academics' },

    { name: 'LMS & Courses', path: '/lms', icon: GraduationCap, permission: isStudent ? 'lms.access' : 'lms.manage', section: 'LMS & Exams' },
    { name: 'Assignments', path: '/assignments', icon: FileText, permission: isStudent ? 'assignments.submit' : 'assignments.manage', section: 'LMS & Exams' },
    { name: 'Exams & Results', path: '/examinations', icon: Award, permission: 'results.view', section: 'LMS & Exams' },

    { name: 'Finance & Fees', path: '/finance', icon: Wallet, permission: 'finance.view', section: 'Finance & Campus' },
    { name: 'Library', path: '/library', icon: Library, permission: 'library.view', section: 'Finance & Campus' },
    { name: 'Hostel', path: '/hostel', icon: Building2, permission: 'hostel.view', section: 'Finance & Campus' },
    { name: 'Transport', path: '/transport', icon: Bus, permission: 'transport.view', section: 'Finance & Campus' },
    { name: 'HR & Faculty Staff', path: '/hr', icon: Briefcase, permission: 'hr.manage', section: 'Finance & Campus' },
    { name: 'Offices & Teams', path: '/offices-teams', icon: Building2, permission: 'offices.manage', section: 'Governance' },
    { name: 'Approval Inbox', path: '/approvals', icon: FileCheck2, permission: 'approvals.manage', section: 'Governance' },
    { name: 'Roles & RBAC', path: '/rbac', icon: ShieldCheck, permission: 'rbac.manage', section: 'Governance' },
    { name: 'Faculty Leave', path: '/hr', icon: MessageSquare, permission: 'leave.apply', section: 'Finance & Campus', hideForRoles: ['super_admin', 'university_admin', 'deputy_admin', 'hr_manager', 'hod'] },
    { name: 'Events', path: '/events', icon: Calendar, permission: 'events.view', section: 'Finance & Campus' },
    { name: 'Placements', path: '/placements', icon: Briefcase, permission: 'placement.view', section: 'Finance & Campus' },

    { name: 'Certificates', path: '/certificates', icon: FileCheck2, permission: isStudent ? 'certificates.request' : 'certificates.manage', section: 'Governance' },
    { name: 'Support & Grievances', path: '/support', icon: LifeBuoy, permission: isStudent ? 'support.create' : 'support.manage', section: 'Governance' },
    { name: 'Discipline', path: '/discipline', icon: AlertOctagon, permission: 'discipline.manage', section: 'Governance' },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, permission: 'reports.view', section: 'Governance' },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck, permission: 'audit.view', section: 'Governance' },
    { name: 'Settings', path: '/settings', icon: Settings, permission: 'settings.manage', section: 'Governance' },
    { name: 'My Profile', path: '/profile', icon: UserIcon, section: 'Governance' },
  ];

  const studentNavItems: NavItem[] = [
    { name: 'Dashboard', path: '/student-dashboard', icon: LayoutDashboard, section: 'Home' },
    { name: 'My Profile', path: '/student/profile', icon: UserIcon, section: 'Home' },
    { name: 'Academic Calendar', path: '/calendar', icon: Calendar, section: 'Home' },
    { name: 'Notices & Messages', path: '/notices', icon: Bell, section: 'Home' },

    { name: 'Course Registration', path: '/student/registration', icon: Compass, section: 'Academics' },
    { name: 'My Courses', path: '/student/courses', icon: BookOpen, section: 'Academics' },
    { name: 'Timetable', path: '/timetable', icon: Calendar, permission: 'timetable.view', section: 'Academics' },
    { name: 'Attendance', path: '/attendance', icon: ClipboardCheck, permission: 'attendance.view', section: 'Academics' },

    { name: 'LMS & Quizzes', path: '/lms', icon: GraduationCap, permission: 'lms.access', section: 'Learning & Exams' },
    { name: 'Assignments', path: '/assignments', icon: FileText, permission: 'assignments.submit', section: 'Learning & Exams' },
    { name: 'Exams & Results', path: '/examinations', icon: Award, permission: 'results.view', section: 'Learning & Exams' },

    { name: 'Fees & Scholarships', path: '/finance', icon: Wallet, permission: 'finance.view', section: 'Campus & Services' },
    { name: 'Library', path: '/library', icon: Library, permission: 'library.view', section: 'Campus & Services' },
    { name: 'Hostel', path: '/hostel', icon: Building2, permission: 'hostel.view', section: 'Campus & Services' },
    { name: 'Transport', path: '/transport', icon: Bus, permission: 'transport.view', section: 'Campus & Services' },
    { name: 'Placements & Careers', path: '/placements', icon: Briefcase, permission: 'placement.view', section: 'Campus & Services' },
    { name: 'Certificates', path: '/certificates', icon: FileCheck2, permission: 'certificates.request', section: 'Campus & Services' },
    { name: 'Events & Clubs', path: '/events', icon: Calendar, permission: 'events.view', section: 'Campus & Services' },

    { name: 'Support & Grievances', path: '/support', icon: LifeBuoy, permission: 'support.create', section: 'Communication & Account' },
    { name: 'Settings', path: '/student/settings', icon: Settings, section: 'Communication & Account' },
  ];

  const navItems: NavItem[] = isStudent ? studentNavItems : staffNavItems;

  const visibleItems = useMemo(() => {
    const seenPaths = new Set<string>();
    return navItems.filter(item => {
      if (item.hideForRoles?.includes(normalizedRole)) return false;
      if (item.permission && !can(item.permission)) {
        if (item.path === '/finance' && can('finance.manage')) { /* ok */ }
        else if (item.path === '/library' && can('library.manage')) { /* ok */ }
        else if (item.path === '/hostel' && can('hostel.manage')) { /* ok */ }
        else if (item.path === '/transport' && can('transport.manage')) { /* ok */ }
        else if (item.path === '/lms' && (can('lms.manage') || can('lms.access'))) { /* ok */ }
        else if (item.path === '/assignments' && (can('assignments.manage') || can('assignments.submit'))) { /* ok */ }
        else if (item.path === '/examinations' && (can('exams.manage') || can('marks.enter') || can('results.approve') || can('results.view'))) { /* ok */ }
        else if (item.path === '/timetable' && (can('timetable.manage') || can('timetable.view'))) { /* ok */ }
        else if (item.path === '/attendance' && (can('attendance.mark') || can('attendance.view'))) { /* ok */ }
        else if (item.path === '/support' && (can('support.manage') || can('support.create'))) { /* ok */ }
        else if (item.path === '/certificates' && (can('certificates.manage') || can('certificates.request'))) { /* ok */ }
        else if (item.path === '/placements' && (can('placement.manage') || can('placement.view'))) { /* ok */ }
        else if (item.path === '/events' && (can('events.manage') || can('events.view'))) { /* ok */ }
        else return false;
      }
      if (seenPaths.has(item.path)) return false;
      seenPaths.add(item.path);
      return true;
    });
  }, [normalizedRole, can, isStudent]);

  const sections = isStudent
    ? (['Home', 'Academics', 'Learning & Exams', 'Campus & Services', 'Communication & Account'] as const)
    : (['Workspace', 'Academics', 'LMS & Exams', 'Finance & Campus', 'Governance'] as const);

  const activeNav = visibleItems.find(i => location.pathname === i.path || (i.path !== '/' && location.pathname.startsWith(i.path + '/')));

  const globalResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { pages: visibleItems.slice(0, 5), users: [], subjects: [], classes: [] };
    return {
      pages: visibleItems.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5),
      users: (!isStudent && (isAdmin || can('users.manage') || can('academics.manage')))
        ? users.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.rollNo || u.employeeId || '').toLowerCase().includes(q)).slice(0, 5)
        : [],
      subjects: subjects.filter(s => (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q)).slice(0, 4),
      classes: classes.filter(c => (c.name || '').toLowerCase().includes(q)).slice(0, 4)
    };
  }, [searchQuery, visibleItems, users, subjects, classes, isAdmin, isStudent, can]);

  const roleMeta = ROLE_METADATA[normalizedRole];

  const renderSidebarLinks = (onItemClick?: () => void) => (
    <div className="space-y-5">
      {sections.map(section => {
        const items = visibleItems.filter(i => i.section === section);
        if (!items.length) return null;
        return (
          <div key={section}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wide">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(item => {
                const isActive = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/student-dashboard' && location.pathname.startsWith(item.path + '/'));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#111111] dark:bg-white text-white dark:text-zinc-950 font-semibold shadow-xs'
                        : 'text-[#52525B] dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-[#111111] dark:hover:text-zinc-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-zinc-950 flex text-[#111111] dark:text-zinc-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#FFFFFF] dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link to={isStudent ? '/student-dashboard' : '/dashboard'} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#111111] dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#111111] dark:text-zinc-100 truncate">
                {university.shortName || university.name || 'University Portal'}
              </p>
              <p className="text-[11px] text-[#52525B] dark:text-zinc-400 truncate">
                {roleMeta?.portalName || 'University Portal'}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {renderSidebarLinks()}
        </nav>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            to={isStudent ? '/student/profile' : '/profile'}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-1"
          >
            <div className="w-8 h-8 rounded-xl bg-[#27272A] dark:bg-zinc-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#111111] dark:text-zinc-100 truncate">{profile?.name || 'User'}</p>
              <p className="text-[11px] text-[#52525B] dark:text-zinc-400 truncate">{roleMeta?.label || normalizedRole}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#52525B] dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#111111] dark:hover:text-white rounded-2xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FFFFFF] dark:bg-zinc-950">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 dark:bg-zinc-950/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-2xl text-[#52525B] dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#52525B] dark:text-zinc-400 min-w-0">
              <span className="font-medium text-[#52525B] dark:text-zinc-300 truncate">{university.shortName || university.name || 'Campus'}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span className="font-semibold text-[#111111] dark:text-zinc-100 truncate">
                {activeNav?.name || 'Portal'}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs text-[#52525B] dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline whitespace-nowrap">Quick search</span>
              <kbd className="hidden md:inline font-mono text-[10px] px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md">
                Ctrl K
              </kbd>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 p-2 rounded-2xl text-[#52525B] dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Announcements and notifications"
              >
                <Bell className="w-4 h-4" />
                {recentNotices.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-zinc-950 tabular-nums leading-none">
                    {recentNotices.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111111] dark:text-zinc-100">Recent Announcements</span>
                    <Link
                      to="/notices"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline"
                    >
                      Open all
                    </Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                    {recentNotices.length > 0 ? recentNotices.map(n => (
                      <Link
                        key={n.id}
                        to="/notices"
                        onClick={() => setNotifOpen(false)}
                        className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                      >
                        <p className="text-xs font-semibold text-[#111111] dark:text-zinc-100 truncate">{n.title}</p>
                        <p className="text-[11px] text-[#52525B] dark:text-zinc-400 mt-0.5 line-clamp-2">{n.content}</p>
                        <p className="text-[11px] text-zinc-400 mt-1">{n.authorName}</p>
                      </Link>
                    )) : (
                      <p className="px-4 py-6 text-xs text-zinc-500 text-center">No recent notices.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-2xl text-[#52525B] dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Toggle light or dark mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative w-72 max-w-[85vw] bg-white dark:bg-zinc-950 h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800 z-50">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-bold text-[#111111] dark:text-zinc-100">{university.shortName || university.name}</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {renderSidebarLinks(() => setIsMobileMenuOpen(false))}
              </div>
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#111111] dark:text-zinc-200 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Search Modal */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Jump to module, student, faculty, subject, or class..."
                  className="flex-1 bg-transparent text-sm text-[#111111] dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-xs text-zinc-400 hover:text-[#111111] dark:hover:text-zinc-200"
                >
                  Esc
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-3 space-y-4">
                {globalResults.pages.length > 0 && (
                  <div>
                    <p className="px-2 mb-1 text-[11px] font-semibold text-zinc-400">Navigation</p>
                    <div className="space-y-0.5">
                      {globalResults.pages.map(p => (
                        <button
                          key={p.path}
                          onClick={() => { navigate(p.path); setSearchOpen(false); setSearchQuery(''); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-sm text-[#111111] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <span className="flex items-center gap-2.5">
                            <p.icon className="w-4 h-4 text-[#27272A] dark:text-zinc-300" />
                            {p.name}
                          </span>
                          <span className="text-xs text-zinc-400">{p.section}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {globalResults.users.length > 0 && (
                  <div>
                    <p className="px-2 mb-1 text-[11px] font-semibold text-zinc-400">People</p>
                    <div className="space-y-0.5">
                      {globalResults.users.map(u => (
                        <button
                          key={u.uid}
                          onClick={() => {
                            navigate(u.role === 'student' ? `/students/${u.uid}` : '/admin/users');
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-sm text-[#111111] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <span>{u.name}</span>
                          <span className="text-xs font-mono text-zinc-400">{u.rollNo || u.employeeId || u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {globalResults.subjects.length > 0 && (
                  <div>
                    <p className="px-2 mb-1 text-[11px] font-semibold text-zinc-400">Subjects</p>
                    <div className="space-y-0.5">
                      {globalResults.subjects.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            navigate(isStudent ? '/student/courses' : can('academics.manage') ? '/admin/academic' : '/lms');
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-sm text-[#111111] dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <span>{s.name}</span>
                          <span className="text-xs font-mono text-zinc-400">{s.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {globalResults.pages.length === 0 && globalResults.users.length === 0 && globalResults.subjects.length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-6">No matching results found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
