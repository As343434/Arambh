import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Save, Settings, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { PageHeader } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { GradeBand } from '../types';

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { university, settings } = useUniversity();

  const [uniName, setUniName] = useState(university.name);
  const [uniShort, setUniShort] = useState(university.shortName);
  const [currency, setCurrency] = useState(university.currency);

  const [attThreshold, setAttThreshold] = useState(settings.attendanceThreshold);
  const [graceMins, setGraceMins] = useState(settings.lateGraceMinutes);
  const [passingPct, setPassingPct] = useState(settings.passingPercentage);
  const [lateFeePerDay, setLateFeePerDay] = useState(settings.feeLateFeePerDay);
  const [lmsAutoEnroll, setLmsAutoEnroll] = useState(settings.lmsAutoEnroll);
  const [allowOnlineExams, setAllowOnlineExams] = useState(settings.allowOnlineExams);
  const [allowCorrRequests, setAllowCorrRequests] = useState(settings.allowStudentCorrectionRequests);
  const [gradingScale, setGradingScale] = useState<GradeBand[]>(settings.gradingScale);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    setUniName(university.name);
    setUniShort(university.shortName);
    setCurrency(university.currency);
  }, [university]);

  useEffect(() => {
    setAttThreshold(settings.attendanceThreshold);
    setGraceMins(settings.lateGraceMinutes);
    setPassingPct(settings.passingPercentage);
    setLateFeePerDay(settings.feeLateFeePerDay);
    setLmsAutoEnroll(settings.lmsAutoEnroll);
    setAllowOnlineExams(settings.allowOnlineExams);
    setAllowCorrRequests(settings.allowStudentCorrectionRequests);
    setGradingScale(settings.gradingScale);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, 'university_config', 'main'), {
      name: uniName,
      shortName: uniShort,
      currency,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, 'system_settings', 'main'), {
      attendanceThreshold: Number(attThreshold),
      lateGraceMinutes: Number(graceMins),
      passingPercentage: Number(passingPct),
      feeLateFeePerDay: Number(lateFeePerDay),
      lmsAutoEnroll,
      allowOnlineExams,
      allowStudentCorrectionRequests: allowCorrRequests,
      gradingScale,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await logAudit(profile, 'UPDATE_SETTINGS', 'Settings', 'system_settings/main', `Attendance threshold: ${attThreshold}%, Passing: ${passingPct}%`);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System & Academic Policy Settings"
        subtitle="Configure global institutional parameters, attendance thresholds, fee penalties, LMS rules, and grading scale."
        actions={
          <Link
            to="/rbac"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" /> Manage Roles & RBAC
          </Link>
        }
      />

      {savedBanner && (
        <div className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs text-[#111111] dark:text-zinc-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> System settings saved and applied across all portals.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-[#111111]" /> Institution & Financial Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium mb-1">University Name</label><input type="text" value={uniName} onChange={e => setUniName(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Short Brand Name</label><input type="text" value={uniShort} onChange={e => setUniShort(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Currency Code</label><input type="text" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <h3 className="text-sm font-semibold">Attendance, Examination & LMS Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium mb-1">Min Attendance (%)</label><input type="number" min={0} max={100} value={attThreshold} onChange={e => setAttThreshold(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Late Grace (min)</label><input type="number" min={0} value={graceMins} onChange={e => setGraceMins(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Passing Score (%)</label><input type="number" min={0} max={100} value={passingPct} onChange={e => setPassingPct(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Late Fee / Day</label><input type="number" min={0} value={lateFeePerDay} onChange={e => setLateFeePerDay(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <div className="flex flex-wrap gap-6 pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={lmsAutoEnroll} onChange={e => setLmsAutoEnroll(e.target.checked)} /> Auto-enroll class students in LMS courses</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowOnlineExams} onChange={e => setAllowOnlineExams(e.target.checked)} /> Enable online timed LMS quizzes</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowCorrRequests} onChange={e => setAllowCorrRequests(e.target.checked)} /> Allow student attendance dispute requests</label>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
          <h3 className="text-sm font-semibold">University Grading Scale</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {gradingScale.map((band, idx) => (
              <div key={band.grade} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Grade {band.grade}</span>
                  <span className="font-mono text-[#111111] dark:text-zinc-200">GP {band.gradePoint}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Min %:</span>
                  <input
                    type="number"
                    value={band.minPercentage}
                    onChange={e =>
                      setGradingScale(prev =>
                        prev.map((x, i) => (i === idx ? { ...x, minPercentage: Number(e.target.value) } : x))
                      )
                    }
                    className="w-16 px-2 py-0.5 font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                  />
                  <span className="text-zinc-400 truncate">{band.remarks}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">
            <Save className="w-3.5 h-3.5" /> Save System Policy
          </button>
        </div>
      </form>
    </div>
  );
};
