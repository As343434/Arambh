import React, { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { exportToCsv, logAudit } from '../../services/erpService';
import { EmptyState, PageHeader, SegmentedTabs } from '../../components/ui/DataUI';
import { Building2, Download, Plus, Trash2, Edit2 } from 'lucide-react';

type AcademicTab = 'departments' | 'programs' | 'courses' | 'subjects' | 'batches' | 'classes' | 'infrastructure' | 'calendar';

export const AcademicManagement: React.FC = () => {
  const { profile } = useAuth();
  const {
    campuses, buildings, rooms, faculties, departments, programs,
    courses, subjects, batches, classes, academicYears, semesters,
    academicEvents, teachers
  } = useUniversity();

  const [tab, setTab] = useState<AcademicTab>('departments');
  const [search, setSearch] = useState('');

  // Department form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHod, setDeptHod] = useState('');
  const [deptFaculty, setDeptFaculty] = useState('');

  // Program form
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progDept, setProgDept] = useState('');
  const [progDegree, setProgDegree] = useState<'UG' | 'PG' | 'Diploma' | 'PhD'>('UG');
  const [progYears, setProgYears] = useState(4);

  // Course form
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseProg, setCourseProg] = useState('');
  const [courseSem, setCourseSem] = useState(1);
  const [courseCredits, setCourseCredits] = useState(4);

  // Subject form
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subDept, setSubDept] = useState('');
  const [subCredits, setSubCredits] = useState(4);
  const [subType, setSubType] = useState<'theory' | 'practical' | 'project'>('theory');

  // Batch form
  const [batchName, setBatchName] = useState('');
  const [batchProg, setBatchProg] = useState('');
  const [batchStart, setBatchStart] = useState(2026);
  const [batchEnd, setBatchEnd] = useState(2030);

  // Class form
  const [clsName, setClsName] = useState('');
  const [clsSection, setClsSection] = useState('A');
  const [clsDept, setClsDept] = useState('');
  const [clsProg, setClsProg] = useState('');
  const [clsBatch, setClsBatch] = useState('');
  const [clsMentor, setClsMentor] = useState('');
  const [clsTeacher, setClsTeacher] = useState('');
  const [clsRoom, setClsRoom] = useState('');
  const [clsSubjects, setClsSubjects] = useState<string[]>([]);

  // Calendar event form
  const [evtTitle, setEvtTitle] = useState('');
  const [evtType, setEvtType] = useState<'holiday' | 'exam' | 'semester_start' | 'event' | 'deadline'>('event');
  const [evtStart, setEvtStart] = useState('');
  const [evtEnd, setEvtEnd] = useState('');
  const [evtDesc, setEvtDesc] = useState('');

  const removeDoc = async (col: string, id: string, label: string) => {
    await deleteDoc(doc(db, col, id));
    await logAudit(profile, 'DELETE', 'Academics', id, `Deleted ${label}`);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editSubId) {
      await updateDoc(doc(db, 'subjects', editSubId), {
        name: subName, code: subCode, departmentId: subDept, credits: subCredits, type: subType
      });
      await logAudit(profile, 'UPDATE_SUBJECT', 'Academics', editSubId, `Updated subject ${subCode}`);
      setEditSubId(null);
    } else {
      const ref = await addDoc(collection(db, 'subjects'), {
        name: subName, code: subCode, departmentId: subDept, credits: subCredits,
        lectureHours: subType === 'practical' ? 0 : 3, labHours: subType === 'practical' ? 4 : 1,
        type: subType, maxMarks: 100, passingMarks: 40, createdAt: serverTimestamp()
      });
      await logAudit(profile, 'CREATE_SUBJECT', 'Academics', ref.id, `Created subject ${subCode}`);
    }
    setSubName(''); setSubCode(''); setSubDept(''); setSubCredits(4);
  };

  const q = search.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Structure & Curriculum"
        subtitle="Manage faculties, departments, programs, courses, subjects, batches, classes, campus rooms, and the academic calendar."
        actions={
          <button
            type="button"
            onClick={() => {
              const map: Record<AcademicTab, any[]> = {
                departments, programs, courses, subjects, batches, classes, infrastructure: rooms, calendar: academicEvents
              };
              exportToCsv(`arambh-${tab}`, map[tab]);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SegmentedTabs
          active={tab}
          onChange={(id) => setTab(id as AcademicTab)}
          tabs={[
            { id: 'departments', label: 'Departments', count: departments.length },
            { id: 'programs', label: 'Programs', count: programs.length },
            { id: 'courses', label: 'Courses', count: courses.length },
            { id: 'subjects', label: 'Subjects', count: subjects.length },
            { id: 'batches', label: 'Batches', count: batches.length },
            { id: 'classes', label: 'Classes & Sections', count: classes.length },
            { id: 'infrastructure', label: 'Campuses & Rooms', count: rooms.length },
            { id: 'calendar', label: 'Academic Calendar', count: academicEvents.length },
          ]}
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter items..."
          className="px-3.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg w-full md:w-56"
        />
      </div>

      {tab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              const ref = await addDoc(collection(db, 'departments'), {
                name: deptName, code: deptCode, hodId: deptHod, facultyId: deptFaculty, createdAt: serverTimestamp()
              });
              await logAudit(profile, 'CREATE_DEPARTMENT', 'Academics', ref.id, deptName);
              setDeptName(''); setDeptCode(''); setDeptHod(''); setDeptFaculty('');
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold">Add Department</h3>
            <input required placeholder="Department Name" value={deptName} onChange={e => setDeptName(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Code (e.g. CSE)" value={deptCode} onChange={e => setDeptCode(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select value={deptFaculty} onChange={e => setDeptFaculty(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Faculty (Optional)</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={deptHod} onChange={e => setDeptHod(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Assign HOD (Optional)</option>
              {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
            </select>
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200">Create Department</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">HOD</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {departments.filter(d => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)).map(d => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{d.code}</td>
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-[#52525B]">{teachers.find(t => t.uid === d.hodId)?.name || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeDoc('departments', d.id, d.name)} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'programs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              await addDoc(collection(db, 'programs'), {
                name: progName, code: progCode, departmentId: progDept, degreeType: progDegree,
                durationYears: progYears, totalSemesters: progYears * 2, totalCredits: progYears * 40
              });
              setProgName(''); setProgCode('');
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold">Add Degree Program</h3>
            <select required value={progDept} onChange={e => setProgDept(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input required placeholder="Program Name" value={progName} onChange={e => setProgName(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Code (BTECH-CS)" value={progCode} onChange={e => setProgCode(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <select value={progDegree} onChange={e => setProgDegree(e.target.value as any)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="UG">UG</option>
                <option value="PG">PG</option>
                <option value="Diploma">Diploma</option>
                <option value="PhD">PhD</option>
              </select>
              <input type="number" min={1} max={6} value={progYears} onChange={e => setProgYears(Number(e.target.value))} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Create Program</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-right">Duration</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {programs.filter(p => p.name.toLowerCase().includes(q)).map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{p.code}</td>
                    <td className="px-4 py-3 font-medium">{p.name} · {p.degreeType}</td>
                    <td className="px-4 py-3 text-[#52525B]">{departments.find(d => d.id === p.departmentId)?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{p.durationYears} yrs</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => removeDoc('programs', p.id, p.name)} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              const p = programs.find(x => x.id === courseProg);
              await addDoc(collection(db, 'courses'), {
                code: courseCode, name: courseName, programId: courseProg,
                departmentId: p?.departmentId || '', semesterNumber: courseSem, credits: courseCredits, type: 'core', description: ''
              });
              setCourseCode(''); setCourseName('');
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold">Add Curriculum Course</h3>
            <select required value={courseProg} onChange={e => setCourseProg(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input required placeholder="Course Code" value={courseCode} onChange={e => setCourseCode(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Course Name" value={courseName} onChange={e => setCourseName(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} max={12} placeholder="Semester #" value={courseSem} onChange={e => setCourseSem(Number(e.target.value))} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <input type="number" min={1} max={10} placeholder="Credits" value={courseCredits} onChange={e => setCourseCredits(Number(e.target.value))} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Course</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-right">Credits</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {courses.filter(c => c.name.toLowerCase().includes(q)).map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                    <td className="px-4 py-3 font-medium">{c.name} · Sem {c.semesterNumber}</td>
                    <td className="px-4 py-3 text-[#52525B]">{programs.find(p => p.id === c.programId)?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{c.credits}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => removeDoc('courses', c.id, c.name)} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveSubject} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit">
            <h3 className="text-sm font-semibold">{editSubId ? 'Edit Subject' : 'Add Subject'}</h3>
            <input required placeholder="Subject Name" value={subName} onChange={e => setSubName(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Code (CS-101)" value={subCode} onChange={e => setSubCode(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select value={subDept} onChange={e => setSubDept(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Department (Optional)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} max={10} value={subCredits} onChange={e => setSubCredits(Number(e.target.value))} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <select value={subType} onChange={e => setSubType(e.target.value as any)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="theory">Theory</option>
                <option value="practical">Practical</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div className="flex gap-2">
              {editSubId && (
                <button type="button" onClick={() => { setEditSubId(null); setSubName(''); setSubCode(''); }} className="flex-1 py-2 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">Cancel</button>
              )}
              <button type="submit" className="flex-1 py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">{editSubId ? 'Update' : 'Add Subject'}</button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Credits</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {subjects.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)).map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{s.code}</td>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 capitalize text-[#52525B]">{s.type || 'theory'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{s.credits || 4}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => { setEditSubId(s.id); setSubName(s.name); setSubCode(s.code); setSubDept(s.departmentId || ''); setSubCredits(s.credits || 4); setSubType(s.type || 'theory'); }} className="text-zinc-400 hover:text-[#111111]"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => removeDoc('subjects', s.id, s.name)} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'batches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              await addDoc(collection(db, 'batches'), {
                name: batchName, programId: batchProg, startYear: batchStart, endYear: batchEnd
              });
              setBatchName('');
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold">Add Student Batch</h3>
            <select required value={batchProg} onChange={e => setBatchProg(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input required placeholder="Batch Label (2026–2030)" value={batchName} onChange={e => setBatchName(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={batchStart} onChange={e => setBatchStart(Number(e.target.value))} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <input type="number" value={batchEnd} onChange={e => setBatchEnd(Number(e.target.value))} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Add Batch</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-right">Span</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {batches.map(b => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{b.name}</td>
                    <td className="px-4 py-3">{programs.find(p => p.id === b.programId)?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{b.startYear}–{b.endYear}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => removeDoc('batches', b.id, b.name)} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              await addDoc(collection(db, 'classes'), {
                name: clsName, section: clsSection, departmentId: clsDept, programId: clsProg,
                batchId: clsBatch, mentorId: clsMentor, teacherId: clsTeacher || clsMentor,
                roomId: clsRoom, subjectIds: clsSubjects, students: [], maxCapacity: 60
              });
              setClsName(''); setClsSubjects([]);
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold">Create Class & Section</h3>
            <input required placeholder="Class Name (B.Tech CS Sem 1 - A)" value={clsName} onChange={e => setClsName(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Section" value={clsSection} onChange={e => setClsSection(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <select value={clsDept} onChange={e => setClsDept(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={clsProg} onChange={e => setClsProg(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={clsBatch} onChange={e => setClsBatch(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <select required value={clsMentor} onChange={e => setClsMentor(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Class Mentor</option>
              {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
            </select>
            <select value={clsRoom} onChange={e => setClsRoom(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Home Classroom (Optional)</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} · {r.name}</option>)}
            </select>
            <div>
              <p className="text-[11px] font-semibold mb-1.5">Subjects in Curriculum</p>
              <div className="max-h-32 overflow-y-auto space-y-1 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
                {subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={clsSubjects.includes(s.id)}
                      onChange={() => setClsSubjects(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                    />
                    <span>{s.code} · {s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Create Class</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left">Class & Section</th>
                  <th className="px-4 py-3 text-left">Mentor</th>
                  <th className="px-4 py-3 text-right">Subjects</th>
                  <th className="px-4 py-3 text-right">Students</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {classes.filter(c => c.name.toLowerCase().includes(q)).map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-[#52525B]">{teachers.find(t => t.uid === c.mentorId)?.name || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{c.subjectIds?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{c.students?.length || 0}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => removeDoc('classes', c.id, c.name)} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'infrastructure' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
            <h3 className="text-sm font-semibold">Campuses ({campuses.length})</h3>
            {campuses.map(c => (
              <div key={c.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs">
                <p className="font-semibold">{c.name}</p>
                <p className="text-[#52525B]">{c.code} · {c.city}</p>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
            <h3 className="text-sm font-semibold">Buildings ({buildings.length})</h3>
            {buildings.map(b => (
              <div key={b.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs">
                <p className="font-semibold">{b.name}</p>
                <p className="text-[#52525B]">{b.code} · {b.floors} floors</p>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
            <h3 className="text-sm font-semibold">Classrooms, Labs & Halls ({rooms.length})</h3>
            {rooms.map(r => (
              <div key={r.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs flex justify-between">
                <div>
                  <p className="font-semibold">{r.roomNumber} · {r.name}</p>
                  <p className="text-[#52525B] capitalize">{r.type}</p>
                </div>
                <span className="font-mono">{r.capacity} seats</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              await addDoc(collection(db, 'academicEvents'), {
                title: evtTitle, type: evtType, startDate: evtStart, endDate: evtEnd, description: evtDesc
              });
              setEvtTitle(''); setEvtDesc('');
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-semibold">Add Calendar Milestone</h3>
            <input required placeholder="Title" value={evtTitle} onChange={e => setEvtTitle(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select value={evtType} onChange={e => setEvtType(e.target.value as any)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="semester_start">Semester Start</option>
              <option value="exam">Examination</option>
              <option value="holiday">Holiday</option>
              <option value="deadline">Deadline</option>
              <option value="event">Academic Event</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" required value={evtStart} onChange={e => setEvtStart(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <input type="date" required value={evtEnd} onChange={e => setEvtEnd(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <textarea rows={2} placeholder="Description" value={evtDesc} onChange={e => setEvtDesc(e.target.value)} className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg">Publish to Calendar</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-slate-200 dark:divide-slate-800">
            {academicEvents.length > 0 ? academicEvents.map(ev => (
              <div key={ev.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{ev.title}</p>
                  <p className="text-xs text-[#52525B] mt-0.5">{ev.type.replace('_', ' ')} · <span className="font-mono">{ev.startDate} → {ev.endDate}</span></p>
                  {ev.description && <p className="text-xs text-[#52525B] mt-1">{ev.description}</p>}
                </div>
                <button onClick={() => removeDoc('academicEvents', ev.id, ev.title)} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            )) : (
              <div className="p-8 text-center text-xs text-[#52525B]">No academic calendar events added yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
