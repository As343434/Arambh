import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { arrayUnion, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, getSecondaryAuth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversity } from '../../contexts/UniversityContext';
import { AccountStatus, UserProfile, UserRole } from '../../types';
import { ROLE_METADATA, normalizeRole } from '../../config/rbac';
import { exportToCsv, logAudit } from '../../services/erpService';
import { BulkUpload } from '../../components/BulkUpload';
import { Modal, PageHeader, SegmentedTabs, StatusText } from '../../components/ui/DataUI';
import { Download, Edit2, Eye, Plus, Search, Trash2, Upload, UserPlus } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const { users, departments, programs, batches, classes } = useUniversity();

  const [activeTab, setActiveTab] = useState<'directory' | 'create' | 'bulk'>('directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'id'>('name');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkStatus, setBulkStatus] = useState<AccountStatus>('active');

  // Create form
  const [newUser, setNewUser] = useState({
    name: '', email: '', role: 'student' as UserRole, idCode: '', phone: '',
    departmentId: '', programId: '', batchId: '', classId: '', section: '',
    guardianName: '', guardianPhone: '', designation: '', salaryBasic: 0
  });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return users
      .filter(u => {
        const matchQ =
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.rollNo || u.employeeId || '').toLowerCase().includes(q);
        const normRole = normalizeRole(u.role);
        const matchRole = roleFilter === 'all' || normRole === roleFilter;
        const matchDept = deptFilter === 'all' || u.departmentId === deptFilter;
        const matchStatus = statusFilter === 'all' || (u.status || 'active') === statusFilter;
        return matchQ && matchRole && matchDept && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'role') return String(a.role).localeCompare(String(b.role));
        if (sortBy === 'id') return String(a.rollNo || a.employeeId || '').localeCompare(String(b.rollNo || b.employeeId || ''));
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [users, searchTerm, roleFilter, deptFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    try {
      const prefix = newUser.role === 'student' ? 'stu' : 'staff';
      const finalEmail = newUser.email || `${prefix}${newUser.idCode || Date.now()}@arambh.edu`;
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, 'arambh123');
      const uid = cred.user.uid;

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: newUser.name,
        email: finalEmail,
        role: newUser.role,
        status: 'active',
        phone: newUser.phone,
        departmentId: newUser.departmentId,
        programId: newUser.programId,
        batchId: newUser.batchId,
        classId: newUser.classId,
        section: newUser.section,
        guardianName: newUser.guardianName,
        guardianPhone: newUser.guardianPhone,
        designation: newUser.designation,
        salaryBasic: Number(newUser.salaryBasic) || 0,
        [newUser.role === 'student' ? 'rollNo' : 'employeeId']: newUser.idCode,
        isFirstLogin: true,
        createdAt: serverTimestamp()
      });

      if (newUser.role === 'student' && newUser.classId) {
        await updateDoc(doc(db, 'classes', newUser.classId), { students: arrayUnion(uid) });
      }

      await secondaryAuth.signOut();
      await logAudit(profile, 'CREATE_USER', 'Users', uid, `Provisioned ${newUser.role}: ${newUser.name} (${finalEmail})`);
      setCreateMsg({ type: 'success', text: `Account provisioned! Email: ${finalEmail} · Default Password: arambh123` });
      setNewUser({
        name: '', email: '', role: 'student', idCode: '', phone: '',
        departmentId: '', programId: '', batchId: '', classId: '', section: '',
        guardianName: '', guardianPhone: '', designation: '', salaryBasic: 0
      });
    } catch (err: any) {
      setCreateMsg({ type: 'error', text: err.message || 'Failed to provision user' });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await setDoc(doc(db, 'users', editingUser.uid), editForm, { merge: true });
    if (editForm.role === 'student' && editForm.classId) {
      await updateDoc(doc(db, 'classes', editForm.classId), { students: arrayUnion(editingUser.uid) });
    }
    await logAudit(profile, 'UPDATE_USER', 'Users', editingUser.uid, `Updated user ${editForm.name}`);
    setEditingUser(null);
  };

  const handleBulkAssignClass = async () => {
    if (!bulkClassId || selectedUids.length === 0) return;
    await Promise.all(selectedUids.map(uid => updateDoc(doc(db, 'users', uid), { classId: bulkClassId })));
    await updateDoc(doc(db, 'classes', bulkClassId), { students: arrayUnion(...selectedUids) });
    await logAudit(profile, 'BULK_CLASS_ASSIGN', 'Users', bulkClassId, `Assigned ${selectedUids.length} users to class`);
    setSelectedUids([]);
  };

  const handleBulkStatus = async () => {
    if (selectedUids.length === 0) return;
    await Promise.all(selectedUids.map(uid => updateDoc(doc(db, 'users', uid), { status: bulkStatus })));
    await logAudit(profile, 'BULK_STATUS_UPDATE', 'Users', 'bulk', `Updated ${selectedUids.length} users to ${bulkStatus}`);
    setSelectedUids([]);
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (!window.confirm(`Remove ${u.name} from university directory?`)) return;
    await deleteDoc(doc(db, 'users', u.uid));
    await logAudit(profile, 'DELETE_USER', 'Users', u.uid, `Removed ${u.name}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="University Directory & Identity Management"
        subtitle="Search, filter, provision, bulk-import, and manage students, faculty, staff, and specialist portal users."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportToCsv('university-users', filtered.map(u => ({
                uid: u.uid, name: u.name, email: u.email, role: u.role,
                id: u.rollNo || u.employeeId || '', status: u.status || 'active',
                department: departments.find(d => d.id === u.departmentId)?.name || ''
              })))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200"
            >
              <UserPlus className="w-3.5 h-3.5" /> Provision User
            </button>
          </div>
        }
      />

      <SegmentedTabs
        active={activeTab}
        onChange={v => setActiveTab(v as any)}
        tabs={[
          { id: 'directory', label: 'User Directory', count: users.length },
          { id: 'create', label: 'Provision Account' },
          { id: 'bulk', label: 'Bulk CSV Import' },
        ]}
      />

      {activeTab === 'bulk' && <BulkUpload onComplete={() => setActiveTab('directory')} />}

      {activeTab === 'create' && (
        <form onSubmit={handleCreateUser} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-6 max-w-3xl space-y-4">
          <h3 className="text-base font-semibold">Provision New University Account</h3>
          {createMsg && (
            <div className={`p-3 rounded-lg text-xs border ${createMsg.type === 'success' ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 text-[#111111] dark:text-zinc-200' : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 text-rose-700 dark:text-rose-300'}`}>
              {createMsg.text}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Full Name</label>
              <input required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Portal Role</label>
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {Object.entries(ROLE_METADATA).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{newUser.role === 'student' ? 'Student ID / Roll No' : 'Employee ID'}</label>
              <input required value={newUser.idCode} onChange={e => setNewUser({ ...newUser, idCode: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email (optional)</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" placeholder="Auto-generated if blank" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Department</label>
              <select value={newUser.departmentId} onChange={e => setNewUser({ ...newUser, departmentId: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone</label>
              <input value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            {newUser.role === 'student' && (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1">Program</label>
                  <select value={newUser.programId} onChange={e => setNewUser({ ...newUser, programId: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="">Select Program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Class / Section</label>
                  <select value={newUser.classId} onChange={e => setNewUser({ ...newUser, classId: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <option value="">Assign Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Guardian Name</label>
                  <input value={newUser.guardianName} onChange={e => setNewUser({ ...newUser, guardianName: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Guardian Phone</label>
                  <input value={newUser.guardianPhone} onChange={e => setNewUser({ ...newUser, guardianPhone: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
              </>
            )}
            {newUser.role !== 'student' && newUser.role !== 'parent' && (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1">Designation</label>
                  <input value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} placeholder="e.g. Associate Professor" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Monthly Base Salary</label>
                  <input type="number" value={newUser.salaryBasic} onChange={e => setNewUser({ ...newUser, salaryBasic: Number(e.target.value) })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                </div>
              </>
            )}
          </div>
          <button type="submit" disabled={creating} className="px-5 py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50">
            {creating ? 'Provisioning...' : 'Provision Account (Auth + Firestore)'}
          </button>
        </form>
      )}

      {activeTab === 'directory' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search name, email, roll no, employee ID..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="all">All Roles</option>
              {Object.entries(ROLE_METADATA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="name">Sort: Name</option>
              <option value="role">Sort: Role</option>
              <option value="id">Sort: ID / Roll No</option>
            </select>
          </div>

          {selectedUids.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs">
              <span className="font-semibold text-[#111111] dark:text-zinc-200">{selectedUids.length} selected</span>
              <select value={bulkClassId} onChange={e => setBulkClassId(e.target.value)} className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded">
                <option value="">Assign to Class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={handleBulkAssignClass} className="px-3 py-1 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded font-semibold">Apply Class</button>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as AccountStatus)} className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
                <option value="graduated">graduated</option>
              </select>
              <button type="button" onClick={handleBulkStatus} className="px-3 py-1 bg-slate-900 dark:bg-zinc-100 text-white dark:text-[#111111] rounded font-semibold">Set Status</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-[#52525B]">
                <tr>
                  <th className="py-2.5 px-3 text-left">
                    <input
                      type="checkbox"
                      checked={paginated.length > 0 && paginated.every(u => selectedUids.includes(u.uid))}
                      onChange={e => setSelectedUids(e.target.checked ? paginated.map(u => u.uid) : [])}
                    />
                  </th>
                  <th className="py-2.5 px-3 text-left font-semibold">Name & Email</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Role</th>
                  <th className="py-2.5 px-3 text-left font-semibold">ID / Roll No</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Department / Class</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paginated.map(u => {
                  const dept = departments.find(d => d.id === u.departmentId)?.code;
                  const cls = classes.find(c => c.id === u.classId)?.name;
                  return (
                    <tr key={u.uid} className="hover:bg-zinc-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedUids.includes(u.uid)}
                          onChange={e => setSelectedUids(prev => e.target.checked ? [...prev, u.uid] : prev.filter(id => id !== u.uid))}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-[#111111] dark:text-zinc-100">{u.name || 'Unnamed'}</p>
                        <p className="text-[#52525B]">{u.email}</p>
                      </td>
                      <td className="py-2.5 px-3">{ROLE_METADATA[normalizeRole(u.role)]?.label}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">{u.rollNo || u.employeeId || '—'}</td>
                      <td className="py-2.5 px-3 text-[#52525B]">{[dept, cls].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="py-2.5 px-3"><StatusText status={u.status || 'active'} /></td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        {u.role === 'student' && (
                          <Link to={`/students/${u.uid}`} className="inline-flex items-center gap-1 text-[#111111] dark:text-zinc-200 font-medium hover:underline">
                            <Eye className="w-3.5 h-3.5" /> 360°
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => { setEditingUser(u); setEditForm(u); }}
                          className="text-[#52525B] hover:text-[#111111]"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="text-[#52525B] hover:text-rose-600"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-[#52525B]">
            <span>Showing {paginated.length} of <span className="font-mono">{filtered.length}</span> accounts</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded disabled:opacity-40">Prev</button>
              <span className="font-mono">Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User Profile & Academic Assignment">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Full Name</label>
              <input required value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Role</label>
              <select value={editForm.role || 'student'} onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {Object.entries(ROLE_METADATA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <select value={editForm.status || 'active'} onChange={e => setEditForm({ ...editForm, status: e.target.value as AccountStatus })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Department</label>
              <select value={editForm.departmentId || ''} onChange={e => setEditForm({ ...editForm, departmentId: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Class</label>
              <select value={editForm.classId || ''} onChange={e => setEditForm({ ...editForm, classId: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">None</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Roll No / Employee ID</label>
              <input value={editForm.rollNo || editForm.employeeId || ''} onChange={e => setEditForm({ ...editForm, [editForm.role === 'student' ? 'rollNo' : 'employeeId']: e.target.value })} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
