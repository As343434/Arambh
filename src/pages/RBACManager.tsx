import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import {
  ALL_PERMISSIONS,
  DEFAULT_APPROVAL_WORKFLOWS,
  DEFAULT_ROLE_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  MODULES_LIST,
  PERMISSION_ACTIONS,
  PERMISSION_SCOPES
} from '../config/rbac';
import { ApprovalProcessType, ApprovalStage, ModuleKey, PermissionAction, PermissionScope, RoleDefinition, UserProfile } from '../types';
import { logAudit } from '../services/erpService';
import { Modal, PageHeader, SegmentedTabs, StatusText } from '../components/ui/DataUI';
import { Copy, Plus, Save, ShieldCheck, UserCheck } from 'lucide-react';

export const RBACManager: React.FC = () => {
  const { profile, customPermissions } = useAuth();
  const { roles, users, offices, departments, teams, campuses, approvalWorkflows } = useUniversity();

  const [tab, setTab] = useState<'roles' | 'matrix' | 'users' | 'workflows'>('roles');
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState('hod');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Create / Duplicate / Edit Role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState<Partial<RoleDefinition>>({
    key: '', name: '', description: '', category: 'Administration',
    defaultScope: 'office', approvalLimit: 0, isActive: true, restrictedFields: ['salary', 'financials']
  });

  // User scope/multi-role editor
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userAccessForm, setUserAccessForm] = useState({
    role: 'teacher',
    roles: [] as string[],
    scope: 'assigned' as PermissionScope,
    campusId: '',
    departmentId: '',
    officeId: '',
    teamId: '',
    approvalLimit: 0,
    permissionExpiresAt: '',
    delegatedToUid: ''
  });

  const mergedRoles = useMemo(() => {
    const map = new Map<string, RoleDefinition>();
    DEFAULT_ROLE_DEFINITIONS.forEach(r => map.set(r.key, r));
    roles.forEach(r => map.set(r.key || r.id, r));
    return Array.from(map.values());
  }, [roles]);

  const activeRole = mergedRoles.find(r => r.key === selectedRoleKey) || mergedRoles[0];

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = (roleForm.key || roleForm.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key) return;
    const payload: RoleDefinition = {
      id: key,
      key,
      name: roleForm.name || key,
      description: roleForm.description || '',
      category: (roleForm.category as any) || 'Administration',
      defaultScope: (roleForm.defaultScope as PermissionScope) || 'office',
      approvalLimit: Number(roleForm.approvalLimit) || 0,
      isSystem: roleForm.isSystem ?? false,
      isActive: roleForm.isActive ?? true,
      restrictedFields: roleForm.restrictedFields || [],
      matrix: roleForm.matrix || {},
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'roles', key), payload, { merge: true });
    await logAudit(profile, 'SAVE_ROLE', 'RBAC', key, `Saved role ${payload.name} (scope: ${payload.defaultScope})`);
    setShowRoleModal(false);
    setSelectedRoleKey(key);
    notify(`Role "${payload.name}" saved.`);
  };

  const handleDuplicateRole = (r: RoleDefinition) => {
    setRoleForm({
      ...r,
      id: '',
      key: `${r.key}_custom`,
      name: `${r.name} (Copy)`,
      isSystem: false
    });
    setShowRoleModal(true);
  };

  const toggleRoleActive = async (r: RoleDefinition) => {
    await setDoc(doc(db, 'roles', r.key), { ...r, isActive: !r.isActive, updatedAt: serverTimestamp() }, { merge: true });
    await logAudit(profile, 'TOGGLE_ROLE_STATUS', 'RBAC', r.key, `${r.name} active=${!r.isActive}`);
    notify(`${r.name} ${!r.isActive ? 'activated' : 'deactivated'}.`);
  };

  const toggleMatrixCell = async (mod: ModuleKey, action: PermissionAction) => {
    const currentMatrix = activeRole.matrix || {};
    const modActions = currentMatrix[mod] || [];
    const nextActions = modActions.includes(action)
      ? modActions.filter(a => a !== action)
      : [...modActions, action];
    const nextMatrix = { ...currentMatrix, [mod]: nextActions };

    await setDoc(doc(db, 'roles', activeRole.key), {
      ...activeRole,
      matrix: nextMatrix,
      updatedAt: serverTimestamp()
    }, { merge: true });
    await logAudit(profile, 'UPDATE_MATRIX', 'RBAC', activeRole.key, `${activeRole.name}: ${mod}.${action}`);
  };

  const toggleLegacyPerm = async (permKey: string) => {
    const cur = customPermissions[activeRole.key] || DEFAULT_ROLE_PERMISSIONS[activeRole.key] || [];
    const next = cur.includes(permKey) ? cur.filter(p => p !== permKey) : [...cur, permKey];
    await setDoc(doc(db, 'rolePermissions', activeRole.key), {
      role: activeRole.key,
      label: activeRole.name,
      permissions: next,
      updatedAt: serverTimestamp()
    }, { merge: true });
    await logAudit(profile, 'UPDATE_ROLE_PERMISSION', 'RBAC', activeRole.key, `Toggled ${permKey}`);
  };

  const handleSaveUserAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    await updateDoc(doc(db, 'users', selectedUser.uid), {
      role: userAccessForm.role,
      roles: userAccessForm.roles,
      scope: userAccessForm.scope,
      campusId: userAccessForm.campusId,
      departmentId: userAccessForm.departmentId,
      officeId: userAccessForm.officeId,
      teamId: userAccessForm.teamId,
      approvalLimit: Number(userAccessForm.approvalLimit) || 0,
      permissionExpiresAt: userAccessForm.permissionExpiresAt || '',
      delegatedToUid: userAccessForm.delegatedToUid || ''
    });
    await logAudit(profile, 'ASSIGN_USER_ACCESS', 'RBAC', selectedUser.uid, `Updated roles/scope for ${selectedUser.name}`);
    setSelectedUser(null);
    notify(`Access & scope updated for ${selectedUser.name}.`);
  };

  const saveWorkflow = async (processType: ApprovalProcessType, name: string, stages: ApprovalStage[]) => {
    await setDoc(doc(db, 'approvalWorkflows', processType), {
      id: processType,
      processType,
      name,
      isActive: true,
      requireSequential: true,
      stages,
      updatedAt: serverTimestamp()
    }, { merge: true });
    await logAudit(profile, 'UPDATE_WORKFLOW', 'RBAC', processType, `Updated approval workflow for ${name}`);
    notify(`Saved workflow for ${name}.`);
  };

  const displayActions: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'publish', 'export', 'import', 'assign', 'verify', 'override', 'manage'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles, Scope-Based Permission Matrix & Approval Workflows"
        subtitle="Manage 47 institutional roles + custom roles, module × action matrix, organizational scope, field restrictions, and multi-stage approvals."
        actions={
          <button
            type="button"
            onClick={() => {
              setRoleForm({ key: '', name: '', description: '', category: 'Administration', defaultScope: 'office', approvalLimit: 0, isActive: true, restrictedFields: ['salary'] });
              setShowRoleModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200"
          >
            <Plus className="w-3.5 h-3.5" /> Create Custom Role
          </button>
        }
      />

      {feedback && (
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-[#111111] dark:text-zinc-200">
          {feedback}
        </div>
      )}

      <SegmentedTabs
        active={tab}
        onChange={v => setTab(v as any)}
        tabs={[
          { id: 'roles', label: 'Roles Directory', count: mergedRoles.length },
          { id: 'matrix', label: 'Module × Action Matrix' },
          { id: 'users', label: 'User Multi-Role & Scope', count: users.length },
          { id: 'workflows', label: 'Approval Workflows', count: DEFAULT_APPROVAL_WORKFLOWS.length },
        ]}
      />

      {tab === 'roles' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-4">
          <input value={roleSearch} onChange={e => setRoleSearch(e.target.value)} placeholder="Search 47+ roles by title or category..." className="w-full sm:w-80 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-[#52525B]">
                <tr>
                  <th className="py-2.5 px-3 text-left">Role</th>
                  <th className="py-2.5 px-3 text-left">Category</th>
                  <th className="py-2.5 px-3 text-left">Default Scope</th>
                  <th className="py-2.5 px-3 text-right">Approval Limit</th>
                  <th className="py-2.5 px-3 text-left">Restricted Fields</th>
                  <th className="py-2.5 px-3 text-left">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {mergedRoles.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || r.category.toLowerCase().includes(roleSearch.toLowerCase())).map(r => (
                  <tr key={r.key} className="hover:bg-zinc-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold">{r.name}</p>
                      <p className="font-mono text-[11px] text-zinc-400">{r.key}</p>
                    </td>
                    <td className="py-2.5 px-3 text-[#52525B]">{r.category}</td>
                    <td className="py-2.5 px-3 capitalize">{r.defaultScope.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">₹{r.approvalLimit.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-[#52525B]">{r.restrictedFields.join(', ') || 'None'}</td>
                    <td className="py-2.5 px-3"><StatusText status={r.isActive ? 'active' : 'inactive'} /></td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button onClick={() => { setSelectedRoleKey(r.key); setTab('matrix'); }} className="text-[#111111] dark:text-zinc-200 font-medium hover:underline">Matrix</button>
                      <button onClick={() => handleDuplicateRole(r)} className="text-[#52525B] hover:text-[#111111]" title="Duplicate Role"><Copy className="w-3.5 h-3.5 inline" /></button>
                      {!['super_admin', 'university_admin'].includes(r.key) && (
                        <button onClick={() => toggleRoleActive(r)} className="text-[#52525B] hover:text-[#27272A]">
                          {r.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'matrix' && activeRole && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#52525B]">Editing Permission Matrix for Role</p>
              <h2 className="text-base font-bold">{activeRole.name} <span className="font-mono text-xs text-zinc-400">({activeRole.defaultScope})</span></h2>
            </div>
            <select value={activeRole.key} onChange={e => setSelectedRoleKey(e.target.value)} className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {mergedRoles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </div>

          {/* Core Portal Permissions */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-sm font-semibold mb-3">Module Access Entitlements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ALL_PERMISSIONS.map(p => {
                const list = customPermissions[activeRole.key] || DEFAULT_ROLE_PERMISSIONS[activeRole.key] || [];
                const checked = activeRole.key === 'super_admin' || list.includes(p.key);
                return (
                  <label key={p.key} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs cursor-pointer">
                    <input type="checkbox" disabled={activeRole.key === 'super_admin'} checked={checked} onChange={() => toggleLegacyPerm(p.key)} />
                    <span className="truncate">{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Granular Module x Action Matrix */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold sticky left-0 bg-zinc-50 dark:bg-zinc-800">Module</th>
                  {displayActions.map(act => (
                    <th key={act} className="px-2 py-2.5 text-center font-semibold capitalize">{act}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {MODULES_LIST.map(mod => (
                  <tr key={mod.key}>
                    <td className="px-3 py-2 font-medium sticky left-0 bg-white dark:bg-zinc-900 whitespace-nowrap">{mod.label}</td>
                    {displayActions.map(act => {
                      const active = activeRole.key === 'super_admin' || (activeRole.matrix?.[mod.key] || []).includes(act);
                      return (
                        <td key={act} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            disabled={activeRole.key === 'super_admin'}
                            checked={active}
                            onChange={() => toggleMatrixCell(mod.key, act)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Primary & Extra Roles</th>
                <th className="px-4 py-3 text-left">Scope & Org Unit</th>
                <th className="px-4 py-3 text-right">Approval Limit</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {users.filter(u => u.role !== 'student').map(u => (
                <tr key={u.uid}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-[#52525B]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.role}</p>
                    {u.roles && u.roles.length > 0 && <p className="text-[#52525B]">+ {u.roles.join(', ')}</p>}
                  </td>
                  <td className="px-4 py-3 text-[#52525B]">
                    {u.scope || 'default'} · {offices.find(o => o.id === u.officeId)?.name || departments.find(d => d.id === u.departmentId)?.name || 'University'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">₹{(u.approvalLimit || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{u.permissionExpiresAt || 'Never'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setUserAccessForm({
                          role: u.role,
                          roles: u.roles || [],
                          scope: u.scope || 'assigned',
                          campusId: u.campusId || '',
                          departmentId: u.departmentId || '',
                          officeId: u.officeId || '',
                          teamId: u.teamId || '',
                          approvalLimit: u.approvalLimit || 0,
                          permissionExpiresAt: u.permissionExpiresAt || '',
                          delegatedToUid: u.delegatedToUid || ''
                        });
                      }}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 rounded font-semibold"
                    >
                      Edit Scope & Roles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'workflows' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_APPROVAL_WORKFLOWS.map(wf => {
            const live = approvalWorkflows.find(w => w.processType === wf.processType);
            const stages = live?.stages || wf.stages;
            return (
              <div key={wf.processType} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{wf.name}</h3>
                    <p className="text-[11px] font-mono text-zinc-400">{wf.processType}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveWorkflow(wf.processType, wf.name, stages)}
                    className="px-3 py-1 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg"
                  >
                    Sync Policy
                  </button>
                </div>
                <div className="space-y-1.5 text-xs">
                  {stages.map(st => (
                    <div key={st.stageOrder} className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg">
                      <span>Stage {st.stageOrder}: {st.stageName}</span>
                      <span className="font-mono text-[#111111] dark:text-zinc-200">{st.approverRole}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)} title="Create or Customize Role">
        <form onSubmit={handleSaveRole} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Role Name" value={roleForm.name || ''} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <input required placeholder="Role Key (e.g. dean_research)" value={roleForm.key || ''} onChange={e => setRoleForm({ ...roleForm, key: e.target.value })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            <select value={roleForm.defaultScope || 'office'} onChange={e => setRoleForm({ ...roleForm, defaultScope: e.target.value as PermissionScope })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {PERMISSION_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input type="number" placeholder="Approval Limit" value={roleForm.approvalLimit || 0} onChange={e => setRoleForm({ ...roleForm, approvalLimit: Number(e.target.value) })} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <textarea rows={2} placeholder="Role responsibilities" value={roleForm.description || ''} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Save Role</button>
        </form>
      </Modal>

      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title={`Access Scope & Multi-Role Assignment · ${selectedUser?.name || ''}`}>
        <form onSubmit={handleSaveUserAccess} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Primary Role</label>
              <select value={userAccessForm.role} onChange={e => setUserAccessForm({ ...userAccessForm, role: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {mergedRoles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Access Scope</label>
              <select value={userAccessForm.scope} onChange={e => setUserAccessForm({ ...userAccessForm, scope: e.target.value as PermissionScope })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {PERMISSION_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Office</label>
              <select value={userAccessForm.officeId} onChange={e => setUserAccessForm({ ...userAccessForm, officeId: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">None</option>
                {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Department</label>
              <select value={userAccessForm.departmentId} onChange={e => setUserAccessForm({ ...userAccessForm, departmentId: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Team</label>
              <select value={userAccessForm.teamId} onChange={e => setUserAccessForm({ ...userAccessForm, teamId: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">None</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Campus</label>
              <select value={userAccessForm.campusId} onChange={e => setUserAccessForm({ ...userAccessForm, campusId: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">All Campuses</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Approval Limit</label>
              <input type="number" value={userAccessForm.approvalLimit} onChange={e => setUserAccessForm({ ...userAccessForm, approvalLimit: Number(e.target.value) })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Permission Expiration</label>
              <input type="date" value={userAccessForm.permissionExpiresAt} onChange={e => setUserAccessForm({ ...userAccessForm, permissionExpiresAt: e.target.value })} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Additional Assigned Roles</label>
            <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
              {mergedRoles.map(r => (
                <label key={r.key} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={userAccessForm.roles.includes(r.key)} onChange={() => setUserAccessForm(prev => ({ ...prev, roles: prev.roles.includes(r.key) ? prev.roles.filter(x => x !== r.key) : [...prev.roles, r.key] }))} />
                  <span className="truncate">{r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-[#111111] dark:bg-white dark:text-zinc-950 text-white font-semibold rounded-lg">Apply Access Policy</button>
        </form>
      </Modal>
    </div>
  );
};
