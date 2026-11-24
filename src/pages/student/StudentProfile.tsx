import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { CheckCircle2, FileText, Lock, Send, ShieldAlert } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { Modal, PageHeader, SegmentedTabs, StatusText } from '../../components/ui/DataUI';
import { logAudit, syncPublicProfile } from '../../services/erpService';
import { ApprovalRequest } from '../../types';
import {
  ALLOWED_BLOOD_GROUPS,
  mapReauthPasswordError,
  sanitizeText,
  validateBloodGroup,
  validateEmail,
  validateFreeText,
  validateName,
  validatePasswordStrength,
  validatePhone,
  validateSafeUrl
} from '../../utils/validation';

export const StudentProfile: React.FC = () => {
  const { profile, user } = useAuth();
  const { campuses, departments, programs, batches, academicYears, semesters, classes, users } = useUniversity();

  const [tab, setTab] = useState<'overview' | 'edit' | 'documents' | 'security'>('overview');
  const [imgError, setImgError] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [myApprovals, setMyApprovals] = useState<ApprovalRequest[]>([]);

  // Permitted self-edit state
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || '');
  const [emergencyContactName, setEmergencyContactName] = useState(profile?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(profile?.emergencyContactPhone || '');
  const [guardianPhone, setGuardianPhone] = useState(profile?.guardianPhone || '');
  const [guardianEmail, setGuardianEmail] = useState(profile?.guardianEmail || '');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Sensitive official change request modal
  const [reqModal, setReqModal] = useState(false);
  const [reqField, setReqField] = useState('Legal Name');
  const [reqNewValue, setReqNewValue] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqError, setReqError] = useState('');

  // Document attachment link add (pending verification)
  const [docModal, setDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Identity Document (National ID / Passport)');
  const [docUrl, setDocUrl] = useState('');
  const [docError, setDocError] = useState('');

  // Password change (requires re-authentication + strong password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPwd, setUpdatingPwd] = useState(false);

  const pwdStrength = useMemo(
    () => validatePasswordStrength(newPassword, confirmPassword, currentPassword),
    [newPassword, confirmPassword, currentPassword]
  );

  useEffect(() => {
    if (!profile) return;
    setPhone(profile.phone || '');
    setAddress(profile.address || '');
    setPhotoUrl(profile.photoUrl || '');
    setBloodGroup(profile.bloodGroup || '');
    setEmergencyContactName(profile.emergencyContactName || '');
    setEmergencyContactPhone(profile.emergencyContactPhone || '');
    setGuardianPhone(profile.guardianPhone || '');
    setGuardianEmail(profile.guardianEmail || '');
  }, [profile]);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = onSnapshot(
      query(collection(db, 'approvalRequests'), where('requesterId', '==', profile.uid)),
      snap => setMyApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequest)).filter(a => a.processType === 'profile_update')),
      () => {}
    );
    return () => unsub();
  }, [profile?.uid]);

  const campus = campuses.find(c => c.id === profile?.campusId);
  const department = departments.find(d => d.id === profile?.departmentId);
  const program = programs.find(p => p.id === profile?.programId);
  const batch = batches.find(b => b.id === profile?.batchId);
  const academicYear = academicYears.find(y => y.id === profile?.academicYearId) || academicYears.find(y => y.isCurrent);
  const semester = semesters.find(s => s.id === profile?.semesterId) || semesters.find(s => s.isCurrent);
  const myClass = classes.find(c => c.id === profile?.classId || c.students?.includes(profile?.uid || ''));
  const advisor = users.find(u => u.uid === (profile?.advisorId || myClass?.mentorId));

  const handleSavePermittedFields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setFeedback(null);

    const errors: Record<string, string> = {};
    const phoneErr = validatePhone(phone, false, 'Phone number');
    if (phoneErr) errors.phone = phoneErr;

    const bloodErr = validateBloodGroup(bloodGroup);
    if (bloodErr) errors.bloodGroup = bloodErr;

    const photoErr = validateSafeUrl(photoUrl, false, 'Profile Photo URL');
    if (photoErr) errors.photoUrl = photoErr;

    const addrErr = validateFreeText(address, { required: false, maxLen: 240, label: 'Address' });
    if (addrErr) errors.address = addrErr;

    if (emergencyContactName.trim()) {
      const emNameErr = validateName(emergencyContactName, 'Emergency contact name');
      if (emNameErr) errors.emergencyContactName = emNameErr;
    }

    const emPhoneErr = validatePhone(emergencyContactPhone, false, 'Emergency contact phone');
    if (emPhoneErr) errors.emergencyContactPhone = emPhoneErr;

    const gPhoneErr = validatePhone(guardianPhone, false, 'Guardian phone');
    if (gPhoneErr) errors.guardianPhone = gPhoneErr;

    const gEmailErr = validateEmail(guardianEmail, false);
    if (gEmailErr) errors.guardianEmail = gEmailErr;

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFeedback({ type: 'error', text: 'Please resolve the highlighted validation errors before saving.' });
      return;
    }

    setSaving(true);
    try {
      const cleanPhoto = sanitizeText(photoUrl);
      await updateDoc(doc(db, 'users', profile.uid), {
        phone: sanitizeText(phone),
        address: sanitizeText(address),
        photoUrl: cleanPhoto,
        bloodGroup: sanitizeText(bloodGroup).toUpperCase(),
        emergencyContactName: sanitizeText(emergencyContactName),
        emergencyContactPhone: sanitizeText(emergencyContactPhone),
        guardianPhone: sanitizeText(guardianPhone),
        guardianEmail: guardianEmail.trim()
      });
      await syncPublicProfile(profile.uid, { ...profile, photoUrl: cleanPhoto });
      await logAudit(profile, 'STUDENT_SELF_UPDATE_PROFILE', 'Profile', profile.uid, 'Updated contact & emergency details');
      setFeedback({ type: 'success', text: 'Permitted contact and emergency details saved.' });
      setImgError(false);
    } catch (err: any) {
      console.error('Failed to update student profile:', err);
      setFeedback({ type: 'error', text: 'Failed to update profile details. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestOfficialChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setReqError('');

    const allowedFields = [
      'Legal Name',
      'Date of Birth',
      'Guardian Name',
      'Program / Major',
      'Department Transfer',
      'Section / Batch Change'
    ];
    if (!allowedFields.includes(reqField)) {
      return setReqError('Select a valid official field.');
    }

    const valErr = validateFreeText(reqNewValue, { required: true, minLen: 2, maxLen: 120, label: 'Requested Value' });
    if (valErr) return setReqError(valErr);

    const reasonErr = validateFreeText(reqReason, { required: true, minLen: 5, maxLen: 400, label: 'Supporting Reason' });
    if (reasonErr) return setReqError(reasonErr);

    const cleanVal = sanitizeText(reqNewValue);
    const cleanReason = sanitizeText(reqReason);

    try {
      await addDoc(collection(db, 'approvalRequests'), {
        processType: 'profile_update',
        title: `Official Profile Change: ${reqField}`,
        description: `Student ${sanitizeText(profile.name)} (${profile.rollNo || profile.uid}) requested changing "${reqField}" to "${cleanVal}". Reason: ${cleanReason}`,
        requesterId: profile.uid,
        requesterName: sanitizeText(profile.name),
        requesterRole: profile.role,
        targetEntityType: 'users',
        targetEntityId: profile.uid,
        payload: { field: reqField, newValue: cleanVal, reason: cleanReason },
        status: 'pending',
        currentStageIndex: 0,
        stages: [
          { stageOrder: 1, stageName: 'Records Officer Check', approverRole: 'records_officer' },
          { stageOrder: 2, stageName: 'Registrar Final Approval', approverRole: 'university_registrar' }
        ],
        history: [],
        createdAt: serverTimestamp()
      });
      await logAudit(profile, 'REQUEST_OFFICIAL_PROFILE_CHANGE', 'Profile', profile.uid, `${reqField} -> ${cleanVal}`);
      setReqModal(false);
      setReqNewValue('');
      setReqReason('');
      setFeedback({ type: 'success', text: 'Official change request submitted to the Registrar approval queue.' });
    } catch (err: any) {
      console.error('Official change request error:', err);
      setReqError('Could not submit change request. Please try again.');
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setDocError('');

    const nameErr = validateFreeText(docName, { required: true, minLen: 2, maxLen: 100, label: 'Document Title' });
    if (nameErr) return setDocError(nameErr);

    const typeErr = validateFreeText(docType, { required: true, minLen: 2, maxLen: 80, label: 'Document Category' });
    if (typeErr) return setDocError(typeErr);

    const urlErr = validateSafeUrl(docUrl, true, 'Document URL');
    if (urlErr) return setDocError(urlErr);

    const existing = profile.documents || [];
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: sanitizeText(docName),
      type: sanitizeText(docType),
      url: docUrl.trim(),
      verified: false,
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        documents: [...existing, newDoc]
      });
      setDocModal(false);
      setDocName('');
      setDocUrl('');
      setFeedback({ type: 'success', text: 'Document attached to your profile for Registrar verification.' });
    } catch (err) {
      console.error('Document attach error:', err);
      setDocError('Unable to attach document. Please try again.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentPassword) {
      return setFeedback({ type: 'error', text: 'Current password is required to verify your identity.' });
    }
    if (!pwdStrength.valid && pwdStrength.error) {
      return setFeedback({ type: 'error', text: pwdStrength.error });
    }

    setUpdatingPwd(true);
    try {
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFeedback({ type: 'success', text: 'Account password updated successfully.' });
      } else {
        setFeedback({ type: 'error', text: 'Unable to verify active account session.' });
      }
    } catch (err: any) {
      console.error('Student password update error:', err?.code || 'password_error', err);
      setFeedback({ type: 'error', text: mapReauthPasswordError(err) });
    } finally {
      setUpdatingPwd(false);
    }
  };

  const safeProfilePhoto = validateSafeUrl(profile?.photoUrl || '', false) === null ? profile?.photoUrl : '';
  const pwdProgressPct = Math.min(100, Math.round((pwdStrength.score / pwdStrength.checks.length) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Profile & Records"
        subtitle="Review official academic records, update permitted contact details, and submit official corrections through Registrar approval."
        actions={
          <button
            type="button"
            onClick={() => { setReqError(''); setReqModal(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Send className="w-3.5 h-3.5 text-[#111111] dark:text-zinc-200" /> Request Official Correction
          </button>
        }
      />

      {feedback && (
        <div className={`px-4 py-3 rounded-xl border text-xs flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-[#111111] dark:text-zinc-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {safeProfilePhoto && !imgError ? (
            <img
              src={safeProfilePhoto}
              alt={profile?.name || 'Student'}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 flex items-center justify-center text-2xl font-bold shrink-0">
              {profile?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-[#111111] dark:text-zinc-100">{profile?.name}</h2>
            <p className="text-xs text-[#52525B] mt-0.5">
              Student ID: <span className="font-mono font-semibold text-[#3F3F46] dark:text-zinc-300">{profile?.studentId || profile?.rollNo || profile?.uid.slice(0, 8)}</span>
              {' · '}
              {program?.name || 'Degree Student'}
              {department ? ` · ${department.name}` : ''}
            </p>
            <p className="text-xs text-[#52525B] mt-0.5">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <p className="text-[#52525B]">Enrollment Status</p>
            <StatusText status={profile?.status || 'active'} />
          </div>
        </div>
      </div>

      <SegmentedTabs
        active={tab}
        onChange={v => setTab(v as any)}
        tabs={[
          { id: 'overview', label: 'Official & Academic Record' },
          { id: 'edit', label: 'Edit Contact & Emergency Info' },
          { id: 'documents', label: 'Identity & Documents', count: profile?.documents?.length || 0 },
          { id: 'security', label: 'Account Security' }
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <h3 className="text-sm font-semibold">Personal &amp; Guardian Details</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><dt className="text-[#52525B]">Full Name</dt><dd className="font-medium mt-0.5">{profile?.name || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Date of Birth</dt><dd className="font-mono mt-0.5">{profile?.dob || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Gender</dt><dd className="capitalize mt-0.5">{profile?.gender || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Blood Group</dt><dd className="font-mono mt-0.5">{profile?.bloodGroup || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Phone</dt><dd className="font-mono mt-0.5">{profile?.phone || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Email</dt><dd className="mt-0.5 truncate">{profile?.email || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[#52525B]">Residential Address</dt><dd className="mt-0.5">{profile?.address || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Emergency Contact</dt><dd className="mt-0.5">{profile?.emergencyContactName || '—'} ({profile?.emergencyContactPhone || '—'})</dd></div>
              <div><dt className="text-[#52525B]">Guardian</dt><dd className="mt-0.5">{profile?.guardianName || '—'} ({profile?.guardianPhone || '—'})</dd></div>
            </dl>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
            <h3 className="text-sm font-semibold">Academic Assignment (University Managed)</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><dt className="text-[#52525B]">Roll Number</dt><dd className="font-mono font-semibold mt-0.5">{profile?.rollNo || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Campus</dt><dd className="mt-0.5">{campus?.name || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Department</dt><dd className="mt-0.5">{department?.name || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Program</dt><dd className="mt-0.5">{program?.name || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Academic Year</dt><dd className="font-mono mt-0.5">{academicYear?.name || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Current Semester</dt><dd className="font-mono mt-0.5">{semester?.name || `Semester ${profile?.semesterNumber || 1}`}</dd></div>
              <div><dt className="text-[#52525B]">Batch</dt><dd className="font-mono mt-0.5">{batch?.name || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Section / Cohort</dt><dd className="mt-0.5">{myClass?.name || profile?.section || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Faculty Advisor</dt><dd className="mt-0.5">{advisor?.name || '—'}</dd></div>
              <div><dt className="text-[#52525B]">Academic Standing</dt><dd className="capitalize mt-0.5">{(profile?.academicStanding || 'good_standing').replace('_', ' ')}</dd></div>
            </dl>
            {myApprovals.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <p className="text-xs font-semibold text-[#52525B]">Recent Profile Correction Requests</p>
                {myApprovals.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{a.title}</span>
                    <StatusText status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'edit' && (
        <form onSubmit={handleSavePermittedFields} noValidate className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold">Permitted Contact &amp; Emergency Details</h3>
              <p className="text-xs text-[#52525B] mt-0.5">Official fields (legal name, program, roll no, DOB) require Registrar approval.</p>
            </div>
            <button type="button" onClick={() => setReqModal(true)} className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline">
              Request Official Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Phone Number</label>
              <input type="text" maxLength={15} pattern="^\+?[0-9\s-]{10,15}$" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" placeholder="+91 9876543210" />
              {editErrors.phone && <p className="mt-1 text-[11px] text-rose-600">{editErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Blood Group</label>
              <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Not specified</option>
                {ALLOWED_BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
              {editErrors.bloodGroup && <p className="mt-1 text-[11px] text-rose-600">{editErrors.bloodGroup}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Profile Photo URL</label>
              <input type="url" maxLength={500} value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {editErrors.photoUrl && <p className="mt-1 text-[11px] text-rose-600">{editErrors.photoUrl}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Current Address</label>
              <input type="text" maxLength={240} value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {editErrors.address && <p className="mt-1 text-[11px] text-rose-600">{editErrors.address}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Emergency Contact Name</label>
              <input type="text" maxLength={80} value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {editErrors.emergencyContactName && <p className="mt-1 text-[11px] text-rose-600">{editErrors.emergencyContactName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Emergency Contact Phone</label>
              <input type="text" maxLength={15} pattern="^\+?[0-9\s-]{10,15}$" value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {editErrors.emergencyContactPhone && <p className="mt-1 text-[11px] text-rose-600">{editErrors.emergencyContactPhone}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Guardian Phone</label>
              <input type="text" maxLength={15} pattern="^\+?[0-9\s-]{10,15}$" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {editErrors.guardianPhone && <p className="mt-1 text-[11px] text-rose-600">{editErrors.guardianPhone}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Guardian Email</label>
              <input type="email" maxLength={254} value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              {editErrors.guardianEmail && <p className="mt-1 text-[11px] text-rose-600">{editErrors.guardianEmail}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {tab === 'documents' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Student Identity &amp; Academic Documents</h3>
              <p className="text-xs text-[#52525B]">Attached IDs, transcripts, and verification files linked to Registrar records.</p>
            </div>
            <button type="button" onClick={() => { setDocError(''); setDocModal(true); }} className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              Attach Document Link
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(profile?.documents || []).map(d => {
              const safeDocHref = validateSafeUrl(d.url || '', false) === null ? d.url : null;
              return (
                <div key={d.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#111111] dark:text-zinc-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{d.name}</p>
                      <p className="text-[#52525B]">{d.type} · Uploaded <span className="font-mono">{d.uploadedAt}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusText status={d.verified ? 'verified' : 'pending'} />
                    {safeDocHref && (
                      <a href={safeDocHref} target="_blank" rel="noopener noreferrer" className="text-[#111111] dark:text-zinc-200 font-semibold hover:underline">
                        Open
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {(!profile?.documents || profile.documents.length === 0) && (
              <p className="py-8 text-center text-xs text-zinc-400">No identity or academic documents uploaded yet.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <form onSubmit={handlePasswordChange} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 max-w-lg space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-[#111111] dark:text-zinc-200" /> Update Account Password</h3>
          <div>
            <label className="block text-xs font-medium mb-1">Current Password</label>
            <input type="password" required maxLength={128} autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" placeholder="Verify current password" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">New Password</label>
            <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" placeholder="Minimum 8 characters (12+ recommended)" />
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#52525B] dark:text-zinc-400">Password Strength</span>
              <span className="font-mono font-bold text-[#111111] dark:text-zinc-100">{pwdStrength.strengthLabel}</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div className="h-full bg-[#111111] dark:bg-white transition-all duration-200" style={{ width: `${pwdProgressPct}%` }} />
            </div>
            <ul className="space-y-1">
              {pwdStrength.checks.map(check => (
                <li key={check.id} className={`flex items-center gap-1.5 text-[11px] ${check.met ? 'text-[#111111] dark:text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${check.met ? 'text-[#111111] dark:text-white' : 'text-zinc-300 dark:text-zinc-600'}`} />
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Confirm New Password</label>
            <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={updatingPwd} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white disabled:opacity-50">
            {updatingPwd ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}

      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Request Official Profile Correction">
        <form onSubmit={handleRequestOfficialChange} className="space-y-4">
          <p className="text-xs text-[#52525B]">Changes to legal identity or academic enrollment fields are routed to the Registrar&apos;s Office for verification.</p>
          {reqError && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg">{reqError}</p>}
          <div>
            <label className="block text-xs font-medium mb-1">Official Field</label>
            <select value={reqField} onChange={e => setReqField(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option>Legal Name</option>
              <option>Date of Birth</option>
              <option>Guardian Name</option>
              <option>Program / Major</option>
              <option>Department Transfer</option>
              <option>Section / Batch Change</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Requested Value</label>
            <input type="text" required maxLength={120} value={reqNewValue} onChange={e => setReqNewValue(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Supporting Reason / Document Reference</label>
            <textarea rows={3} required maxLength={400} value={reqReason} onChange={e => setReqReason(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReqModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit to Registrar</button>
          </div>
        </form>
      </Modal>

      <Modal open={docModal} onClose={() => setDocModal(false)} title="Attach Student Document">
        <form onSubmit={handleAddDocument} className="space-y-4">
          {docError && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg">{docError}</p>}
          <div><label className="block text-xs font-medium mb-1">Document Title</label><input type="text" required maxLength={100} value={docName} onChange={e => setDocName(e.target.value)} placeholder="Passport / High School Transcript" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div><label className="block text-xs font-medium mb-1">Document Category</label><input type="text" required maxLength={80} value={docType} onChange={e => setDocType(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div><label className="block text-xs font-medium mb-1">Document URL (HTTPS / Drive / PDF)</label><input type="url" required maxLength={500} value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDocModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Attach Document</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
