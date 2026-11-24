export type UserRole =
  | 'super_admin'
  | 'university_admin'
  | 'deputy_admin'
  | 'admin'
  | 'hod'
  | 'university_registrar'
  | 'deputy_registrar'
  | 'registration_officer'
  | 'records_officer'
  | 'transcript_officer'
  | 'academic_affairs_director'
  | 'academic_coordinator'
  | 'curriculum_officer'
  | 'academic_scheduling_officer'
  | 'exam_controller'
  | 'deputy_controller'
  | 'exam_coordinator'
  | 'exam_scheduling_officer'
  | 'exam_operations_officer'
  | 'invigilator'
  | 'marks_processing_officer'
  | 'results_officer'
  | 'revaluation_officer'
  | 'admission_director'
  | 'admission_manager'
  | 'admission_officer'
  | 'verification_officer'
  | 'interview_coordinator'
  | 'admission_counsellor'
  | 'finance_director'
  | 'accountant'
  | 'fee_officer'
  | 'scholarship_officer'
  | 'hr_manager'
  | 'recruitment_officer'
  | 'payroll_officer'
  | 'librarian'
  | 'library_assistant'
  | 'hostel_warden'
  | 'transport_manager'
  | 'it_administrator'
  | 'it_support_officer'
  | 'student_affairs_officer'
  | 'placement_officer'
  | 'teacher'
  | 'professor'
  | 'teaching_assistant'
  | 'research_assistant'
  | 'support_staff'
  | 'student'
  | 'parent';

export type AccountStatus = 'active' | 'inactive' | 'suspended' | 'graduated' | 'alumni' | 'on_leave' | 'exited' | 'revoked';

export type PermissionAction =
  | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'reject'
  | 'publish' | 'export' | 'import' | 'assign' | 'unassign'
  | 'submit' | 'review' | 'verify' | 'archive' | 'restore'
  | 'print' | 'override' | 'manage' | 'send';

export type PermissionScope =
  | 'own'
  | 'assigned'
  | 'team'
  | 'office'
  | 'department'
  | 'campus'
  | 'university'
  | 'institution_wide';

export type ModuleKey =
  | 'university_setup'
  | 'users_students'
  | 'admissions'
  | 'academics'
  | 'timetable'
  | 'attendance'
  | 'lms'
  | 'assignments'
  | 'examinations'
  | 'results'
  | 'finance'
  | 'scholarships'
  | 'library'
  | 'hostel'
  | 'transport'
  | 'hr_staff'
  | 'payroll'
  | 'offices_teams'
  | 'rbac_security'
  | 'approvals'
  | 'events'
  | 'placements'
  | 'certificates'
  | 'support_grievances'
  | 'discipline'
  | 'communication'
  | 'reports'
  | 'audit_logs'
  | 'it_infrastructure';

export interface RoleDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  category: 'Administration' | 'Registrar & Records' | 'Academic Affairs' | 'Examinations' | 'Admissions' | 'Finance' | 'HR & Workforce' | 'Campus Operations' | 'IT & Security' | 'Faculty & Research' | 'Student & Guardian';
  defaultScope: PermissionScope;
  approvalLimit: number;
  isSystem: boolean;
  isActive: boolean;
  restrictedFields: ('salary' | 'financials' | 'student_pii' | 'disciplinary' | 'medical')[];
  matrix: Partial<Record<ModuleKey, PermissionAction[]>>;
  updatedAt?: any;
}

export interface StudentDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  verified: boolean;
  uploadedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  photoUrl?: string;
  role: UserRole;
  roles?: string[]; // Multiple assigned roles
  scope?: PermissionScope;
  permissionOverrides?: Partial<Record<ModuleKey, PermissionAction[]>>;
  permissionExpiresAt?: string;
  approvalLimit?: number;
  delegatedToUid?: string;
  status?: AccountStatus;
  employeeType?: 'teaching' | 'non_teaching' | 'executive' | 'contract';
  employmentType?: 'full_time' | 'part_time' | 'visiting' | 'adjunct' | 'probation';
  createdAt?: any;
  isFirstLogin?: boolean;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelation?: string;
  // Org & Academic hierarchy links
  campusId?: string;
  facultyId?: string;
  departmentId?: string;
  officeId?: string;
  teamId?: string;
  designationId?: string;
  reportingManagerId?: string;
  isTeamLeader?: boolean;
  programId?: string;
  batchId?: string;
  academicYearId?: string;
  semesterId?: string;
  semesterNumber?: number;
  classId?: string;
  section?: string;
  assignedClass?: string;
  assignedSection?: string;
  rollNo?: string;
  studentId?: string;
  employeeId?: string;
  designation?: string;
  qualification?: string;
  specialization?: string;
  joiningDate?: string;
  weeklyWorkloadTargetHours?: number;
  salaryBasic?: number;
  salaryAllowances?: number;
  subjects?: string[];
  parentOfStudentIds?: string[];
  admissionId?: string;
  admissionDate?: string;
  documents?: StudentDocument[];
  scholarshipIds?: string[];
  hostelId?: string;
  hostelRoomId?: string;
  transportRouteId?: string;
  registrationHold?: boolean;
  registrationHoldReason?: string;
  academicStanding?: 'good_standing' | 'probation' | 'honors';
  advisorId?: string;
  resumeUrl?: string;
  resumeSummary?: string;
  skills?: string[];
  preferences?: {
    emailNotifs?: boolean;
    smsNotifs?: boolean;
    assignmentReminders?: boolean;
    examAlerts?: boolean;
    profileVisibility?: 'university' | 'classmates' | 'private';
    language?: string;
    twoFactorEnabled?: boolean;
  };
}

export interface InstitutionalOffice {
  id: string;
  name: string;
  code: string;
  category: string;
  campusId?: string;
  departmentId?: string;
  directorId?: string;
  directorName?: string;
  managerId?: string;
  managerName?: string;
  scope: PermissionScope;
  description: string;
  workflowEnabled: boolean;
  allowedModules: ModuleKey[];
  status: 'active' | 'inactive';
  createdAt?: any;
}

export interface InstitutionalTeam {
  id: string;
  name: string;
  code: string;
  officeId?: string;
  departmentId?: string;
  campusId?: string;
  leaderId?: string;
  leaderName?: string;
  memberIds: string[];
  description: string;
  scope: PermissionScope;
  permissions: Partial<Record<ModuleKey, PermissionAction[]>>;
  workflowStageName?: string;
  status: 'active' | 'inactive';
  createdAt?: any;
}

export interface TeamTask {
  id: string;
  teamId: string;
  teamName?: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  createdAt?: any;
}

export interface Designation {
  id: string;
  title: string;
  code: string;
  category: 'teaching' | 'non_teaching' | 'executive';
  gradeLevel: string;
  departmentId?: string;
  officeId?: string;
  defaultRoleKey?: string;
}

export interface EmploymentContract {
  id: string;
  employeeId: string;
  employeeName: string;
  contractNumber: string;
  contractType: 'permanent' | 'fixed_term' | 'visiting' | 'probation';
  startDate: string;
  endDate?: string;
  salaryBasic: number;
  allowances: number;
  weeklyHours: number;
  status: 'active' | 'expiring' | 'expired' | 'terminated';
  notes?: string;
  createdAt?: any;
}

export interface StaffPerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  period: string;
  rating: number; // 1 to 5
  teachingScore?: number;
  researchScore?: number;
  administrationScore?: number;
  goals: string;
  remarks: string;
  status: 'draft' | 'submitted' | 'acknowledged';
  createdAt?: any;
}

export interface RecruitmentOpening {
  id: string;
  title: string;
  departmentId?: string;
  officeId?: string;
  designationId?: string;
  employeeType: 'teaching' | 'non_teaching';
  vacancies: number;
  closingDate: string;
  description: string;
  status: 'open' | 'interviewing' | 'closed';
  createdAt?: any;
}

export interface RecruitmentApplicant {
  id: string;
  openingId: string;
  openingTitle: string;
  name: string;
  email: string;
  phone: string;
  qualification: string;
  experienceYears: number;
  status: 'applied' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected';
  notes?: string;
  createdAt?: any;
}

export type ApprovalProcessType =
  | 'student_registration'
  | 'course_registration'
  | 'course_change'
  | 'student_transfer'
  | 'attendance_correction'
  | 'leave_request'
  | 'marks_submission'
  | 'result_approval'
  | 'result_publication'
  | 'fee_refund'
  | 'fee_payment_verification'
  | 'scholarship_approval'
  | 'admission_approval'
  | 'timetable_change'
  | 'transcript_request'
  | 'hostel_allocation'
  | 'employee_onboarding'
  | 'profile_update';

export interface ApprovalStage {
  stageOrder: number;
  stageName: string;
  approverRole: string;
  approverOfficeId?: string;
  maxAmountLimit?: number;
  escalateAfterHours?: number;
}

export interface ApprovalWorkflowConfig {
  id: string;
  processType: ApprovalProcessType;
  name: string;
  isActive: boolean;
  requireSequential: boolean;
  stages: ApprovalStage[];
  updatedAt?: any;
}

export interface ApprovalHistoryItem {
  stageName: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'escalated';
  comment: string;
  timestamp: string;
}

export interface ApprovalRequest {
  id: string;
  processType: ApprovalProcessType;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  targetEntityId?: string;
  targetCollection?: string;
  departmentId?: string;
  officeId?: string;
  amount?: number;
  currentStageIndex: number;
  stages: ApprovalStage[];
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  delegatedToUid?: string;
  history: ApprovalHistoryItem[];
  createdAt?: any;
}

export interface UniversityProfile {
  id: string;
  name: string;
  shortName: string;
  code: string;
  tagline: string;
  accreditation: string;
  establishedYear: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  currency: string;
  setupCompletedSteps: number[];
  isSetupComplete: boolean;
  updatedAt?: any;
}

export interface GradeBand {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  remarks: string;
}

export interface TimetableSlotConfig {
  workingDays: string[];
  dayStartTime: string;
  dayEndTime: string;
  slotDurationMinutes: number;
  breaks: { name: string; startTime: string; endTime: string }[];
}

export interface SystemSettings {
  id: string;
  attendanceThreshold: number;
  lateGraceMinutes: number;
  passingPercentage: number;
  feeLateFeePerDay: number;
  lmsAutoEnroll: boolean;
  allowOnlineExams: boolean;
  allowStudentCorrectionRequests: boolean;
  gradingScale: GradeBand[];
  timetableConfig: TimetableSlotConfig;
  registrationConfig?: {
    isOpen: boolean;
    minCredits: number;
    maxCredits: number;
    allowAddDrop: boolean;
    addDropDeadline?: string;
    requireAdvisorApproval: boolean;
    enforcePrerequisites: boolean;
  };
  updatedAt?: any;
}

export interface Campus {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface Building {
  id: string;
  campusId: string;
  name: string;
  code: string;
  floors: number;
}

export interface Room {
  id: string;
  campusId: string;
  buildingId: string;
  roomNumber: string;
  name: string;
  type: 'classroom' | 'lab' | 'auditorium' | 'exam_hall' | 'seminar';
  capacity: number;
  floor: string;
  facilities: string[];
}

export interface Faculty {
  id: string;
  name: string;
  code: string;
  deanId?: string;
}

export interface Department {
  id: string;
  facultyId?: string;
  campusId?: string;
  name: string;
  code: string;
  hodId?: string;
  email?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Semester {
  id: string;
  academicYearId: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Program {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  degreeType: 'UG' | 'PG' | 'Diploma' | 'PhD';
  durationYears: number;
  totalSemesters: number;
  totalCredits: number;
}

export interface Course {
  id: string;
  programId: string;
  departmentId: string;
  semesterNumber: number;
  code: string;
  name: string;
  description: string;
  credits: number;
  type: 'core' | 'elective' | 'lab';
}

export interface Subject {
  id: string;
  courseId?: string;
  departmentId?: string;
  programId?: string;
  semesterNumber?: number;
  code: string;
  name: string;
  credits: number;
  lectureHours: number;
  labHours: number;
  type: 'theory' | 'practical' | 'project';
  maxMarks: number;
  passingMarks: number;
  prerequisiteSubjectIds?: string[];
  syllabus?: string;
  isElective?: boolean;
}

export interface Batch {
  id: string;
  programId: string;
  academicYearId?: string;
  name: string;
  startYear: number;
  endYear: number;
}

export interface Class {
  id: string;
  name: string;
  subject?: string;
  subjectIds?: string[];
  teacherId?: string;
  mentorId?: string;
  departmentId?: string;
  programId?: string;
  batchId?: string;
  semesterId?: string;
  section?: string;
  roomId?: string;
  maxCapacity?: number;
  students: string[];
}

export interface AcademicEvent {
  id: string;
  title: string;
  type: 'holiday' | 'exam' | 'semester_start' | 'event' | 'deadline';
  startDate: string;
  endDate: string;
  description: string;
  campusId?: string;
}

export interface RolePermissionDoc {
  id: string;
  role: string;
  label: string;
  permissions: string[];
  updatedAt?: any;
}

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  applicantName: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  programId: string;
  departmentId: string;
  batchId?: string;
  previousInstitution: string;
  academicScore: number;
  status: 'applied' | 'under_review' | 'shortlisted' | 'approved' | 'enrolled' | 'rejected';
  notes?: string;
  enrolledUid?: string;
  reviewedBy?: string;
  createdAt?: any;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  className: string;
  departmentId?: string;
  mentorId?: string;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  teacherName?: string;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
  roomId?: string;
  room?: string;
  day: string;
  startTime: string;
  endTime: string;
  type?: 'lecture' | 'lab' | 'tutorial';
  status?: 'scheduled' | 'rescheduled' | 'cancelled';
  rescheduledDate?: string;
  notes?: string;
}

export interface Attendance {
  id: string;
  classId: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  timetableId?: string;
  teacherId?: string;
  studentId: string;
  studentName?: string;
  rollNo?: string;
  date: string;
  sessionType?: 'lecture' | 'daily' | 'practical';
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  createdAt?: any;
}

export interface AttendanceCorrection {
  id: string;
  attendanceId?: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subjectId?: string;
  subjectName?: string;
  date: string;
  currentStatus: string;
  requestedStatus: 'present' | 'late' | 'excused';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  createdAt?: any;
}

export interface LmsModule {
  id: string;
  subjectId: string;
  subjectName?: string;
  classId: string;
  className?: string;
  teacherId: string;
  title: string;
  description: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt?: any;
}

export interface LmsMaterial {
  id: string;
  moduleId: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  title: string;
  type: 'pdf' | 'document' | 'presentation' | 'video' | 'recorded_session' | 'live_link' | 'notes';
  url?: string;
  content?: string;
  durationMinutes?: number;
  createdAt?: any;
}

export interface LmsProgress {
  id: string;
  studentId: string;
  materialId: string;
  subjectId: string;
  classId: string;
  completed: boolean;
  completedAt?: any;
}

export interface LmsDiscussionReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface LmsDiscussion {
  id: string;
  subjectId: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  replies: LmsDiscussionReply[];
  createdAt?: any;
}

export interface Assignment {
  id: string;
  classId: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  title: string;
  description: string;
  dueDate: any;
  maxMarks?: number;
  attachmentUrl?: string;
  teacherId: string;
  createdAt?: any;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle?: string;
  classId?: string;
  studentId: string;
  studentName?: string;
  content: string;
  attachmentUrl?: string;
  attachments?: string[];
  isDraft?: boolean;
  resubmissionCount?: number;
  submittedAt: any;
  status?: 'draft' | 'submitted' | 'graded' | 'late';
  marks?: number;
  grade?: string;
  feedback?: string;
  gradedBy?: string;
}

export interface QuestionBankItem {
  id: string;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  question: string;
  questionType?: 'mcq' | 'multi_select' | 'true_false' | 'short_answer';
  options: string[];
  correctOptionIndex: number;
  correctOptionIndices?: number[];
  correctTextAnswer?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface QuizQuestion {
  question: string;
  questionType?: 'mcq' | 'multi_select' | 'true_false' | 'short_answer';
  options: string[];
  correctOptionIndex: number;
  correctOptionIndices?: number[];
  correctTextAnswer?: string;
  marks: number;
}

export interface Quiz {
  id: string;
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  dueDate: string;
  questions: QuizQuestion[];
  isPublished: boolean;
  isPractice?: boolean;
  randomizeQuestions?: boolean;
  maxAttempts?: number;
  allowReview?: boolean;
  createdAt?: any;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle?: string;
  studentId: string;
  studentName: string;
  answers: number[];
  multiAnswers?: Record<string, number[]>;
  textAnswers?: string[];
  score?: number;
  totalMarks?: number;
  percentage?: number;
  needsManualGrading?: boolean;
  status?: 'pending' | 'graded';
  gradedBy?: string;
  submittedAt?: any;
}

export interface Exam {
  id: string;
  title: string;
  examType: 'midterm' | 'final' | 'internal' | 'practical' | 'viva' | 'supplementary';
  academicYearId?: string;
  semesterId?: string;
  departmentId?: string;
  programId?: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'results_published';
  resultsApprovedBy?: string;
  createdAt?: any;
}

export interface ExamSeat {
  rollNo: string;
  studentId: string;
  studentName: string;
  seatNo: string;
}

export interface ExamSchedule {
  id: string;
  examId: string;
  examTitle?: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomName: string;
  invigilatorId?: string;
  invigilatorName?: string;
  maxMarks: number;
  passingMarks: number;
  seatingPlan?: ExamSeat[];
}

export interface ExamMark {
  id: string;
  examId: string;
  examTitle?: string;
  examScheduleId?: string;
  subjectId: string;
  subjectName: string;
  credits?: number;
  classId: string;
  className?: string;
  semesterNumber?: number;
  studentId: string;
  studentName: string;
  rollNo: string;
  internalMarks: number;
  practicalMarks: number;
  vivaMarks: number;
  theoryMarks: number;
  totalMarks: number;
  maxMarks: number;
  grade: string;
  gradePoint: number;
  status: 'pass' | 'fail' | 'absent';
  isPublished: boolean;
  enteredBy?: string;
}

export interface RevaluationRequest {
  id: string;
  examMarkId: string;
  examId: string;
  examTitle?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  currentMarks: number;
  reason: string;
  status: 'pending' | 'reviewed' | 'updated' | 'rejected';
  updatedMarks?: number;
  reviewedBy?: string;
  createdAt?: any;
}

export interface FeeStructure {
  id: string;
  name: string;
  programId?: string;
  departmentId?: string;
  semesterId?: string;
  category: 'tuition' | 'semester' | 'admission' | 'exam' | 'hostel' | 'transport' | 'lab';
  amount: number;
  dueDate: string;
  lateFeePerDay: number;
  description: string;
}

export interface Scholarship {
  id: string;
  name: string;
  code: string;
  type: 'merit' | 'need' | 'sports' | 'research' | 'alumni';
  discountType: 'percentage' | 'fixed';
  value: number;
  eligibilityCriteria: string;
  status: 'active' | 'closed';
}

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  studentId: string;
  studentName: string;
  statement: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  createdAt?: any;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  feeStructureId?: string;
  title: string;
  category: string;
  baseAmount: number;
  discountAmount: number;
  scholarshipName?: string;
  lateFeeAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'refunded';
  createdAt?: any;
}

export interface Payment {
  id: string;
  receiptNo: string;
  invoiceId: string;
  invoiceNo?: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: 'card' | 'bank_transfer' | 'upi' | 'cash' | 'scholarship';
  transactionRef: string;
  status: 'completed' | 'refunded';
  refundReason?: string;
  collectedBy?: string;
  paidAt?: any;
}

export interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  publisher: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
}

export interface LibraryIssue {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'returned' | 'overdue';
  fineAmount: number;
  finePaid: boolean;
}

export interface Hostel {
  id: string;
  name: string;
  type: 'boys' | 'girls' | 'co-ed';
  wardenId?: string;
  wardenName?: string;
  totalRooms: number;
  address: string;
}

export interface HostelRoom {
  id: string;
  hostelId: string;
  hostelName: string;
  roomNumber: string;
  floor: string;
  capacity: number;
  occupiedCount: number;
  monthlyFee: number;
  occupants: string[];
}

export interface HostelAllocation {
  id: string;
  hostelId: string;
  hostelName: string;
  roomId: string;
  roomNumber: string;
  studentId: string;
  studentName: string;
  allocatedDate: string;
  status: 'active' | 'vacated';
}

export interface TransportRoute {
  id: string;
  routeName: string;
  routeCode: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  stops: string[];
  monthlyFee: number;
}

export interface TransportAllocation {
  id: string;
  routeId: string;
  routeName: string;
  stopName: string;
  studentId: string;
  studentName: string;
  status: 'active' | 'cancelled';
  assignedAt: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  departmentId?: string;
  officeId?: string;
  leaveType: 'casual' | 'sick' | 'earned' | 'academic';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  createdAt?: any;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  employeeId?: string;
  month: string;
  year: number;
  basicPay: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'pending' | 'processed' | 'paid';
  paidAt?: any;
  transactionRef?: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  checkIn?: string;
  checkOut?: string;
  markedBy?: string;
}

export interface UniversityEvent {
  id: string;
  title: string;
  category: 'academic' | 'cultural' | 'sports' | 'workshop' | 'seminar' | 'convocation';
  date: string;
  time: string;
  venue: string;
  organizer: string;
  description: string;
  maxParticipants: number;
  registeredUserIds: string[];
}

export interface PlacementDrive {
  id: string;
  companyName: string;
  role: string;
  packageLpa: number;
  location: string;
  eligibilityCgpa: number;
  driveDate: string;
  deadline: string;
  description: string;
  status: 'open' | 'ongoing' | 'closed';
}

export interface PlacementApplication {
  id: string;
  driveId: string;
  companyName: string;
  role: string;
  studentId: string;
  studentName: string;
  cgpa: number;
  resumeNote: string;
  status: 'applied' | 'shortlisted' | 'interview' | 'offered' | 'rejected';
  packageOffered?: number;
  appliedAt?: any;
}

export interface SupportTicket {
  id: string;
  ticketNo: string;
  userId: string;
  userName: string;
  userRole: string;
  category: 'academic' | 'it' | 'finance' | 'hostel' | 'transport' | 'grievance' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  isGrievance: boolean;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  resolutionNote?: string;
  createdAt?: any;
}

export interface DisciplineRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  incidentDate: string;
  category: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  actionTaken: string;
  reportedBy: string;
  status: 'open' | 'resolved';
}

export interface CertificateRequest {
  id: string;
  certificateNo: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  type: 'bonafide' | 'transcript' | 'degree' | 'migration' | 'character' | 'course_completion';
  status: 'requested' | 'approved' | 'issued' | 'rejected';
  purpose: string;
  issuedAt?: string;
  issuedBy?: string;
  createdAt?: any;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt?: any;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetRole: UserRole | 'all' | 'class';
  targetClassId?: string | null;
  targetClassName?: string | null;
  targetDepartmentId?: string | null;
  priority?: 'normal' | 'important' | 'urgent';
  createdAt: any;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  module: string;
  targetId?: string;
  details: string;
  timestamp?: any;
}

export interface CourseRegistration {
  id: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  semesterId?: string;
  semesterNumber?: number;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  classId: string;
  className: string;
  credits: number;
  courseType: 'core' | 'elective' | 'lab';
  status: 'registered' | 'waitlisted' | 'dropped' | 'pending_approval';
  createdAt?: any;
}

export interface AdvisingAppointment {
  id: string;
  studentId: string;
  studentName: string;
  advisorId: string;
  advisorName: string;
  date: string;
  time: string;
  topic: string;
  notes?: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  createdAt?: any;
}

export interface LibraryReservation {
  id: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  status: 'reserved' | 'fulfilled' | 'cancelled';
  createdAt?: any;
}

export interface HostelRequest {
  id: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  requestType: 'application' | 'maintenance' | 'complaint';
  roomNumber?: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  resolutionNote?: string;
  createdAt?: any;
}

export interface TransportRequest {
  id: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  routeId: string;
  routeName: string;
  stopName: string;
  requestType: 'new_pass' | 'route_change' | 'cancel';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
}

export interface StudentClub {
  id: string;
  name: string;
  category: 'academic' | 'cultural' | 'sports' | 'technical' | 'social';
  coordinatorName: string;
  description: string;
  meetingSchedule: string;
  memberIds: string[];
  createdAt?: any;
}

export interface ExamRegistration {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  subjectId?: string;
  subjectName?: string;
  examCategory: 'regular' | 'supplementary' | 'backlog';
  status: 'registered' | 'approved' | 'admit_ready';
  createdAt?: any;
}
