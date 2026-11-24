import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { BookOpen, Calendar, Edit2, GraduationCap, MapPin, Plus, Search, Trash2, Users } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { Class } from '../types';

export const Classes: React.FC = () => {
  const { profile, isStudent, isTeacher, can } = useAuth();
  const { classes, subjects, teachers, students, departments, programs, batches, semesters, rooms } = useUniversity();
  const canManage = can('academics.manage');

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Create / Edit Class Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [name, setName] = useState('');
  const [section, setSection] = useState('A');
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(60);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Roster drawer/modal
  const [rosterClass, setRosterClass] = useState<Class | null>(null);

  const visibleClasses = useMemo(() => {
    let list = classes;
    if (!canManage && !can('reports.view')) {
      if (isTeacher && profile?.uid) {
        list = list.filter(c => c.teacherId === profile.uid || c.mentorId === profile.uid);
      } else if (isStudent && profile?.uid) {
        list = list.filter(c => c.students?.includes(profile.uid) || c.id === profile.classId);
      }
    }
    if (filterDept) list = list.filter(c => c.departmentId === filterDept);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.section || '').toLowerCase().includes(q));
    }
    return list;
  }, [classes, canManage, can, isTeacher, isStudent, profile?.uid, profile?.classId, filterDept, search]);

  const openModal = (cls?: Class) => {
    if (cls) {
      setEditing(cls);
      setName(cls.name);
      setSection(cls.section || 'A');
      setDepartmentId(cls.departmentId || '');
      setProgramId(cls.programId || '');
      setBatchId(cls.batchId || '');
      setSemesterId(cls.semesterId || '');
      setRoomId(cls.roomId || '');
      setMentorId(cls.mentorId || '');
      setTeacherId(cls.teacherId || '');
      setMaxCapacity(cls.maxCapacity || 60);
      setSubjectIds(cls.subjectIds || []);
      setSelectedStudents(cls.students || []);
    } else {
      setEditing(null);
      setName('');
      setSection('A');
      setDepartmentId(departments[0]?.id || '');
      setProgramId(programs[0]?.id || '');
      setBatchId(batches[0]?.id || '');
      setSemesterId(semesters[0]?.id || '');
      setRoomId(rooms[0]?.id || '');
      setMentorId(teachers[0]?.uid || '');
      setTeacherId(teachers[0]?.uid || '');
      setMaxCapacity(60);
      setSubjectIds([]);
      setSelectedStudents([]);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        section,
        departmentId,
        programId,
        batchId,
        semesterId,
        roomId,
        mentorId,
        teacherId: teacherId || mentorId,
        maxCapacity: Number(maxCapacity) || 60,
        subjectIds,
        students: selectedStudents,
        updatedAt: serverTimestamp()
      };
      if (editing) {
        await updateDoc(doc(db, 'classes', editing.id), payload);
        await logAudit(profile, 'UPDATE_CLASS', 'Classes', editing.id, `Updated class ${name}`);
      } else {
        const ref = await addDoc(collection(db, 'classes'), { ...payload, createdAt: serverTimestamp() });
        await logAudit(profile, 'CREATE_CLASS', 'Classes', ref.id, `Created class ${name}`);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cls: Class) => {
    if (!window.confirm(`Delete class "${cls.name}"?`)) return;
    await deleteDoc(doc(db, 'classes', cls.id));
    await logAudit(profile, 'DELETE_CLASS', 'Classes', cls.id, `Deleted class ${cls.name}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes, Sections & Mentors"
        subtitle="Manage cohorts, single assigned class mentors, multi-subject curricula, rooms, and student rosters."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
            >
              <Plus className="w-3.5 h-3.5" /> Create Class
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search classes or sections..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          />
        </div>
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {visibleClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleClasses.map(cls => {
            const dept = departments.find(d => d.id === cls.departmentId);
            const prog = programs.find(p => p.id === cls.programId);
            const mentor = teachers.find(t => t.uid === cls.mentorId) || teachers.find(t => t.uid === cls.teacherId);
            const room = rooms.find(r => r.id === cls.roomId);
            const clsSubjects = cls.subjectIds?.length
              ? subjects.filter(s => cls.subjectIds?.includes(s.id))
              : subjects.filter(s => s.id === (cls as any).subjectId);

            return (
              <div
                key={cls.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#111111] dark:text-zinc-200">
                        {dept?.code || 'ACADEMIC'} {prog ? `· ${prog.code}` : ''}
                      </p>
                      <h3 className="text-base font-semibold text-[#111111] dark:text-zinc-100 mt-0.5">{cls.name}</h3>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openModal(cls)} className="p-1.5 rounded-lg text-zinc-400 hover:text-[#111111] hover:bg-zinc-100 dark:hover:bg-slate-800">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(cls)} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-slate-800">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-[#52525B] dark:text-zinc-400">
                    <p className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                      Mentor: <span className="font-medium text-[#111111] dark:text-slate-200">{mentor?.name || 'Unassigned'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      Room: <span className="font-mono">{room ? `${room.roomNumber} (${room.capacity} seats)` : 'Flexible'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                      Subjects: <span className="truncate">{clsSubjects.length ? clsSubjects.map(s => s.code || s.name).join(', ') : (cls.subject || 'None assigned')}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setRosterClass(cls)}
                    className="inline-flex items-center gap-1.5 font-medium text-[#3F3F46] dark:text-slate-300 hover:text-[#111111]"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-mono tabular-nums">{cls.students?.length || 0}</span>
                    {cls.maxCapacity ? `/ ${cls.maxCapacity}` : ''} Students
                  </button>
                  <div className="flex items-center gap-3">
                    <Link to="/timetable" className="text-[#111111] dark:text-zinc-200 hover:underline flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Timetable
                    </Link>
                    <Link to="/lms" className="text-[#111111] dark:text-zinc-200 hover:underline">
                      LMS
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No Classes Found" description="Create classes and assign a class mentor, subjects, and enrolled students." />
      )}

      {/* Create / Edit Class Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Class & Section' : 'Create Class & Section'}
        subtitle="Each class has one dedicated class mentor, multiple subjects, and enrolled students."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Class Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. B.Tech CS — Sem 1 · Sec A" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Section & Max Capacity</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={section} onChange={e => setSection(e.target.value)} placeholder="A" className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
                <input type="number" min={1} value={maxCapacity} onChange={e => setMaxCapacity(Number(e.target.value))} className="px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department</label>
              <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Program</label>
              <select value={programId} onChange={e => setProgramId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Class Mentor (Primary Faculty)</label>
              <select required value={mentorId} onChange={e => setMentorId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Mentor</option>
                {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Homeroom / Classroom</label>
              <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="">Select Room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber} · {r.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Assigned Subjects ({subjectIds.length})</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subjectIds.includes(s.id)}
                    onChange={() => setSubjectIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                  />
                  <span className="truncate">{s.code} · {s.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Enrolled Students ({selectedStudents.length})</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
              {students.map(s => (
                <label key={s.uid} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.uid)}
                    onChange={() => setSelectedStudents(prev => prev.includes(s.uid) ? prev.filter(x => x !== s.uid) : [...prev, s.uid])}
                  />
                  <span className="truncate">{s.name} ({s.rollNo || s.email})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200 disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Save Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Roster Modal */}
      <Modal
        open={!!rosterClass}
        onClose={() => setRosterClass(null)}
        title={rosterClass ? `${rosterClass.name} — Student Roster` : ''}
        subtitle={`${rosterClass?.students?.length || 0} enrolled students`}
      >
        {rosterClass && (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {students.filter(s => rosterClass.students?.includes(s.uid)).map(stu => (
              <div key={stu.uid} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-[#111111] dark:text-zinc-100">{stu.name}</p>
                  <p className="text-xs font-mono text-[#52525B]">{stu.rollNo || stu.email}</p>
                </div>
                <Link
                  to={`/students/${stu.uid}`}
                  onClick={() => setRosterClass(null)}
                  className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline"
                >
                  Open 360° Profile
                </Link>
              </div>
            ))}
            {(!rosterClass.students || rosterClass.students.length === 0) && (
              <p className="py-8 text-center text-xs text-zinc-400">No students assigned to this class yet.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
