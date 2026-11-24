import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import {
  AcademicEvent,
  AcademicYear,
  ApprovalRequest,
  ApprovalWorkflowConfig,
  Batch,
  Building,
  Campus,
  Class,
  Course,
  Department,
  Designation,
  EmploymentContract,
  Faculty,
  InstitutionalOffice,
  InstitutionalTeam,
  Program,
  RoleDefinition,
  Room,
  Semester,
  Subject,
  SystemSettings,
  UniversityProfile,
  UserProfile
} from '../types';
import { DEFAULT_GRADING_SCALE, DEFAULT_TIMETABLE_CONFIG } from '../services/erpService';

interface UniversityContextType {
  university: UniversityProfile;
  settings: SystemSettings;
  campuses: Campus[];
  buildings: Building[];
  rooms: Room[];
  faculties: Faculty[];
  departments: Department[];
  offices: InstitutionalOffice[];
  teams: InstitutionalTeam[];
  designations: Designation[];
  contracts: EmploymentContract[];
  roles: RoleDefinition[];
  approvalWorkflows: ApprovalWorkflowConfig[];
  approvalRequests: ApprovalRequest[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  programs: Program[];
  courses: Course[];
  subjects: Subject[];
  batches: Batch[];
  classes: Class[];
  academicEvents: AcademicEvent[];
  users: UserProfile[];
  teachers: UserProfile[];
  employees: UserProfile[];
  students: UserProfile[];
  loading: boolean;
}

const defaultUniversity: UniversityProfile = {
  id: 'main',
  name: 'University Portal',
  shortName: 'Campus',
  code: '',
  tagline: '',
  accreditation: '',
  establishedYear: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  currency: 'INR',
  setupCompletedSteps: [],
  isSetupComplete: false
};

const defaultSettings: SystemSettings = {
  id: 'main',
  attendanceThreshold: 75,
  lateGraceMinutes: 10,
  passingPercentage: 40,
  feeLateFeePerDay: 50,
  lmsAutoEnroll: true,
  allowOnlineExams: true,
  allowStudentCorrectionRequests: true,
  gradingScale: DEFAULT_GRADING_SCALE,
  timetableConfig: DEFAULT_TIMETABLE_CONFIG,
  registrationConfig: {
    isOpen: true,
    minCredits: 12,
    maxCredits: 26,
    allowAddDrop: true,
    requireAdvisorApproval: false,
    enforcePrerequisites: true
  }
};

const UniversityContext = createContext<UniversityContextType | undefined>(undefined);

export const UniversityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin, can } = useAuth();
  const [university, setUniversity] = useState<UniversityProfile>(defaultUniversity);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [offices, setOffices] = useState<InstitutionalOffice[]>([]);
  const [teams, setTeams] = useState<InstitutionalTeam[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [contracts, setContracts] = useState<EmploymentContract[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [approvalWorkflows, setApprovalWorkflows] = useState<ApprovalWorkflowConfig[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const safeListen = (colName: string, setter: (items: any[]) => void) => {
      const u = onSnapshot(
        collection(db, colName),
        (snap) => setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        () => {}
      );
      unsubs.push(u);
    };

    unsubs.push(
      onSnapshot(doc(db, 'university_config', 'main'), (snap) => {
        if (snap.exists()) setUniversity({ ...defaultUniversity, ...snap.data() } as UniversityProfile);
      }, () => {})
    );

    unsubs.push(
      onSnapshot(doc(db, 'system_settings', 'main'), (snap) => {
        if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data() } as SystemSettings);
      }, () => {})
    );

    safeListen('campuses', setCampuses);
    safeListen('buildings', setBuildings);
    safeListen('rooms', setRooms);
    safeListen('faculties', setFaculties);
    safeListen('departments', setDepartments);
    safeListen('offices', setOffices);
    safeListen('teams', setTeams);
    safeListen('designations', setDesignations);
    safeListen('roles', setRoles);
    safeListen('approvalWorkflows', setApprovalWorkflows);
    safeListen('academicYears', setAcademicYears);
    safeListen('semesters', setSemesters);
    safeListen('programs', setPrograms);
    safeListen('courses', setCourses);
    safeListen('subjects', setSubjects);
    safeListen('batches', setBatches);
    safeListen('classes', setClasses);
    safeListen('academicEvents', setAcademicEvents);

    unsubs.push(
      onSnapshot(
        collection(db, 'users'),
        (snap) => {
          setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
          setLoading(false);
        },
        () => setLoading(false)
      )
    );

    return () => unsubs.forEach(u => u());
  }, [uid]);

  const canManageHR = isAdmin || can('hr.manage');
  const canManageApprovals = isAdmin || can('approvals.manage');

  useEffect(() => {
    if (!uid || !profile) {
      setContracts([]);
      setApprovalRequests([]);
      return;
    }

    const contractQuery = canManageHR
      ? collection(db, 'employmentContracts')
      : query(collection(db, 'employmentContracts'), where('employeeId', '==', uid));

    const approvalQuery = canManageApprovals
      ? collection(db, 'approvalRequests')
      : query(collection(db, 'approvalRequests'), where('requesterId', '==', uid));

    const u1 = onSnapshot(
      contractQuery,
      (snap) => setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmploymentContract))),
      () => {}
    );
    const u2 = onSnapshot(
      approvalQuery,
      (snap) => setApprovalRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequest))),
      () => {}
    );

    return () => {
      u1();
      u2();
    };
  }, [uid, profile?.role, canManageHR, canManageApprovals]);

  const facultyRoles = ['teacher', 'professor', 'teaching_assistant', 'research_assistant', 'hod'];
  const teachers = users.filter(u => facultyRoles.includes(u.role));
  const students = users.filter(u => u.role === 'student');
  const employees = users.filter(u => u.role !== 'student' && u.role !== 'parent');

  return (
    <UniversityContext.Provider
      value={{
        university,
        settings,
        campuses,
        buildings,
        rooms,
        faculties,
        departments,
        offices,
        teams,
        designations,
        contracts,
        roles,
        approvalWorkflows,
        approvalRequests,
        academicYears,
        semesters,
        programs,
        courses,
        subjects,
        batches,
        classes,
        academicEvents,
        users,
        teachers,
        employees,
        students,
        loading
      }}
    >
      {children}
    </UniversityContext.Provider>
  );
};

export const useUniversity = () => {
  const ctx = useContext(UniversityContext);
  if (!ctx) throw new Error('useUniversity must be used within UniversityProvider');
  return ctx;
};
