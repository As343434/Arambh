import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Award, Briefcase, Building2, FileText, Plus, Save, Search } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { ExamMark, PlacementApplication, PlacementDrive } from '../types';

export const Placements: React.FC = () => {
  const { profile, isStudent, can } = useAuth();
  const canManage = can('placement.manage');

  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'drives' | 'applications' | 'resume'>('drives');
  const [search, setSearch] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [driveModal, setDriveModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [packageLpa, setPackageLpa] = useState(12);
  const [location, setLocation] = useState('Bengaluru');
  const [eligibilityCgpa, setEligibilityCgpa] = useState(7.0);
  const [driveDate, setDriveDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  const [applyTarget, setApplyTarget] = useState<PlacementDrive | null>(null);
  const [resumeNote, setResumeNote] = useState('');

  // Student Career Profile
  const [resumeUrl, setResumeUrl] = useState(profile?.resumeUrl || '');
  const [resumeSummary, setResumeSummary] = useState(profile?.resumeSummary || '');
  const [skillsText, setSkillsText] = useState((profile?.skills || []).join(', '));
  const [savingResume, setSavingResume] = useState(false);

  useEffect(() => {
    setResumeUrl(profile?.resumeUrl || '');
    setResumeSummary(profile?.resumeSummary || '');
    setSkillsText((profile?.skills || []).join(', '));
  }, [profile]);

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'placementDrives'),
      s => {
        setDrives(s.docs.map(d => ({ id: d.id, ...d.data() } as PlacementDrive)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const appQ = canManage
      ? collection(db, 'placementApplications')
      : profile?.uid
      ? query(collection(db, 'placementApplications'), where('studentId', '==', profile.uid))
      : null;
    const marksQ = canManage
      ? collection(db, 'examMarks')
      : profile?.uid
      ? query(collection(db, 'examMarks'), where('studentId', '==', profile.uid), where('isPublished', '==', true))
      : null;
    const u2 = appQ
      ? onSnapshot(appQ, s => setApplications(s.docs.map(d => ({ id: d.id, ...d.data() } as PlacementApplication))), () => {})
      : () => {};
    const u3 = marksQ
      ? onSnapshot(marksQ, s => setMarks(s.docs.map(d => ({ id: d.id, ...d.data() } as ExamMark))), () => {})
      : () => {};
    return () => { u1(); u2(); u3(); };
  }, [canManage, profile?.uid]);

  const myCgpa = useMemo(() => {
    const mine = marks.filter(m => m.studentId === profile?.uid && m.isPublished);
    if (!mine.length) return 8.2;
    let pts = 0; let credits = 0;
    mine.forEach(m => { const c = m.credits || 4; pts += (m.gradePoint || 0) * c; credits += c; });
    return credits > 0 ? Number((pts / credits).toFixed(2)) : 8.2;
  }, [marks, profile?.uid]);

  const filteredDrives = useMemo(() => {
    return drives.filter(d => {
      if (eligibleOnly && myCgpa < d.eligibilityCgpa) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return d.companyName.toLowerCase().includes(q) || d.role.toLowerCase().includes(q) || d.location.toLowerCase().includes(q);
      }
      return true;
    });
  }, [drives, eligibleOnly, search, myCgpa]);

  const visibleApps = useMemo(() => {
    return canManage ? applications : applications.filter(a => a.studentId === profile?.uid);
  }, [applications, canManage, profile?.uid]);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'placementDrives'), {
      companyName,
      role,
      packageLpa: Number(packageLpa),
      location,
      eligibilityCgpa: Number(eligibilityCgpa),
      driveDate,
      deadline,
      description,
      status: 'open'
    });
    await logAudit(profile, 'CREATE_PLACEMENT_DRIVE', 'Placement', ref.id, `${companyName} — ${role}`);
    setDriveModal(false);
    setCompanyName('');
    setRole('');
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTarget || !profile) return;
    const ref = await addDoc(collection(db, 'placementApplications'), {
      driveId: applyTarget.id,
      companyName: applyTarget.companyName,
      role: applyTarget.role,
      studentId: profile.uid,
      studentName: profile.name,
      cgpa: myCgpa,
      resumeNote,
      status: 'applied',
      appliedAt: serverTimestamp()
    });
    await logAudit(profile, 'APPLY_PLACEMENT', 'Placement', ref.id, `${applyTarget.companyName} (${applyTarget.role})`);
    setApplyTarget(null);
    setResumeNote('');
    setBanner(`Application submitted to ${applyTarget.companyName}.`);
  };

  const handleSaveCareerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setSavingResume(true);
    try {
      const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
      await updateDoc(doc(db, 'users', profile.uid), {
        resumeUrl: resumeUrl.trim(),
        resumeSummary: resumeSummary.trim(),
        skills
      });
      setBanner('Career resume & skills profile updated.');
    } finally {
      setSavingResume(false);
    }
  };

  const updateAppStatus = async (app: PlacementApplication, status: PlacementApplication['status']) => {
    await updateDoc(doc(db, 'placementApplications', app.id), { status });
    await logAudit(profile, 'UPDATE_PLACEMENT_STATUS', 'Placement', app.id, `${app.studentName} -> ${status}`);
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement & Career Services"
        subtitle="Campus recruitment drives, CGPA eligibility checks, career resume builder, interview tracking, and offers."
        actions={
          canManage ? (
            <button type="button" onClick={() => setDriveModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Plus className="w-3.5 h-3.5" /> Post Recruitment Drive
            </button>
          ) : undefined
        }
      />

      {banner && (
        <div className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs text-[#111111] dark:text-zinc-200 flex justify-between items-center">
          <span className="font-medium">{banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Drives" value={drives.filter(d => d.status === 'open').length} icon={Building2} tone="indigo" />
        <StatCard label={isStudent ? 'Verified CGPA' : 'Applications'} value={isStudent ? myCgpa.toFixed(2) : visibleApps.length} icon={Briefcase} tone="amber" />
        <StatCard label="Shortlisted / Interviews" value={visibleApps.filter(a => a.status === 'shortlisted' || a.status === 'interview').length} icon={FileText} />
        <StatCard label="Offers Extended" value={visibleApps.filter(a => a.status === 'offered').length} icon={Award} tone="emerald" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedTabs
          active={activeTab}
          onChange={v => setActiveTab(v as any)}
          tabs={[
            { id: 'drives', label: 'Placement Drives', count: filteredDrives.length },
            { id: 'applications', label: isStudent ? 'My Applications & Interviews' : 'Candidate Pipeline', count: visibleApps.length },
            ...(isStudent ? [{ id: 'resume', label: 'Resume & Skills' }] : [])
          ]}
        />
        {activeTab === 'drives' && (
          <div className="flex items-center gap-2">
            {isStudent && (
              <label className="flex items-center gap-1.5 text-xs text-[#52525B] dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={eligibleOnly} onChange={e => setEligibleOnly(e.target.checked)} />
                Eligible only
              </label>
            )}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search company, role..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === 'drives' && (
        filteredDrives.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrives.map(d => {
              const applied = applications.find(a => a.driveId === d.id && a.studentId === profile?.uid);
              const eligible = myCgpa >= d.eligibilityCgpa;
              return (
                <div key={d.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#52525B]">
                      <span className="font-mono font-bold text-[#111111] dark:text-zinc-200">{d.packageLpa} LPA</span>
                      <StatusText status={d.status} />
                    </div>
                    <h3 className="text-base font-semibold mt-1">{d.companyName}</h3>
                    <p className="text-xs font-medium text-[#111111] dark:text-zinc-200">{d.role} · {d.location}</p>
                    <p className="text-xs text-[#52525B] mt-2">{d.description}</p>
                    <p className="text-xs font-mono text-zinc-400 mt-2">Min CGPA: {d.eligibilityCgpa} · Drive: {d.driveDate}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    {isStudent ? (
                      applied ? (
                        <StatusText status={applied.status} />
                      ) : (
                        <button
                          type="button"
                          disabled={!eligible || d.status !== 'open'}
                          onClick={() => {
                            setApplyTarget(d);
                            const defaultNote = [resumeUrl && `Resume: ${resumeUrl}`, skillsText && `Skills: ${skillsText}`].filter(Boolean).join('\n');
                            setResumeNote(defaultNote);
                          }}
                          className="w-full py-2 font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white disabled:opacity-40"
                        >
                          {eligible ? 'Apply Now' : `Requires ${d.eligibilityCgpa} CGPA`}
                        </button>
                      )
                    ) : (
                      <span className="text-[#52525B]">{applications.filter(a => a.driveId === d.id).length} applicant(s)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Briefcase} title="No Placement Drives" description="Upcoming campus recruitment opportunities will appear here." />
        )
      )}

      {activeTab === 'applications' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleApps.map(a => (
            <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{a.studentName} <span className="font-mono text-xs text-zinc-400">(CGPA {a.cgpa})</span></p>
                <p className="text-xs text-[#111111] dark:text-zinc-200">{a.companyName} · {a.role}</p>
                <p className="text-xs text-[#52525B] mt-1 whitespace-pre-wrap">{a.resumeNote}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusText status={a.status} />
                {canManage && (
                  <select
                    value={a.status}
                    onChange={e => updateAppStatus(a, e.target.value as any)}
                    className="px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md"
                  >
                    <option value="applied">Applied</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="offered">Offered</option>
                    <option value="rejected">Rejected</option>
                  </select>
                )}
              </div>
            </div>
          ))}
          {visibleApps.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No applications recorded yet.</p>}
        </div>
      )}

      {activeTab === 'resume' && isStudent && (
        <form onSubmit={handleSaveCareerProfile} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-semibold">Career & Resume Profile</h3>
            <p className="text-xs text-[#52525B] mt-0.5">Your saved resume URL and verified skills auto-fill when applying to campus recruitment drives.</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Resume / Portfolio Link (PDF URL, Drive, LinkedIn)</label>
            <input type="url" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Technical & Core Skills (comma separated)</label>
            <input type="text" value={skillsText} onChange={e => setSkillsText(e.target.value)} placeholder="TypeScript, React, Python, SQL, Machine Learning" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Career Objective & Project Highlights</label>
            <textarea rows={4} value={resumeSummary} onChange={e => setResumeSummary(e.target.value)} placeholder="Summarize internships, capstone projects, certifications..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingResume} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {savingResume ? 'Saving...' : 'Save Career Profile'}
            </button>
          </div>
        </form>
      )}

      <Modal open={driveModal} onClose={() => setDriveModal(false)} title="Post Campus Placement Drive">
        <form onSubmit={handleCreateDrive} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Company Name</label><input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Job Role</label><input type="text" required value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">CTC Package (LPA)</label><input type="number" step={0.5} required value={packageLpa} onChange={e => setPackageLpa(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Min CGPA</label><input type="number" step={0.1} required value={eligibilityCgpa} onChange={e => setEligibilityCgpa(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Location</label><input type="text" required value={location} onChange={e => setLocation(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Drive Date</label><input type="date" required value={driveDate} onChange={e => setDriveDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Skills, interview rounds, job description..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDriveModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Publish Drive</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!applyTarget} onClose={() => setApplyTarget(null)} title={`Apply — ${applyTarget?.companyName} (${applyTarget?.role})`}>
        <form onSubmit={handleApply} className="space-y-4">
          <p className="text-xs text-[#52525B]">Verified CGPA: <strong className="font-mono text-[#111111]">{myCgpa}</strong></p>
          <textarea required rows={4} value={resumeNote} onChange={e => setResumeNote(e.target.value)} placeholder="Share portfolio URL, GitHub/LinkedIn, and key skills..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setApplyTarget(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Application</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

