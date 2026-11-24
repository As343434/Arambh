import {
  ApprovalProcessType,
  ApprovalStage,
  ModuleKey,
  PermissionAction,
  PermissionScope,
  RoleDefinition,
  UserProfile,
  UserRole
} from '../types';

export type Permission =
  | 'university.setup'
  | 'users.manage'
  | 'admissions.manage'
  | 'academics.manage'
  | 'classes.view'
  | 'timetable.manage'
  | 'timetable.view'
  | 'attendance.mark'
  | 'attendance.view'
  | 'lms.manage'
  | 'lms.access'
  | 'assignments.manage'
  | 'assignments.submit'
  | 'exams.manage'
  | 'marks.enter'
  | 'results.approve'
  | 'results.view'
  | 'finance.manage'
  | 'finance.view'
  | 'scholarships.manage'
  | 'library.manage'
  | 'library.view'
  | 'hostel.manage'
  | 'hostel.view'
  | 'transport.manage'
  | 'transport.view'
  | 'hr.manage'
  | 'payroll.manage'
  | 'offices.manage'
  | 'rbac.manage'
  | 'approvals.manage'
  | 'leave.apply'
  | 'events.manage'
  | 'events.view'
  | 'placement.manage'
  | 'placement.view'
  | 'support.manage'
  | 'support.create'
  | 'discipline.manage'
  | 'certificates.manage'
  | 'certificates.request'
  | 'communication.manage'
  | 'reports.view'
  | 'audit.view'
  | 'settings.manage';

export const PERMISSION_ACTIONS: PermissionAction[] = [
  'view', 'create', 'edit', 'delete', 'approve', 'reject', 'publish',
  'export', 'import', 'assign', 'unassign', 'submit', 'review', 'verify',
  'archive', 'restore', 'print', 'override', 'manage', 'send'
];

export const PERMISSION_SCOPES: { value: PermissionScope; label: string }[] = [
  { value: 'own', label: 'Own Records' },
  { value: 'assigned', label: 'Assigned Classes / Tasks' },
  { value: 'team', label: 'Team Scope' },
  { value: 'office', label: 'Office Scope' },
  { value: 'department', label: 'Department Scope' },
  { value: 'campus', label: 'Campus Scope' },
  { value: 'university', label: 'University Scope' },
  { value: 'institution_wide', label: 'Institution-Wide' }
];

export const STANDARD_OFFICES: { name: string; code: string; category: string; description: string }[] = [
  { name: "Registrar's Office", code: 'REG', category: 'Governance & Records', description: 'Student registration, official academic records, transfers, and transcripts.' },
  { name: 'Academic Affairs Office', code: 'ACA', category: 'Academics', description: 'Academic calendar, programs, curriculum oversight, and scheduling coordination.' },
  { name: 'Examination Center', code: 'EXM', category: 'Examinations', description: 'Exam operations, invigilation, marks processing, results approval, and revaluations.' },
  { name: 'Admissions Office', code: 'ADM', category: 'Admissions', description: 'Applicant evaluation, document verification, interviews, and enrollment.' },
  { name: 'Finance & Accounts', code: 'FIN', category: 'Finance', description: 'Fee structures, billing, payments, scholarships, and refunds.' },
  { name: 'Human Resources', code: 'HRD', category: 'Workforce', description: 'Faculty & staff lifecycle, recruitment, contracts, attendance, leave, and payroll.' },
  { name: 'IT & Digital Services', code: 'ITD', category: 'Infrastructure', description: 'Identity provisioning, portal reliability, systems configuration, and IT helpdesk.' },
  { name: 'Student Affairs', code: 'STA', category: 'Student Life', description: 'Student welfare, clubs, grievances, counseling, and disciplinary support.' },
  { name: 'Library', code: 'LIB', category: 'Academic Resources', description: 'Central library holdings, digital archives, circulation, and fines.' },
  { name: 'Hostel Office', code: 'HST', category: 'Residential', description: 'Campus hostels, room capacity, resident allocations, and maintenance.' },
  { name: 'Transport Office', code: 'TRN', category: 'Logistics', description: 'University fleet, bus routes, drivers, and commuter passes.' },
  { name: 'Placement & Career Services', code: 'PLC', category: 'Careers', description: 'Industry partnerships, campus drives, internships, and career placement.' },
  { name: 'Quality Assurance', code: 'IQA', category: 'Accreditation', description: 'Institutional audits, accreditation standards, and outcome metrics.' },
  { name: 'Research & Innovation', code: 'RND', category: 'Research', description: 'Sponsored research, grants, labs, and publication tracking.' },
  { name: 'International Office', code: 'INT', category: 'Global', description: 'Exchange programs, international admissions, and visa compliance.' },
  { name: 'Procurement', code: 'PRC', category: 'Operations', description: 'Vendor onboarding, academic supplies, and asset purchasing.' },
  { name: 'Facilities & Maintenance', code: 'FAC', category: 'Operations', description: 'Campus buildings, classrooms, labs, and infrastructure upkeep.' },
  { name: 'Security', code: 'SEC', category: 'Safety', description: 'Campus access, safety protocols, and incident reporting.' },
  { name: 'Communications', code: 'COM', category: 'Public Relations', description: 'Official university announcements, press, and internal notices.' },
  { name: 'Legal & Compliance', code: 'LEG', category: 'Compliance', description: 'Regulatory compliance, contracts review, and statutory reporting.' }
];

export const MODULES_LIST: { key: ModuleKey; label: string }[] = [
  { key: 'university_setup', label: 'University Setup' },
  { key: 'users_students', label: 'Students & Directory' },
  { key: 'admissions', label: 'Admissions' },
  { key: 'academics', label: 'Academics & Curriculum' },
  { key: 'timetable', label: 'Timetable Engine' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'lms', label: 'LMS & Courses' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'examinations', label: 'Examinations' },
  { key: 'results', label: 'Results & Transcripts' },
  { key: 'finance', label: 'Finance & Fees' },
  { key: 'scholarships', label: 'Scholarships' },
  { key: 'library', label: 'Library' },
  { key: 'hostel', label: 'Hostel' },
  { key: 'transport', label: 'Transport' },
  { key: 'hr_staff', label: 'Faculty & Staff HR' },
  { key: 'payroll', label: 'Payroll (Restricted)' },
  { key: 'offices_teams', label: 'Offices & Teams' },
  { key: 'rbac_security', label: 'Roles & Permissions' },
  { key: 'approvals', label: 'Approval Workflows' },
  { key: 'events', label: 'Events' },
  { key: 'placements', label: 'Placements' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'support_grievances', label: 'Support & Grievances' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'communication', label: 'Communication' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'audit_logs', label: 'Audit Logs' },
  { key: 'it_infrastructure', label: 'IT Infrastructure' },
];

export const ALL_PERMISSIONS: { key: Permission; label: string; category: string }[] = [
  { key: 'university.setup', label: 'University Setup Wizard & Config', category: 'Platform' },
  { key: 'users.manage', label: 'Manage Users, Students & Employees', category: 'Platform' },
  { key: 'offices.manage', label: 'Manage Offices, Teams & Designations', category: 'Workforce' },
  { key: 'rbac.manage', label: 'Roles, Scope & Permission Matrix', category: 'Security' },
  { key: 'approvals.manage', label: 'Configure & Action Approval Workflows', category: 'Workflows' },
  { key: 'admissions.manage', label: 'Admissions Pipeline & Enrollment', category: 'Admissions' },
  { key: 'academics.manage', label: 'Departments, Programs, Courses & Subjects', category: 'Academics' },
  { key: 'classes.view', label: 'View Classes & Sections', category: 'Academics' },
  { key: 'timetable.manage', label: 'Schedule, Auto-Generate & Edit Timetables', category: 'Timetable' },
  { key: 'timetable.view', label: 'View Personal / Class Timetable', category: 'Timetable' },
  { key: 'attendance.mark', label: 'Mark Student Attendance & Review Corrections', category: 'Attendance' },
  { key: 'attendance.view', label: 'View Attendance History & Warnings', category: 'Attendance' },
  { key: 'lms.manage', label: 'Create LMS Modules, Videos, Quizzes & Question Banks', category: 'LMS' },
  { key: 'lms.access', label: 'Access Enrolled Course Materials & Quizzes', category: 'LMS' },
  { key: 'assignments.manage', label: 'Create & Grade Assignments', category: 'LMS' },
  { key: 'assignments.submit', label: 'Submit Assignments', category: 'LMS' },
  { key: 'exams.manage', label: 'Create Exams, Schedules, Rooms & Seating Plans', category: 'Examinations' },
  { key: 'marks.enter', label: 'Enter Internal, Practical, Viva & Theory Marks', category: 'Examinations' },
  { key: 'results.approve', label: 'Approve & Publish Exam Results & Revaluations', category: 'Examinations' },
  { key: 'results.view', label: 'View Results, Grades, GPA & Transcripts', category: 'Examinations' },
  { key: 'finance.manage', label: 'Fee Structures, Invoices, Payments & Refunds', category: 'Finance' },
  { key: 'finance.view', label: 'View Invoices, Receipts & Fee Status', category: 'Finance' },
  { key: 'scholarships.manage', label: 'Manage Scholarships & Approve Applications', category: 'Finance' },
  { key: 'library.manage', label: 'Catalog Books, Issue/Return & Fines', category: 'Campus' },
  { key: 'library.view', label: 'Browse Library & View Issued Books', category: 'Campus' },
  { key: 'hostel.manage', label: 'Manage Hostels, Rooms & Allocations', category: 'Campus' },
  { key: 'hostel.view', label: 'View Personal Hostel Room Allocation', category: 'Campus' },
  { key: 'transport.manage', label: 'Manage Transport Routes, Vehicles & Passes', category: 'Campus' },
  { key: 'transport.view', label: 'View Assigned Transport Route', category: 'Campus' },
  { key: 'hr.manage', label: 'Faculty & Staff HR, Recruitment, Contracts, Leave', category: 'Workforce' },
  { key: 'payroll.manage', label: 'Payroll Processing & Compensation (Restricted)', category: 'Workforce' },
  { key: 'leave.apply', label: 'Apply for Faculty/Staff Leave', category: 'Workforce' },
  { key: 'events.manage', label: 'Create & Manage University Events', category: 'Campus Life' },
  { key: 'events.view', label: 'View & Register for University Events', category: 'Campus Life' },
  { key: 'placement.manage', label: 'Manage Placement Drives & Offers', category: 'Placement' },
  { key: 'placement.view', label: 'Apply to Placement Drives', category: 'Placement' },
  { key: 'support.manage', label: 'Manage Support Tickets & Grievances', category: 'Governance' },
  { key: 'support.create', label: 'Submit Support Tickets & Grievances', category: 'Governance' },
  { key: 'discipline.manage', label: 'Manage Student Disciplinary Records', category: 'Governance' },
  { key: 'certificates.manage', label: 'Approve & Issue Official Certificates', category: 'Governance' },
  { key: 'certificates.request', label: 'Request Official Certificates', category: 'Governance' },
  { key: 'communication.manage', label: 'Post Announcements & Notices', category: 'Communication' },
  { key: 'reports.view', label: 'View Institutional Analytics & Reports', category: 'Analytics' },
  { key: 'audit.view', label: 'Inspect Security & System Audit Logs', category: 'Security' },
  { key: 'settings.manage', label: 'Modify System, Grading & RBAC Settings', category: 'Security' },
];

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  { key: 'super_admin', name: 'Super Admin', category: 'Administration', defaultScope: 'institution_wide', approvalLimit: 99999999, restrictedFields: [], perms: '*' },
  { key: 'university_admin', name: 'University Admin', category: 'Administration', defaultScope: 'university', approvalLimit: 5000000, restrictedFields: [], perms: '*' },
  { key: 'deputy_admin', name: 'Deputy Admin', category: 'Administration', defaultScope: 'university', approvalLimit: 1000000, restrictedFields: ['payroll' as any], perms: ['users.manage', 'offices.manage', 'academics.manage', 'classes.view', 'timetable.manage', 'approvals.manage', 'events.manage', 'support.manage', 'communication.manage', 'reports.view'] },
  { key: 'hod', name: 'Department Head (HOD)', category: 'Academic Affairs', defaultScope: 'department', approvalLimit: 200000, restrictedFields: ['salary'], perms: ['academics.manage', 'classes.view', 'timetable.manage', 'timetable.view', 'attendance.mark', 'attendance.view', 'lms.manage', 'assignments.manage', 'marks.enter', 'results.approve', 'results.view', 'leave.apply', 'hr.manage', 'approvals.manage', 'events.view', 'support.manage', 'discipline.manage', 'communication.manage', 'reports.view'] },
  { key: 'university_registrar', name: 'University Registrar', category: 'Registrar & Records', defaultScope: 'university', approvalLimit: 500000, restrictedFields: ['salary', 'financials'], perms: ['users.manage', 'admissions.manage', 'academics.manage', 'classes.view', 'certificates.manage', 'results.view', 'approvals.manage', 'discipline.manage', 'communication.manage', 'reports.view', 'audit.view'] },
  { key: 'deputy_registrar', name: 'Deputy Registrar', category: 'Registrar & Records', defaultScope: 'university', approvalLimit: 200000, restrictedFields: ['salary', 'financials'], perms: ['users.manage', 'admissions.manage', 'classes.view', 'certificates.manage', 'approvals.manage', 'communication.manage', 'reports.view'] },
  { key: 'registration_officer', name: 'Registration Officer', category: 'Registrar & Records', defaultScope: 'office', approvalLimit: 50000, restrictedFields: ['salary', 'financials'], perms: ['users.manage', 'classes.view', 'admissions.manage', 'approvals.manage'] },
  { key: 'records_officer', name: 'Records Officer', category: 'Registrar & Records', defaultScope: 'office', approvalLimit: 25000, restrictedFields: ['salary', 'financials'], perms: ['users.manage', 'classes.view', 'certificates.manage', 'results.view'] },
  { key: 'transcript_officer', name: 'Transcript Officer', category: 'Registrar & Records', defaultScope: 'office', approvalLimit: 25000, restrictedFields: ['salary', 'financials'], perms: ['results.view', 'certificates.manage', 'approvals.manage'] },
  { key: 'academic_affairs_director', name: 'Academic Affairs Director', category: 'Academic Affairs', defaultScope: 'university', approvalLimit: 300000, restrictedFields: ['salary', 'financials'], perms: ['academics.manage', 'classes.view', 'timetable.manage', 'timetable.view', 'lms.manage', 'approvals.manage', 'reports.view', 'communication.manage'] },
  { key: 'academic_coordinator', name: 'Academic Coordinator', category: 'Academic Affairs', defaultScope: 'department', approvalLimit: 50000, restrictedFields: ['salary', 'financials'], perms: ['academics.manage', 'classes.view', 'timetable.manage', 'timetable.view', 'attendance.view', 'reports.view'] },
  { key: 'curriculum_officer', name: 'Curriculum Officer', category: 'Academic Affairs', defaultScope: 'university', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['academics.manage', 'classes.view', 'lms.manage', 'reports.view'] },
  { key: 'academic_scheduling_officer', name: 'Academic Scheduling Officer', category: 'Academic Affairs', defaultScope: 'campus', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['timetable.manage', 'timetable.view', 'classes.view', 'approvals.manage'] },
  { key: 'exam_controller', name: 'Controller of Examinations', category: 'Examinations', defaultScope: 'university', approvalLimit: 500000, restrictedFields: ['salary', 'financials'], perms: ['exams.manage', 'marks.enter', 'results.approve', 'results.view', 'classes.view', 'timetable.view', 'certificates.manage', 'approvals.manage', 'communication.manage', 'reports.view'] },
  { key: 'deputy_controller', name: 'Deputy Controller', category: 'Examinations', defaultScope: 'university', approvalLimit: 100000, restrictedFields: ['salary', 'financials'], perms: ['exams.manage', 'marks.enter', 'results.approve', 'results.view', 'classes.view', 'approvals.manage'] },
  { key: 'exam_coordinator', name: 'Exam Coordinator', category: 'Examinations', defaultScope: 'department', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['exams.manage', 'results.view', 'classes.view', 'timetable.view'] },
  { key: 'exam_scheduling_officer', name: 'Exam Scheduling Officer', category: 'Examinations', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['exams.manage', 'classes.view', 'timetable.view'] },
  { key: 'exam_operations_officer', name: 'Exam Operations Officer', category: 'Examinations', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['exams.manage', 'classes.view'] },
  { key: 'invigilator', name: 'Invigilator', category: 'Examinations', defaultScope: 'assigned', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['exams.manage', 'attendance.mark', 'attendance.view'] },
  { key: 'marks_processing_officer', name: 'Marks Processing Officer', category: 'Examinations', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['marks.enter', 'results.view', 'exams.manage'] },
  { key: 'results_officer', name: 'Results Officer', category: 'Examinations', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['results.approve', 'results.view', 'certificates.manage'] },
  { key: 'revaluation_officer', name: 'Revaluation Officer', category: 'Examinations', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['results.approve', 'results.view', 'marks.enter', 'approvals.manage'] },
  { key: 'admission_director', name: 'Admission Director', category: 'Admissions', defaultScope: 'university', approvalLimit: 500000, restrictedFields: ['salary'], perms: ['admissions.manage', 'users.manage', 'classes.view', 'approvals.manage', 'communication.manage', 'reports.view'] },
  { key: 'admission_manager', name: 'Admission Manager', category: 'Admissions', defaultScope: 'office', approvalLimit: 100000, restrictedFields: ['salary'], perms: ['admissions.manage', 'users.manage', 'approvals.manage', 'reports.view'] },
  { key: 'admission_officer', name: 'Admission Officer', category: 'Admissions', defaultScope: 'office', approvalLimit: 50000, restrictedFields: ['salary'], perms: ['admissions.manage', 'users.manage', 'classes.view', 'certificates.manage', 'communication.manage', 'reports.view', 'events.view'] },
  { key: 'verification_officer', name: 'Verification Officer', category: 'Admissions', defaultScope: 'assigned', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['admissions.manage', 'certificates.manage'] },
  { key: 'interview_coordinator', name: 'Interview Coordinator', category: 'Admissions', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['admissions.manage', 'events.view', 'communication.manage'] },
  { key: 'admission_counsellor', name: 'Admission Counsellor', category: 'Admissions', defaultScope: 'assigned', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['admissions.manage', 'communication.manage', 'events.view'] },
  { key: 'finance_director', name: 'Finance Director', category: 'Finance', defaultScope: 'university', approvalLimit: 5000000, restrictedFields: [], perms: ['finance.manage', 'finance.view', 'scholarships.manage', 'payroll.manage', 'approvals.manage', 'reports.view', 'audit.view'] },
  { key: 'accountant', name: 'Accountant', category: 'Finance', defaultScope: 'office', approvalLimit: 250000, restrictedFields: ['salary'], perms: ['finance.manage', 'finance.view', 'scholarships.manage', 'approvals.manage', 'reports.view', 'support.create', 'events.view'] },
  { key: 'fee_officer', name: 'Fee Officer', category: 'Finance', defaultScope: 'office', approvalLimit: 50000, restrictedFields: ['salary'], perms: ['finance.manage', 'finance.view', 'reports.view'] },
  { key: 'scholarship_officer', name: 'Scholarship Officer', category: 'Finance', defaultScope: 'office', approvalLimit: 100000, restrictedFields: ['salary'], perms: ['scholarships.manage', 'finance.view', 'approvals.manage'] },
  { key: 'hr_manager', name: 'HR Manager', category: 'HR & Workforce', defaultScope: 'university', approvalLimit: 500000, restrictedFields: [], perms: ['hr.manage', 'payroll.manage', 'offices.manage', 'users.manage', 'attendance.view', 'leave.apply', 'approvals.manage', 'communication.manage', 'reports.view', 'events.view'] },
  { key: 'recruitment_officer', name: 'Recruitment Officer', category: 'HR & Workforce', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['hr.manage', 'communication.manage', 'reports.view'] },
  { key: 'payroll_officer', name: 'Payroll Officer', category: 'HR & Workforce', defaultScope: 'office', approvalLimit: 250000, restrictedFields: ['student_pii'], perms: ['payroll.manage', 'hr.manage', 'reports.view'] },
  { key: 'librarian', name: 'Librarian', category: 'Campus Operations', defaultScope: 'campus', approvalLimit: 25000, restrictedFields: ['salary', 'financials'], perms: ['library.manage', 'library.view', 'events.view', 'support.create', 'reports.view'] },
  { key: 'library_assistant', name: 'Library Assistant', category: 'Campus Operations', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['library.manage', 'library.view'] },
  { key: 'hostel_warden', name: 'Hostel Warden', category: 'Campus Operations', defaultScope: 'assigned', approvalLimit: 50000, restrictedFields: ['salary', 'financials'], perms: ['hostel.manage', 'hostel.view', 'discipline.manage', 'support.manage', 'approvals.manage', 'events.view', 'communication.manage', 'reports.view'] },
  { key: 'transport_manager', name: 'Transport Manager', category: 'Campus Operations', defaultScope: 'campus', approvalLimit: 50000, restrictedFields: ['salary', 'financials'], perms: ['transport.manage', 'transport.view', 'support.manage', 'events.view', 'reports.view'] },
  { key: 'it_administrator', name: 'IT Administrator', category: 'IT & Security', defaultScope: 'university', approvalLimit: 0, restrictedFields: ['salary', 'financials', 'student_pii', 'disciplinary'], perms: ['university.setup', 'offices.manage', 'rbac.manage', 'settings.manage', 'audit.view', 'support.manage'] },
  { key: 'it_support_officer', name: 'IT Support Officer', category: 'IT & Security', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials', 'student_pii', 'disciplinary'], perms: ['support.manage', 'support.create', 'events.view'] },
  { key: 'student_affairs_officer', name: 'Student Affairs Officer', category: 'Campus Operations', defaultScope: 'campus', approvalLimit: 50000, restrictedFields: ['salary', 'financials'], perms: ['support.manage', 'discipline.manage', 'events.manage', 'events.view', 'certificates.manage', 'communication.manage'] },
  { key: 'placement_officer', name: 'Placement Officer', category: 'Campus Operations', defaultScope: 'university', approvalLimit: 50000, restrictedFields: ['salary', 'financials'], perms: ['placement.manage', 'placement.view', 'events.manage', 'events.view', 'communication.manage', 'reports.view'] },
  { key: 'teacher', name: 'Teacher / Lecturer', category: 'Faculty & Research', defaultScope: 'assigned', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['classes.view', 'timetable.view', 'attendance.mark', 'attendance.view', 'lms.manage', 'assignments.manage', 'marks.enter', 'results.view', 'library.view', 'leave.apply', 'events.view', 'support.create', 'communication.manage'] },
  { key: 'professor', name: 'Professor', category: 'Faculty & Research', defaultScope: 'assigned', approvalLimit: 50000, restrictedFields: ['salary', 'financials'], perms: ['classes.view', 'timetable.view', 'attendance.mark', 'attendance.view', 'lms.manage', 'assignments.manage', 'marks.enter', 'results.view', 'library.view', 'leave.apply', 'events.view', 'support.create', 'communication.manage', 'reports.view'] },
  { key: 'teaching_assistant', name: 'Teaching Assistant', category: 'Faculty & Research', defaultScope: 'assigned', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['classes.view', 'timetable.view', 'attendance.mark', 'attendance.view', 'lms.manage', 'assignments.manage', 'leave.apply', 'support.create'] },
  { key: 'research_assistant', name: 'Research Assistant', category: 'Faculty & Research', defaultScope: 'assigned', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['library.view', 'events.view', 'leave.apply', 'support.create'] },
  { key: 'support_staff', name: 'Support Staff', category: 'Campus Operations', defaultScope: 'office', approvalLimit: 0, restrictedFields: ['salary', 'financials', 'student_pii'], perms: ['support.manage', 'support.create', 'events.manage', 'events.view', 'certificates.manage', 'communication.manage'] },
  { key: 'student', name: 'Student', category: 'Student & Guardian', defaultScope: 'own', approvalLimit: 0, restrictedFields: ['salary', 'financials'], perms: ['classes.view', 'timetable.view', 'attendance.view', 'lms.access', 'assignments.submit', 'results.view', 'finance.view', 'library.view', 'hostel.view', 'transport.view', 'events.view', 'placement.view', 'support.create', 'certificates.request'] },
  { key: 'parent', name: 'Parent / Guardian', category: 'Student & Guardian', defaultScope: 'own', approvalLimit: 0, restrictedFields: ['salary'], perms: ['attendance.view', 'timetable.view', 'results.view', 'finance.view', 'hostel.view', 'transport.view', 'events.view', 'support.create'] }
].map(r => ({
  id: r.key,
  key: r.key,
  name: r.name,
  description: `${r.category} · Default scope: ${r.defaultScope.replace('_', ' ')}`,
  category: r.category as RoleDefinition['category'],
  defaultScope: r.defaultScope as PermissionScope,
  approvalLimit: r.approvalLimit,
  isSystem: true,
  isActive: true,
  restrictedFields: r.restrictedFields as RoleDefinition['restrictedFields'],
  matrix: {},
  _legacyPerms: r.perms
})) as (RoleDefinition & { _legacyPerms?: Permission[] | '*' })[];

export const ROLE_METADATA: Record<string, { label: string; portalName: string; description: string; category: string }> = Object.fromEntries(
  DEFAULT_ROLE_DEFINITIONS.map(r => [
    r.key,
    {
      label: r.name,
      portalName: `${r.name} Portal`,
      description: r.description,
      category: r.category
    }
  ])
);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = Object.fromEntries(
  DEFAULT_ROLE_DEFINITIONS.map(r => [
    r.key,
    (r as any)._legacyPerms === '*' ? ALL_PERMISSIONS.map(p => p.key) : ((r as any)._legacyPerms || [])
  ])
);

export const DEFAULT_APPROVAL_WORKFLOWS: { processType: ApprovalProcessType; name: string; stages: ApprovalStage[] }[] = [
  { processType: 'student_registration', name: 'Student Registration', stages: [{ stageOrder: 1, stageName: 'Registration Officer Check', approverRole: 'registration_officer' }, { stageOrder: 2, stageName: 'Registrar Final Approval', approverRole: 'university_registrar' }] },
  { processType: 'course_registration', name: 'Course Registration', stages: [{ stageOrder: 1, stageName: 'Faculty Mentor Review', approverRole: 'teacher' }, { stageOrder: 2, stageName: 'HOD Approval', approverRole: 'hod' }] },
  { processType: 'course_change', name: 'Course Add / Drop / Change', stages: [{ stageOrder: 1, stageName: 'HOD Review', approverRole: 'hod' }, { stageOrder: 2, stageName: 'Academic Affairs Sign-off', approverRole: 'academic_coordinator' }] },
  { processType: 'student_transfer', name: 'Department / Campus Transfer', stages: [{ stageOrder: 1, stageName: 'Department HOD', approverRole: 'hod' }, { stageOrder: 2, stageName: 'University Registrar', approverRole: 'university_registrar' }] },
  { processType: 'attendance_correction', name: 'Attendance Correction', stages: [{ stageOrder: 1, stageName: 'Course Faculty Verification', approverRole: 'teacher' }] },
  { processType: 'leave_request', name: 'Faculty & Staff Leave', stages: [{ stageOrder: 1, stageName: 'HOD / Manager Review', approverRole: 'hod' }, { stageOrder: 2, stageName: 'HR Final Approval', approverRole: 'hr_manager' }] },
  { processType: 'marks_submission', name: 'Marks Submission', stages: [{ stageOrder: 1, stageName: 'HOD Verification', approverRole: 'hod' }, { stageOrder: 2, stageName: 'Marks Processing Officer', approverRole: 'marks_processing_officer' }] },
  { processType: 'result_approval', name: 'Result Approval', stages: [{ stageOrder: 1, stageName: 'Controller of Examinations', approverRole: 'exam_controller' }] },
  { processType: 'result_publication', name: 'Result Publication', stages: [{ stageOrder: 1, stageName: 'Controller Sign-off', approverRole: 'exam_controller' }, { stageOrder: 2, stageName: 'University Admin Release', approverRole: 'university_admin' }] },
  { processType: 'fee_refund', name: 'Fee Refund Request', stages: [{ stageOrder: 1, stageName: 'Accountant Audit', approverRole: 'accountant', maxAmountLimit: 50000 }, { stageOrder: 2, stageName: 'Finance Director Approval', approverRole: 'finance_director' }] },
  { processType: 'scholarship_approval', name: 'Scholarship Award', stages: [{ stageOrder: 1, stageName: 'Scholarship Officer', approverRole: 'scholarship_officer' }, { stageOrder: 2, stageName: 'Finance Director', approverRole: 'finance_director' }] },
  { processType: 'admission_approval', name: 'Admission Offer Approval', stages: [{ stageOrder: 1, stageName: 'Admission Officer', approverRole: 'admission_officer' }, { stageOrder: 2, stageName: 'Admission Director', approverRole: 'admission_director' }] },
  { processType: 'timetable_change', name: 'Timetable Change / Substitution', stages: [{ stageOrder: 1, stageName: 'Scheduling Officer', approverRole: 'academic_scheduling_officer' }, { stageOrder: 2, stageName: 'HOD Approval', approverRole: 'hod' }] },
  { processType: 'transcript_request', name: 'Official Transcript Issuance', stages: [{ stageOrder: 1, stageName: 'Transcript Officer', approverRole: 'transcript_officer' }, { stageOrder: 2, stageName: 'Registrar Verification', approverRole: 'university_registrar' }] },
  { processType: 'hostel_allocation', name: 'Hostel Room Allocation', stages: [{ stageOrder: 1, stageName: 'Hostel Warden', approverRole: 'hostel_warden' }] },
  { processType: 'employee_onboarding', name: 'Employee Onboarding', stages: [{ stageOrder: 1, stageName: 'HR Manager Verification', approverRole: 'hr_manager' }, { stageOrder: 2, stageName: 'IT Provisioning & Activation', approverRole: 'it_administrator' }] },
  { processType: 'profile_update', name: 'Student Official Profile Change', stages: [{ stageOrder: 1, stageName: 'Records Officer Check', approverRole: 'records_officer' }, { stageOrder: 2, stageName: 'Registrar Final Approval', approverRole: 'university_registrar' }] }
];

export function normalizeRole(role?: UserRole | string | null): string {
  if (!role) return 'unassigned';
  if (role === 'admin') return 'university_admin';
  return role;
}

export function isAnyAdminRole(role?: UserRole | string | null): boolean {
  const norm = normalizeRole(role);
  return norm === 'super_admin' || norm === 'university_admin' || norm === 'deputy_admin';
}

export function hasPermission(
  roleOrUser: UserRole | UserProfile | string | null | undefined,
  permission: Permission,
  customMap?: Record<string, string[]>,
  customRoles?: RoleDefinition[]
): boolean {
  const userObj = typeof roleOrUser === 'object' && roleOrUser !== null ? roleOrUser : null;
  const rolesToCheck = userObj
    ? Array.from(new Set([normalizeRole(userObj.role), ...(userObj.roles || []).map(r => normalizeRole(r))]))
    : [normalizeRole(roleOrUser as string)];

  if (rolesToCheck.every(r => r === 'unassigned')) return false;

  // Check permission expiration on user account if present
  if (userObj?.permissionExpiresAt) {
    if (new Date(userObj.permissionExpiresAt).getTime() < Date.now() && !rolesToCheck.includes('super_admin')) {
      return permission === 'support.create';
    }
  }

  for (const r of rolesToCheck) {
    if (r === 'unassigned') continue;
    if (r === 'super_admin') return true;
    const customRoleDef = customRoles?.find(cr => cr.key === r || cr.id === r);
    if (customRoleDef && !customRoleDef.isActive) continue;
    if (customMap && Array.isArray(customMap[r])) {
      if (customMap[r].includes(permission)) return true;
    } else if (DEFAULT_ROLE_PERMISSIONS[r]?.includes(permission)) {
      return true;
    }
  }
  return false;
}

export function canPerformAction(
  user: UserProfile | null | undefined,
  module: ModuleKey,
  action: PermissionAction,
  customRoles?: RoleDefinition[]
): boolean {
  if (!user) return false;
  const roles = Array.from(new Set([normalizeRole(user.role), ...(user.roles || []).map(r => normalizeRole(r))]));
  if (roles.includes('super_admin') || roles.includes('university_admin')) return true;

  if (user.permissionOverrides?.[module]?.includes(action)) return true;

  for (const r of roles) {
    const def = customRoles?.find(cr => cr.key === r || cr.id === r);
    if (def && def.isActive && def.matrix?.[module]?.includes(action)) {
      return true;
    }
  }
  return false;
}

export function canViewRestrictedField(
  user: UserProfile | null | undefined,
  field: 'salary' | 'financials' | 'student_pii' | 'disciplinary' | 'medical',
  customRoles?: RoleDefinition[]
): boolean {
  if (!user) return false;
  const norm = normalizeRole(user.role);
  if (norm === 'super_admin' || norm === 'university_admin') return true;

  // IT Administrator is explicitly blocked from sensitive academic, financial, and employee payroll data unless granted explicit override
  if (norm === 'it_administrator' || norm === 'it_support_officer') return false;

  const customDef = customRoles?.find(c => c.key === norm);
  const def = customDef || DEFAULT_ROLE_DEFINITIONS.find(d => d.key === norm);
  if (!def) return false;
  return !def.restrictedFields.includes(field);
}
