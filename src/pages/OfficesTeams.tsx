import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { MODULES_LIST, PERMISSION_SCOPES } from '../config/rbac';
import { Designation, InstitutionalOffice, InstitutionalTeam, ModuleKey, PermissionScope, TeamTask } from '../types';
import { exportToCsv, logAudit } from '../services/erpService';
import { Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { Building2, Users, Briefcase, CheckSquare, Plus, Download, Trash2, Edit2 } from 'lucide-react';

export const OfficesTeams: React.FC = () => {
  const { profile } = useAuth();
  const { campuses, departments, offices, teams, designations, employees } = useUniversity();
  const [tab, setTab] = useState<'hierarchy' | 'offices' | 'teams' | 'designations' | 'tasks'>('offices');
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [search, setSearch] = useState('');

  // Office modal
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<InstitutionalOffice | null>(null);
  const [officeForm, setOfficeForm] = useState({
    name: '', code: '', category: 'Administration', campusId: '', departmentId: '',
    directorId: '', managerId: '', scope: 'office' as PermissionScope, description: '',
    workflowEnabled: true, allowedModules: [] as ModuleKey[]
  });

  // Team modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<InstitutionalTeam | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '', code: '', officeId: '', departmentId: '', campusId: '',
    leaderId: '', memberIds: [] as string[], description: '',
    scope: 'team' as PermissionScope, workflowStageName: ''
  });

  // Designation form
  const [desigForm, setDesigForm] = useState({ title: '', code: '', category: 'teaching' as Designation['category'], gradeLevel: 'L1', departmentId: '', officeId: '' });

  // Team Task form
  const [taskForm, setTaskForm] = useState({ teamId: '', title: '', description: '', assigneeId: '', dueDate: '', priority: 'medium' as TeamTask['priority'] });

  useEffect(() => {
    return onSnapshot(collection(db, 'teamTasks'), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamTask)));
    }, () => {});
  }, []);

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    const directorName = employees.find(u => u.uid === officeForm.directorId)?.name || '';
    const managerName = employees.find(u => u.uid === officeForm.managerId)?.name || '';
    const payload = { ...officeForm, directorName, managerName, status: 'active' as const };
    if (editingOffice) {
      await updateDoc(doc(db, 'offices', editingOffice.id), payload);
      await logAudit(profile, 'UPDATE_OFFICE', 'OfficesTeams', editingOffice.id, `Updated office ${officeForm.name}`);
    } else {
      const ref = await addDoc(collection(db, 'offices'), { ...payload, createdAt: serverTimestamp() });
      await logAudit(profile, 'CREATE_OFFICE', 'OfficesTeams', ref.id, `Created office ${officeForm.name}`);
    }
    setShowOfficeModal(false);
    setEditingOffice(null);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const leaderName = employees.find(u => u.uid === teamForm.leaderId)?.name || '';
    const payload = { ...teamForm, leaderName, permissions: {}, status: 'active' as const };
    if (editingTeam) {
      await updateDoc(doc(db, 'teams', editingTeam.id), payload);
      await logAudit(profile, 'UPDATE_TEAM', 'OfficesTeams', editingTeam.id, `Updated team ${teamForm.name}`);
    } else {
      const ref = await addDoc(collection(db, 'teams'), { ...payload, createdAt: serverTimestamp() });
      await logAudit(profile, 'CREATE_TEAM', 'OfficesTeams', ref.id, `Created team ${teamForm.name}`);
    }
    setShowTeamModal(false);
    setEditingTeam(null);
  };

  const q = search.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Offices, Teams & Organizational Structure"
        subtitle="Configure University → Campus → Faculty → Department → Office → Team → Employee reporting and operational workflows."
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportToCsv('institutional-offices', offices)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Institutional Offices" value={offices.length} icon={Building2} tone="indigo" />
        <StatCard label="Operational Teams" value={teams.length} icon={Users} tone="emerald" />
        <StatCard label="Designations" value={designations.length} icon={Briefcase} tone="amber" />
        <StatCard label="Active Team Tasks" value={tasks.filter(t => t.status !== 'done').length} icon={CheckSquare} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SegmentedTabs
          active={tab}
          onChange={v => setTab(v as any)}
          tabs={[
            { id: 'offices', label: 'Offices', count: offices.length },
            { id: 'teams', label: 'Teams', count: teams.length },
            { id: 'designations', label: 'Designations', count: designations.length },
            { id: 'tasks', label: 'Team Tasks', count: tasks.length },
            { id: 'hierarchy', label: 'Org Tree View' },
          ]}
        />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter offices, teams, titles..." className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg w-full md:w-64" />
      </div>

      {tab === 'offices' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditingOffice(null);
                setOfficeForm({ name: '', code: '', category: 'Administration', campusId: '', departmentId: '', directorId: '', managerId: '', scope: 'office', description: '', workflowEnabled: true, allowedModules: [] });
                setShowOfficeModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Create Office
            </button>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Office Name & Category</th>
                  <th className="px-4 py-3 text-left">Director / Manager</th>
                  <th className="px-4 py-3 text-left">Scope</th>
                  <th className="px-4 py-3 text-right">Teams / Staff</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {offices.filter(o => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)).map(off => {
                  const officeTeams = teams.filter(t => t.officeId === off.id).length;
                  const officeStaff = employees.filter(e => e.officeId === off.id).length;
                  return (
                    <tr key={off.id}>
                      <td className="px-4 py-3 font-mono font-semibold">{off.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{off.name}</p>
                        <p className="text-[#52525B]">{off.category} · {off.description}</p>
                      </td>
                      <td className="px-4 py-3 text-[#52525B]">
                        <p>Dir: {off.directorName || 'Unassigned'}</p>
                        <p>Mgr: {off.managerName || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3 capitalize">{off.scope.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{officeTeams} teams · {officeStaff} staff</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingOffice(off);
                            setOfficeForm({
                              name: off.name, code: off.code, category: off.category,
                              campusId: off.campusId || '', departmentId: off.departmentId || '',
                              directorId: off.directorId || '', managerId: off.managerId || '',
                              scope: off.scope, description: off.description,
                              workflowEnabled: off.workflowEnabled, allowedModules: off.allowedModules || []
                            });
                            setShowOfficeModal(true);
                          }}
                          className="text-zinc-400 hover:text-[#111111]"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button onClick={() => deleteDoc(doc(db, 'offices', off.id))} className="text-zinc-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {offices.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-500">No institutional offices created yet. Click &quot;Create Office&quot; to add one.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'teams' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditingTeam(null);
                setTeamForm({ name: '', code: '', officeId: '', departmentId: '', campusId: '', leaderId: '', memberIds: [], description: '', scope: 'team', workflowStageName: '' });
                setShowTeamModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Create Team
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.filter(t => t.name.toLowerCase().includes(q)).map(team => {
              const off = offices.find(o => o.id === team.officeId);
              const dept = departments.find(d => d.id === team.departmentId);
              return (
                <div key={team.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[11px] text-[#111111] dark:text-zinc-200">{team.code}</p>
                      <h3 className="text-sm font-semibold">{team.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingTeam(team); setTeamForm({ name: team.name, code: team.code, officeId: team.officeId || '', departmentId: team.departmentId || '', campusId: team.campusId || '', leaderId: team.leaderId || '', memberIds: team.memberIds || [], description: team.description, scope: team.scope, workflowStageName: team.workflowStageName || '' }); setShowTeamModal(true); }} className="text-zinc-400 hover:text-[#111111]"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteDoc(doc(db, 'teams', team.id))} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-[#52525B]">{team.description}</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs space-y-1">
                    <p><span className="text-[#52525B]">Leader:</span> {team.leaderName || 'Unassigned'}</p>
                    <p><span className="text-[#52525B]">Parent:</span> {off?.name || dept?.name || 'University-wide'}</p>
                    <p><span className="text-[#52525B]">Members:</span> <span className="font-mono">{team.memberIds?.length || 0}</span> · Scope: {team.scope}</p>
                  </div>
                </div>
              );
            })}
            {teams.length === 0 && <div className="col-span-full p-8 text-center text-xs text-[#52525B] bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">No teams created yet.</div>}
          </div>
        </div>
      )}

      {tab === 'designations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              await addDoc(collection(db, 'designations'), desigForm);
              setDesigForm({ title: '', code: '', category: 'teaching', gradeLevel: 'L1', departmentId: '', officeId: '' });
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit text-xs"
          >
            <h3 className="text-sm font-semibold">Add Institutional Designation</h3>
            <input required placeholder="Title (e.g. Associate Professor)" value={desigForm.title} onChange={e => setDesigForm({ ...desigForm, title: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Code (ASSOC-PROF)" value={desigForm.code} onChange={e => setDesigForm({ ...desigForm, code: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <input placeholder="Grade Level (L3)" value={desigForm.gradeLevel} onChange={e => setDesigForm({ ...desigForm, gradeLevel: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <select value={desigForm.category} onChange={e => setDesigForm({ ...desigForm, category: e.target.value as any })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="teaching">Teaching Faculty</option>
              <option value="non_teaching">Non-Teaching Staff</option>
              <option value="executive">Executive Leadership</option>
            </select>
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Add Designation</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Grade</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {designations.map(d => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{d.code}</td>
                    <td className="px-4 py-3 font-medium">{d.title}</td>
                    <td className="px-4 py-3 capitalize">{d.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3 font-mono">{d.gradeLevel}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => deleteDoc(doc(db, 'designations', d.id))} className="text-zinc-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5 inline" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async e => {
              e.preventDefault();
              const team = teams.find(t => t.id === taskForm.teamId);
              const assignee = employees.find(u => u.uid === taskForm.assigneeId);
              await addDoc(collection(db, 'teamTasks'), {
                ...taskForm,
                teamName: team?.name || '',
                assigneeName: assignee?.name || '',
                status: 'todo',
                createdAt: serverTimestamp()
              });
              setTaskForm({ teamId: '', title: '', description: '', assigneeId: '', dueDate: '', priority: 'medium' });
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3 h-fit text-xs"
          >
            <h3 className="text-sm font-semibold">Assign Team Task</h3>
            <select required value={taskForm.teamId} onChange={e => setTaskForm({ ...taskForm, teamId: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input required placeholder="Task Title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select required value={taskForm.assigneeId} onChange={e => setTaskForm({ ...taskForm, assigneeId: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Assign To Employee</option>
              {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" required value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <textarea rows={2} placeholder="Task details" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <button type="submit" className="w-full py-2 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Assign Task</button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map(task => (
              <div key={task.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-semibold">{task.title}</p>
                  <p className="text-[#52525B] mt-0.5">{task.teamName} · Assignee: {task.assigneeName} · Due: <span className="font-mono">{task.dueDate}</span></p>
                </div>
                <select value={task.status} onChange={e => updateDoc(doc(db, 'teamTasks', task.id), { status: e.target.value })} className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded">
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            ))}
            {tasks.length === 0 && <p className="p-8 text-center text-xs text-[#52525B]">No team tasks assigned.</p>}
          </div>
        </div>
      )}

      {tab === 'hierarchy' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 space-y-5">
          <h3 className="text-sm font-semibold">Live Organizational Hierarchy</h3>
          <div className="space-y-4 text-xs">
            {(campuses.length ? campuses : [{ id: 'default', name: 'Main University Campus', code: 'MAIN' }]).map(campus => (
              <div key={campus.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                <p className="font-semibold text-sm">{campus.name} <span className="font-mono text-zinc-400">({campus.code})</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3 border-l border-zinc-200 dark:border-zinc-700">
                  <div>
                    <p className="font-semibold text-[#52525B] mb-2">Academic Departments ({departments.length})</p>
                    {departments.map(d => (
                      <div key={d.id} className="py-1.5">
                        <span className="font-medium">{d.name}</span> · <span className="font-mono text-[#52525B]">{employees.filter(e => e.departmentId === d.id).length} staff</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-[#52525B] mb-2">Institutional Offices & Teams ({offices.length})</p>
                    {offices.slice(0, 12).map(o => (
                      <div key={o.id} className="py-1.5">
                        <span className="font-medium">{o.name}</span> · <span className="font-mono text-[#52525B]">{teams.filter(t => t.officeId === o.id).length} teams · {employees.filter(e => e.officeId === o.id).length} staff</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showOfficeModal} onClose={() => setShowOfficeModal(false)} title={editingOffice ? 'Edit Office' : 'Create Institutional Office'}>
        <form onSubmit={handleSaveOffice} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Office Name" value={officeForm.name} onChange={e => setOfficeForm({ ...officeForm, name: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Code (e.g. REG)" value={officeForm.code} onChange={e => setOfficeForm({ ...officeForm, code: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input placeholder="Category" value={officeForm.category} onChange={e => setOfficeForm({ ...officeForm, category: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select value={officeForm.scope} onChange={e => setOfficeForm({ ...officeForm, scope: e.target.value as PermissionScope })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {PERMISSION_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={officeForm.directorId} onChange={e => setOfficeForm({ ...officeForm, directorId: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Office Director (Optional)</option>
              {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name}</option>)}
            </select>
            <select value={officeForm.managerId} onChange={e => setOfficeForm({ ...officeForm, managerId: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Office Manager (Optional)</option>
              {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name}</option>)}
            </select>
          </div>
          <textarea rows={2} placeholder="Office scope & responsibilities" value={officeForm.description} onChange={e => setOfficeForm({ ...officeForm, description: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div>
            <p className="font-semibold mb-1.5">Office Permitted Modules</p>
            <div className="max-h-36 overflow-y-auto grid grid-cols-2 gap-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
              {MODULES_LIST.map(m => (
                <label key={m.key} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={officeForm.allowedModules.includes(m.key)} onChange={() => setOfficeForm(prev => ({ ...prev, allowedModules: prev.allowedModules.includes(m.key) ? prev.allowedModules.filter(x => x !== m.key) : [...prev.allowedModules, m.key] }))} />
                  <span className="truncate">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Save Office</button>
        </form>
      </Modal>

      <Modal open={showTeamModal} onClose={() => setShowTeamModal(false)} title={editingTeam ? 'Edit Team' : 'Create Operational Team'}>
        <form onSubmit={handleSaveTeam} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Team Name" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Team Code" value={teamForm.code} onChange={e => setTeamForm({ ...teamForm, code: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select value={teamForm.officeId} onChange={e => setTeamForm({ ...teamForm, officeId: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Assign Office (Optional)</option>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select value={teamForm.departmentId} onChange={e => setTeamForm({ ...teamForm, departmentId: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Assign Department (Optional)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={teamForm.leaderId} onChange={e => setTeamForm({ ...teamForm, leaderId: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Team Leader</option>
              {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name}</option>)}
            </select>
            <select value={teamForm.scope} onChange={e => setTeamForm({ ...teamForm, scope: e.target.value as PermissionScope })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {PERMISSION_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <textarea rows={2} placeholder="Team description" value={teamForm.description} onChange={e => setTeamForm({ ...teamForm, description: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div>
            <p className="font-semibold mb-1.5">Team Members ({teamForm.memberIds.length})</p>
            <div className="max-h-36 overflow-y-auto space-y-1 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
              {employees.map(emp => (
                <label key={emp.uid} className="flex items-center gap-2">
                  <input type="checkbox" checked={teamForm.memberIds.includes(emp.uid)} onChange={() => setTeamForm(prev => ({ ...prev, memberIds: prev.memberIds.includes(emp.uid) ? prev.memberIds.filter(x => x !== emp.uid) : [...prev.memberIds, emp.uid] }))} />
                  <span>{emp.name} · <span className="text-zinc-400">{emp.role}</span></span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Save Team</button>
        </form>
      </Modal>
    </div>
  );
};
