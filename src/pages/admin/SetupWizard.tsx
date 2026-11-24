import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, getSecondaryAuth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, ROLE_METADATA } from '../../config/rbac';
import { logAudit, syncPublicProfile } from '../../services/erpService';
import { generateCompliantTempPassword, sanitizeText } from '../../utils/validation';
import { PageHeader } from '../../components/ui/DataUI';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Loader2,
  Save,
  ExternalLink
} from 'lucide-react';

const WIZARD_STEPS = [
  { id: 1, title: 'University Profile & Branding', short: 'Profile' },
  { id: 2, title: 'Campuses', short: 'Campuses' },
  { id: 3, title: 'Buildings, Rooms, Classrooms & Labs', short: 'Rooms & Labs' },
  { id: 4, title: 'Faculties & Departments', short: 'Departments' },
  { id: 5, title: 'Academic Years', short: 'Academic Years' },
  { id: 6, title: 'Semesters & Terms', short: 'Semesters' },
  { id: 7, title: 'Programs & Degrees', short: 'Programs' },
  { id: 8, title: 'Courses & Curriculum', short: 'Courses' },
  { id: 9, title: 'Subjects & Credits', short: 'Subjects' },
  { id: 10, title: 'Classes, Sections & Batches', short: 'Classes & Batches' },
  { id: 11, title: 'Academic Calendar', short: 'Calendar' },
  { id: 12, title: 'Teacher & Staff Onboarding', short: 'Faculty & Staff' },
  { id: 13, title: 'Student Onboarding', short: 'Students' },
  { id: 14, title: 'Timetable & Scheduling Config', short: 'Timetable Config' },
  { id: 15, title: 'Attendance Configuration', short: 'Attendance Config' },
  { id: 16, title: 'Examination & Grading Config', short: 'Grading Config' },
  { id: 17, title: 'Fees & Payment Configuration', short: 'Fees Config' },
  { id: 18, title: 'LMS Configuration', short: 'LMS Config' },
  { id: 19, title: 'Role & Permission Configuration', short: 'RBAC Config' }
];

export const SetupWizard: React.FC = () => {
  const { profile, customPermissions } = useAuth();
  const {
    university, settings, campuses, buildings, rooms, faculties,
    departments, academicYears, semesters, programs, courses, subjects,
    batches, classes, academicEvents, teachers, students
  } = useUniversity();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Step 1 form
  const [uniForm, setUniForm] = useState(university);
  useEffect(() => { setUniForm(university); }, [university]);

  // Step 14/15/16/18 settings form
  const [settingsForm, setSettingsForm] = useState(settings);
  useEffect(() => { setSettingsForm(settings); }, [settings]);

  // Quick add forms for steps 2-13, 17
  const [campusForm, setCampusForm] = useState({ name: '', code: '', city: '', address: '', phone: '' });
  const [buildingForm, setBuildingForm] = useState({ campusId: '', name: '', code: '', floors: 3 });
  const [roomForm, setRoomForm] = useState({ campusId: '', buildingId: '', roomNumber: '', name: '', type: 'classroom', capacity: 60, floor: '1st' });
  const [facultyForm, setFacultyForm] = useState({ name: '', code: '' });
  const [deptForm, setDeptForm] = useState({ facultyId: '', campusId: '', name: '', code: '', email: '' });
  const [yearForm, setYearForm] = useState({ name: '2026–2027', startDate: '2026-08-01', endDate: '2027-05-31', isCurrent: true });
  const [semForm, setSemForm] = useState({ academicYearId: '', name: 'Semester I', number: 1, startDate: '2026-08-01', endDate: '2026-12-20', isCurrent: true });
  const [progForm, setProgForm] = useState({ departmentId: '', name: '', code: '', degreeType: 'UG', durationYears: 4, totalSemesters: 8, totalCredits: 160 });
  const [courseForm, setCourseForm] = useState({ programId: '', departmentId: '', semesterNumber: 1, code: '', name: '', credits: 4, type: 'core', description: '' });
  const [subForm, setSubForm] = useState({ courseId: '', departmentId: '', programId: '', semesterNumber: 1, code: '', name: '', credits: 4, lectureHours: 3, labHours: 1, type: 'theory', maxMarks: 100, passingMarks: 40 });
  const [batchForm, setBatchForm] = useState({ programId: '', academicYearId: '', name: '2026–2030', startYear: 2026, endYear: 2030 });
  const [classForm, setClassForm] = useState({ name: '', section: 'A', departmentId: '', programId: '', batchId: '', semesterId: '', roomId: '', maxCapacity: 60 });
  const [eventForm, setEventForm] = useState({ title: '', type: 'event', startDate: '', endDate: '', description: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', idCode: '', role: 'teacher', departmentId: '', classId: '' });
  const [feeForm, setFeeForm] = useState({ name: '', programId: '', category: 'tuition', amount: 50000, dueDate: '2026-12-31', lateFeePerDay: 50, description: '' });
  const [selectedRbacRole, setSelectedRbacRole] = useState<string>('hod');

  const notify = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const markStepCompleted = async (stepId: number) => {
    const existing = university.setupCompletedSteps || [];
    const next = Array.from(new Set([...existing, stepId]));
    await setDoc(doc(db, 'university_config', 'main'), {
      ...uniForm,
      setupCompletedSteps: next,
      isSetupComplete: next.length >= 10,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const handleSaveUniversityProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'university_config', 'main'), { ...uniForm, updatedAt: serverTimestamp() }, { merge: true });
      await markStepCompleted(1);
      await logAudit(profile, 'UPDATE_UNIVERSITY_PROFILE', 'SetupWizard', 'university_config/main', `Updated profile: ${uniForm.name}`);
      notify('success', 'University profile saved.');
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (stepId: number, label: string) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system_settings', 'main'), { ...settingsForm, updatedAt: serverTimestamp() }, { merge: true });
      await markStepCompleted(stepId);
      await logAudit(profile, 'UPDATE_SETTINGS', 'SetupWizard', 'system_settings/main', `Updated ${label}`);
      notify('success', `${label} saved.`);
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDoc = async (col: string, payload: any, stepId: number, reset: () => void, label: string) => {
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, col), { ...payload, createdAt: serverTimestamp() });
      await markStepCompleted(stepId);
      await logAudit(profile, `CREATE_${col.toUpperCase()}`, 'SetupWizard', ref.id, `Added ${label}`);
      reset();
      notify('success', `${label} added.`);
    } catch (e: any) {
      notify('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent, roleType: 'teacher' | 'student') => {
    e.preventDefault();
    setSaving(true);
    try {
      const targetRole = roleType === 'student' ? 'student' : (userForm.role || 'teacher');
      const finalEmail = (userForm.email || `${roleType === 'student' ? 'stu' : 'emp'}${userForm.idCode}@arambh.edu`).trim();
      const tempPassword = generateCompliantTempPassword();
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, tempPassword);
      const cleanName = sanitizeText(userForm.name);
      const payload: Record<string, any> = {
        uid: cred.user.uid,
        name: cleanName,
        email: finalEmail,
        role: targetRole,
        status: 'active',
        departmentId: userForm.departmentId || '',
        classId: userForm.classId || '',
        [roleType === 'student' ? 'rollNo' : 'employeeId']: sanitizeText(userForm.idCode),
        isFirstLogin: true,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', cred.user.uid), payload);
      await syncPublicProfile(cred.user.uid, payload);
      if (roleType === 'student' && userForm.classId) {
        const cls = classes.find(c => c.id === userForm.classId);
        if (cls) {
          await updateDoc(doc(db, 'classes', cls.id), {
            students: Array.from(new Set([...(cls.students || []), cred.user.uid]))
          });
        }
      }
      await secondaryAuth.signOut();
      await markStepCompleted(roleType === 'student' ? 13 : 12);
      await logAudit(profile, 'ONBOARD_USER', 'SetupWizard', cred.user.uid, `Onboarded ${targetRole}: ${cleanName}`);
      setUserForm({ name: '', email: '', idCode: '', role: 'teacher', departmentId: '', classId: '' });
      notify('success', `Provisioned ${cleanName} (${finalEmail}, temporary password: ${tempPassword}).`);
    } catch (e: any) {
      console.error('SetupWizard provision error:', e);
      notify('error', 'Failed to provision user account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRolePermission = async (roleKey: string, permKey: string) => {
    const current = customPermissions[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    const updated = current.includes(permKey) ? current.filter(p => p !== permKey) : [...current, permKey];
    await setDoc(doc(db, 'rolePermissions', roleKey), {
      role: roleKey,
      label: ROLE_METADATA[roleKey as keyof typeof ROLE_METADATA]?.label || roleKey,
      permissions: updated,
      updatedAt: serverTimestamp()
    }, { merge: true });
    await markStepCompleted(19);
    notify('success', `Updated permissions for ${roleKey}`);
  };

  const completedCount = university.setupCompletedSteps?.length || 0;
  const progressPct = Math.round((completedCount / WIZARD_STEPS.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="University Setup Wizard"
        subtitle="Configure institutional structure, academic hierarchy, policies, and role permissions in 19 guided steps."
      />

      {/* Progress Bar */}
      <div className="bg-[#111111] dark:bg-zinc-900 text-white border border-[#111111] dark:border-zinc-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18)]">
        <div>
          <p className="text-sm font-bold text-white">
            Setup Progress · <span className="font-mono tabular-nums">{completedCount} / {WIZARD_STEPS.length}</span> steps configured
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Any step can be edited, completed, or revisited later without losing live university data.
          </p>
        </div>
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs font-mono font-bold text-white tabular-nums">{progressPct}%</span>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium ${
          feedback.type === 'success'
            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-zinc-200'
            : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
        }`}>
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Stepper Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 max-h-[680px] overflow-y-auto shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]">
          <div className="space-y-1">
            {WIZARD_STEPS.map(s => {
              const isDone = university.setupCompletedSteps?.includes(s.id);
              const isCurrent = step === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl text-left text-xs transition-colors ${
                    isCurrent
                      ? 'bg-[#111111] dark:bg-white text-white dark:text-zinc-950 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-mono text-[11px] shrink-0 ${
                      isCurrent
                        ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-950'
                        : isDone
                        ? 'bg-[#27272A] text-white dark:bg-zinc-700'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}>
                      {isDone ? '✓' : s.id}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Step Content */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="text-xs font-mono text-[#111111] dark:text-zinc-200">Step {step} of {WIZARD_STEPS.length}</p>
              <h2 className="text-lg font-bold text-[#111111] dark:text-zinc-100 mt-0.5">{WIZARD_STEPS[step - 1].title}</h2>
            </div>
            <button
              type="button"
              onClick={() => markStepCompleted(step)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
              Mark Complete
            </button>
          </div>

          {step === 1 && (
            <form onSubmit={handleSaveUniversityProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">University Name</label>
                  <input required value={uniForm.name} onChange={e => setUniForm({ ...uniForm, name: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Short Name</label>
                  <input required value={uniForm.shortName} onChange={e => setUniForm({ ...uniForm, shortName: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Institution Code</label>
                  <input value={uniForm.code} onChange={e => setUniForm({ ...uniForm, code: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Accreditation</label>
                  <input value={uniForm.accreditation} onChange={e => setUniForm({ ...uniForm, accreditation: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Official Email</label>
                  <input type="email" value={uniForm.email} onChange={e => setUniForm({ ...uniForm, email: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Currency</label>
                  <select value={uniForm.currency} onChange={e => setUniForm({ ...uniForm, currency: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tagline / Motto</label>
                <input value={uniForm.tagline} onChange={e => setUniForm({ ...uniForm, tagline: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Campus Address</label>
                <input value={uniForm.address} onChange={e => setUniForm({ ...uniForm, address: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200">
                <Save className="w-3.5 h-3.5" /> Save University Profile
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('campuses', { ...campusForm, status: 'active' }, 2, () => setCampusForm({ name: '', code: '', city: '', address: '', phone: '' }), 'Campus');
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <input required placeholder="Campus Name" value={campusForm.name} onChange={e => setCampusForm({ ...campusForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input required placeholder="Campus Code (e.g. MAIN-01)" value={campusForm.code} onChange={e => setCampusForm({ ...campusForm, code: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input required placeholder="City" value={campusForm.city} onChange={e => setCampusForm({ ...campusForm, city: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input placeholder="Phone" value={campusForm.phone} onChange={e => setCampusForm({ ...campusForm, phone: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input placeholder="Address" value={campusForm.address} onChange={e => setCampusForm({ ...campusForm, address: e.target.value })} className="sm:col-span-2 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <button type="submit" disabled={saving} className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200">
                  <Plus className="w-3.5 h-3.5" /> Add Campus
                </button>
              </form>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                {campuses.map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#111111] dark:text-zinc-100">{c.name}</p>
                      <p className="text-[#52525B]">{c.code} · {c.city}</p>
                    </div>
                    <span className="font-mono text-[#111111]">{c.status}</span>
                  </div>
                ))}
                {campuses.length === 0 && <p className="p-4 text-xs text-[#52525B]">No campuses configured yet.</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleAddDoc('buildings', buildingForm, 3, () => setBuildingForm({ campusId: '', name: '', code: '', floors: 3 }), 'Building');
                  }}
                  className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <p className="text-xs font-semibold">Add Building</p>
                  <select required value={buildingForm.campusId} onChange={e => setBuildingForm({ ...buildingForm, campusId: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="">Select Campus</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input required placeholder="Building Name" value={buildingForm.name} onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="Code" value={buildingForm.code} onChange={e => setBuildingForm({ ...buildingForm, code: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                    <input type="number" min={1} placeholder="Floors" value={buildingForm.floors} onChange={e => setBuildingForm({ ...buildingForm, floors: Number(e.target.value) })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Building</button>
                </form>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleAddDoc('rooms', { ...roomForm, facilities: [] }, 3, () => setRoomForm({ campusId: '', buildingId: '', roomNumber: '', name: '', type: 'classroom', capacity: 60, floor: '1st' }), 'Room / Lab');
                  }}
                  className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <p className="text-xs font-semibold">Add Room / Classroom / Lab</p>
                  <select required value={roomForm.buildingId} onChange={e => {
                    const b = buildings.find(x => x.id === e.target.value);
                    setRoomForm({ ...roomForm, buildingId: e.target.value, campusId: b?.campusId || '' });
                  }} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="">Select Building</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="Room No (e.g. TAB-101)" value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                    <input required placeholder="Name" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                      <option value="classroom">Classroom</option>
                      <option value="lab">Lab</option>
                      <option value="exam_hall">Exam Hall</option>
                      <option value="auditorium">Auditorium</option>
                      <option value="seminar">Seminar Room</option>
                    </select>
                    <input type="number" min={1} placeholder="Capacity" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Room</button>
                </form>
              </div>
              <p className="text-xs text-[#52525B]">Configured: <span className="font-mono font-semibold">{buildings.length}</span> buildings · <span className="font-mono font-semibold">{rooms.length}</span> rooms & labs</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleAddDoc('faculties', facultyForm, 4, () => setFacultyForm({ name: '', code: '' }), 'Faculty');
                  }}
                  className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <p className="text-xs font-semibold">Add Faculty / School</p>
                  <input required placeholder="Faculty Name (e.g. Faculty of Engineering)" value={facultyForm.name} onChange={e => setFacultyForm({ ...facultyForm, name: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  <input required placeholder="Code (e.g. FEC)" value={facultyForm.code} onChange={e => setFacultyForm({ ...facultyForm, code: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Faculty</button>
                </form>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleAddDoc('departments', deptForm, 4, () => setDeptForm({ facultyId: '', campusId: '', name: '', code: '', email: '' }), 'Department');
                  }}
                  className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <p className="text-xs font-semibold">Add Department</p>
                  <select value={deptForm.facultyId} onChange={e => setDeptForm({ ...deptForm, facultyId: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="">Select Faculty (Optional)</option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <input required placeholder="Department Name" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="Code (CSE)" value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                    <input type="email" placeholder="Dept Email" value={deptForm.email} onChange={e => setDeptForm({ ...deptForm, email: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Department</button>
                </form>
              </div>
              <p className="text-xs text-[#52525B]">Configured: <span className="font-mono font-semibold">{faculties.length}</span> faculties · <span className="font-mono font-semibold">{departments.length}</span> departments</p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('academicYears', yearForm, 5, () => setYearForm({ name: '', startDate: '', endDate: '', isCurrent: false }), 'Academic Year');
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input required placeholder="Name (e.g. 2026–2027)" value={yearForm.name} onChange={e => setYearForm({ ...yearForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="date" required value={yearForm.startDate} onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="date" required value={yearForm.endDate} onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <label className="flex items-center gap-2 text-xs sm:col-span-2">
                  <input type="checkbox" checked={yearForm.isCurrent} onChange={e => setYearForm({ ...yearForm, isCurrent: e.target.checked })} />
                  Set as Active Academic Year
                </label>
                <button type="submit" className="py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Academic Year</button>
              </form>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                {academicYears.map(y => (
                  <div key={y.id} className="px-4 py-2.5 flex justify-between text-xs">
                    <span className="font-semibold">{y.name}</span>
                    <span className="font-mono text-[#52525B]">{y.startDate} → {y.endDate} {y.isCurrent ? '· Current' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('semesters', semForm, 6, () => setSemForm({ academicYearId: '', name: '', number: 1, startDate: '', endDate: '', isCurrent: false }), 'Semester');
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <select required value={semForm.academicYearId} onChange={e => setSemForm({ ...semForm, academicYearId: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="">Academic Year</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
                <input required placeholder="Semester Name" value={semForm.name} onChange={e => setSemForm({ ...semForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="number" min={1} max={12} placeholder="Number" value={semForm.number} onChange={e => setSemForm({ ...semForm, number: Number(e.target.value) })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="date" required value={semForm.startDate} onChange={e => setSemForm({ ...semForm, startDate: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="date" required value={semForm.endDate} onChange={e => setSemForm({ ...semForm, endDate: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <button type="submit" className="py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Semester</button>
              </form>
              <p className="text-xs text-[#52525B]">Configured semesters: <span className="font-mono font-semibold">{semesters.length}</span></p>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('programs', progForm, 7, () => setProgForm({ departmentId: '', name: '', code: '', degreeType: 'UG', durationYears: 4, totalSemesters: 8, totalCredits: 160 }), 'Program');
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <select required value={progForm.departmentId} onChange={e => setProgForm({ ...progForm, departmentId: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input required placeholder="Program Name (B.Tech CS)" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input required placeholder="Code (BTECH-CS)" value={progForm.code} onChange={e => setProgForm({ ...progForm, code: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <select value={progForm.degreeType} onChange={e => setProgForm({ ...progForm, degreeType: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="UG">Undergraduate (UG)</option>
                  <option value="PG">Postgraduate (PG)</option>
                  <option value="Diploma">Diploma</option>
                  <option value="PhD">Doctoral (PhD)</option>
                </select>
                <input type="number" placeholder="Years" value={progForm.durationYears} onChange={e => setProgForm({ ...progForm, durationYears: Number(e.target.value) })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <button type="submit" className="py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Program</button>
              </form>
              <p className="text-xs text-[#52525B]">Active programs: <span className="font-mono font-semibold">{programs.length}</span></p>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('courses', courseForm, 8, () => setCourseForm({ programId: '', departmentId: '', semesterNumber: 1, code: '', name: '', credits: 4, type: 'core', description: '' }), 'Course');
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <select required value={courseForm.programId} onChange={e => {
                  const p = programs.find(x => x.id === e.target.value);
                  setCourseForm({ ...courseForm, programId: e.target.value, departmentId: p?.departmentId || '' });
                }} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="">Program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input required placeholder="Course Code" value={courseForm.code} onChange={e => setCourseForm({ ...courseForm, code: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input required placeholder="Course Title" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="number" min={1} max={12} placeholder="Semester #" value={courseForm.semesterNumber} onChange={e => setCourseForm({ ...courseForm, semesterNumber: Number(e.target.value) })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="number" min={1} max={10} placeholder="Credits" value={courseForm.credits} onChange={e => setCourseForm({ ...courseForm, credits: Number(e.target.value) })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <button type="submit" className="py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Course</button>
              </form>
              <p className="text-xs text-[#52525B]">Curriculum courses: <span className="font-mono font-semibold">{courses.length}</span></p>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('subjects', subForm, 9, () => setSubForm({ courseId: '', departmentId: '', programId: '', semesterNumber: 1, code: '', name: '', credits: 4, lectureHours: 3, labHours: 1, type: 'theory', maxMarks: 100, passingMarks: 40 }), 'Subject');
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input required placeholder="Subject Code (CS-101)" value={subForm.code} onChange={e => setSubForm({ ...subForm, code: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input required placeholder="Subject Name" value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <select value={subForm.departmentId} onChange={e => setSubForm({ ...subForm, departmentId: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="">Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="number" min={1} max={10} placeholder="Credits" value={subForm.credits} onChange={e => setSubForm({ ...subForm, credits: Number(e.target.value) })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <select value={subForm.type} onChange={e => setSubForm({ ...subForm, type: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="theory">Theory</option>
                  <option value="practical">Practical / Lab</option>
                  <option value="project">Project</option>
                </select>
                <button type="submit" className="py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Subject</button>
              </form>
              <p className="text-xs text-[#52525B]">Active subjects: <span className="font-mono font-semibold">{subjects.length}</span></p>
            </div>
          )}

          {step === 10 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('batches', batchForm, 10, () => setBatchForm({ programId: '', academicYearId: '', name: '', startYear: 2026, endYear: 2030 }), 'Batch');
                }}
                className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800"
              >
                <p className="text-xs font-semibold">Add Batch ({batches.length})</p>
                <select required value={batchForm.programId} onChange={e => setBatchForm({ ...batchForm, programId: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="">Select Program</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input required placeholder="Batch Name (2026–2030)" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Batch</button>
              </form>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('classes', { ...classForm, students: [], subjectIds: [] }, 10, () => setClassForm({ name: '', section: 'A', departmentId: '', programId: '', batchId: '', semesterId: '', roomId: '', maxCapacity: 60 }), 'Class & Section');
                }}
                className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800"
              >
                <p className="text-xs font-semibold">Add Class / Section ({classes.length})</p>
                <input required placeholder="Class Name (B.Tech CS Sem 1 - A)" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <div className="grid grid-cols-2 gap-2">
                  <input required placeholder="Section" value={classForm.section} onChange={e => setClassForm({ ...classForm, section: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                  <select value={classForm.batchId} onChange={e => setClassForm({ ...classForm, batchId: e.target.value })} className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="">Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Class</button>
              </form>
            </div>
          )}

          {step === 11 && (
            <div className="space-y-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('academicEvents', eventForm, 11, () => setEventForm({ title: '', type: 'event', startDate: '', endDate: '', description: '' }), 'Calendar Event');
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <input required placeholder="Event Title" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="semester_start">Semester Start</option>
                  <option value="exam">Examination Window</option>
                  <option value="holiday">Holiday</option>
                  <option value="deadline">Academic Deadline</option>
                  <option value="event">University Event</option>
                </select>
                <input type="date" required value={eventForm.startDate} onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="date" required value={eventForm.endDate} onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input placeholder="Description" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="sm:col-span-2 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <button type="submit" className="sm:col-span-2 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add to Academic Calendar</button>
              </form>
              <p className="text-xs text-[#52525B]">Calendar items: <span className="font-mono font-semibold">{academicEvents.length}</span></p>
            </div>
          )}

          {(step === 12 || step === 13) && (
            <div className="space-y-4">
              <form onSubmit={e => handleCreateUser(e, step === 13 ? 'student' : 'teacher')} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required placeholder="Full Name" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input required placeholder={step === 13 ? 'Roll No / Student ID' : 'Employee ID'} value={userForm.idCode} onChange={e => setUserForm({ ...userForm, idCode: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="email" placeholder="Email (optional)" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                {step === 12 ? (
                  <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="teacher">Teacher / Professor</option>
                    <option value="hod">Department Head (HOD)</option>
                    <option value="accountant">Accountant</option>
                    <option value="admission_officer">Admission Officer</option>
                    <option value="exam_controller">Examination Controller</option>
                    <option value="librarian">Librarian</option>
                    <option value="hostel_warden">Hostel Warden</option>
                    <option value="transport_manager">Transport Manager</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="placement_officer">Placement Officer</option>
                    <option value="support_staff">Support Staff</option>
                  </select>
                ) : (
                  <select value={userForm.classId} onChange={e => setUserForm({ ...userForm, classId: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="">Assign Class (Optional)</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <select value={userForm.departmentId} onChange={e => setUserForm({ ...userForm, departmentId: e.target.value })} className="sm:col-span-2 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="">Department (Optional)</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button type="submit" disabled={saving} className="sm:col-span-2 py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">
                  {saving ? 'Provisioning Auth & Profile...' : step === 13 ? 'Onboard Student' : 'Onboard Faculty / Staff'}
                </button>
              </form>
              <div className="flex items-center justify-between text-xs text-[#52525B] pt-2">
                <span>Currently onboarded: <span className="font-mono font-semibold">{step === 13 ? students.length : teachers.length}</span></span>
                <Link to="/admin/users" className="inline-flex items-center gap-1 text-[#111111] dark:text-zinc-200 font-medium hover:underline">
                  Open Bulk CSV & Full Directory <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {step === 14 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Day Start Time</label>
                  <input type="time" value={settingsForm.timetableConfig.dayStartTime} onChange={e => setSettingsForm({ ...settingsForm, timetableConfig: { ...settingsForm.timetableConfig, dayStartTime: e.target.value } })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Day End Time</label>
                  <input type="time" value={settingsForm.timetableConfig.dayEndTime} onChange={e => setSettingsForm({ ...settingsForm, timetableConfig: { ...settingsForm.timetableConfig, dayEndTime: e.target.value } })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Slot Duration (Minutes)</label>
                  <input type="number" min={30} max={120} value={settingsForm.timetableConfig.slotDurationMinutes} onChange={e => setSettingsForm({ ...settingsForm, timetableConfig: { ...settingsForm.timetableConfig, slotDurationMinutes: Number(e.target.value) } })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                    const active = settingsForm.timetableConfig.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? settingsForm.timetableConfig.workingDays.filter(d => d !== day)
                            : [...settingsForm.timetableConfig.workingDays, day];
                          setSettingsForm({ ...settingsForm, timetableConfig: { ...settingsForm.timetableConfig, workingDays: next } });
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${active ? 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white border-[#111111] dark:border-white' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => handleSaveSettings(14, 'Timetable Configuration')} className="px-4 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">
                Save Timetable Configuration
              </button>
            </div>
          )}

          {step === 15 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Minimum Attendance Threshold (%)</label>
                  <input type="number" min={0} max={100} value={settingsForm.attendanceThreshold} onChange={e => setSettingsForm({ ...settingsForm, attendanceThreshold: Number(e.target.value) })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Late Arrival Grace Window (Minutes)</label>
                  <input type="number" min={0} max={60} value={settingsForm.lateGraceMinutes} onChange={e => setSettingsForm({ ...settingsForm, lateGraceMinutes: Number(e.target.value) })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={settingsForm.allowStudentCorrectionRequests} onChange={e => setSettingsForm({ ...settingsForm, allowStudentCorrectionRequests: e.target.checked })} />
                Allow students to submit attendance correction requests for faculty review
              </label>
              <button type="button" onClick={() => handleSaveSettings(15, 'Attendance Configuration')} className="px-4 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">
                Save Attendance Policy
              </button>
            </div>
          )}

          {step === 16 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Default Passing Percentage (%)</label>
                  <input type="number" min={0} max={100} value={settingsForm.passingPercentage} onChange={e => setSettingsForm({ ...settingsForm, passingPercentage: Number(e.target.value) })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-3 py-2 text-left">Grade</th>
                      <th className="px-3 py-2 text-left">Min %</th>
                      <th className="px-3 py-2 text-left">Grade Point</th>
                      <th className="px-3 py-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {settingsForm.gradingScale.map((g, idx) => (
                      <tr key={g.grade}>
                        <td className="px-3 py-2 font-mono font-semibold">{g.grade}</td>
                        <td className="px-3 py-2 font-mono tabular-nums">{g.minPercentage}%</td>
                        <td className="px-3 py-2 font-mono tabular-nums">{g.gradePoint}</td>
                        <td className="px-3 py-2 text-[#52525B]">{g.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => handleSaveSettings(16, 'Examination & Grading Configuration')} className="px-4 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">
                Save Grading Policy
              </button>
            </div>
          )}

          {step === 17 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Daily Late Fee Penalty</label>
                  <input type="number" min={0} value={settingsForm.feeLateFeePerDay} onChange={e => setSettingsForm({ ...settingsForm, feeLateFeePerDay: Number(e.target.value) })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
              </div>
              <button type="button" onClick={() => handleSaveSettings(17, 'Fee Penalty Configuration')} className="px-4 py-2 bg-slate-900 dark:bg-zinc-100 text-white dark:text-[#111111] text-xs font-semibold rounded-lg">
                Save Fee Policy
              </button>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleAddDoc('feeStructures', feeForm, 17, () => setFeeForm({ name: '', programId: '', category: 'tuition', amount: 50000, dueDate: '2026-12-31', lateFeePerDay: 50, description: '' }), 'Fee Structure');
                }}
                className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input required placeholder="Fee Title (Sem 1 Tuition)" value={feeForm.name} onChange={e => setFeeForm({ ...feeForm, name: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <select value={feeForm.category} onChange={e => setFeeForm({ ...feeForm, category: e.target.value })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <option value="tuition">Tuition</option>
                  <option value="semester">Semester</option>
                  <option value="admission">Admission</option>
                  <option value="exam">Examination</option>
                  <option value="hostel">Hostel</option>
                  <option value="transport">Transport</option>
                </select>
                <input type="number" required placeholder="Amount" value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: Number(e.target.value) })} className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <button type="submit" className="sm:col-span-3 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Fee Structure</button>
              </form>
            </div>
          )}

          {step === 18 && (
            <div className="space-y-4">
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" checked={settingsForm.lmsAutoEnroll} onChange={e => setSettingsForm({ ...settingsForm, lmsAutoEnroll: e.target.checked })} />
                Automatically enroll students into LMS course modules for their assigned class subjects
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" checked={settingsForm.allowOnlineExams} onChange={e => setSettingsForm({ ...settingsForm, allowOnlineExams: e.target.checked })} />
                Enable online timed quizzes and interactive question-bank assessments in LMS
              </label>
              <button type="button" onClick={() => handleSaveSettings(18, 'LMS Configuration')} className="px-4 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">
                Save LMS Configuration
              </button>
            </div>
          )}

          {step === 19 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-semibold">Select Role to Customize Permissions</label>
                <select value={selectedRbacRole} onChange={e => setSelectedRbacRole(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  {Object.entries(ROLE_METADATA).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {ALL_PERMISSIONS.map(perm => {
                  const activeList = customPermissions[selectedRbacRole] || DEFAULT_ROLE_PERMISSIONS[selectedRbacRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
                  const checked = activeList.includes(perm.key);
                  return (
                    <label key={perm.key} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleRolePermission(selectedRbacRole, perm.key)} className="mt-0.5" />
                      <div>
                        <p className="font-medium text-[#111111] dark:text-zinc-100">{perm.label}</p>
                        <p className="text-[11px] text-zinc-400">{perm.category}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Step Navigation */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              disabled={step === WIZARD_STEPS.length}
              onClick={() => setStep(s => Math.min(WIZARD_STEPS.length, s + 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-[#111111] disabled:opacity-40"
            >
              Next Step <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
