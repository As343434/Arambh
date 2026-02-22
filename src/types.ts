export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: any;
  isFirstLogin?: boolean;
  // Role specific fields
  employeeId?: string; // For teachers
  rollNo?: string;     // For students
  classId?: string;    // For students
  assignedClass?: string;
  assignedSection?: string;
  subjects?: string[];
}

export interface Class {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  students: string[];
}

export interface Attendance {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  records: {
    [studentId: string]: 'present' | 'absent' | 'late';
  };
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: any;
  teacherId: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  submittedAt: any;
  grade?: string;
  feedback?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetRole: UserRole | 'all';
  createdAt: any;
}
