import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, arrayRemove, arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { BedDouble, Building2, Plus, Users, Wrench } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { Hostel as HostelType, HostelAllocation, HostelRequest, HostelRoom } from '../types';

export const Hostel: React.FC = () => {
  const { profile, isStudent, can } = useAuth();
  const { university, students, employees } = useUniversity();
  const canManage = can('hostel.manage');

  const [hostels, setHostels] = useState<HostelType[]>([]);
  const [rooms, setRooms] = useState<HostelRoom[]>([]);
  const [allocations, setAllocations] = useState<HostelAllocation[]>([]);
  const [requests, setRequests] = useState<HostelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests'>('overview');
  const [banner, setBanner] = useState<string | null>(null);

  const [hostelModal, setHostelModal] = useState(false);
  const [hName, setHName] = useState('');
  const [hType, setHType] = useState<HostelType['type']>('boys');
  const [hWardenId, setHWardenId] = useState('');
  const [hAddress, setHAddress] = useState('');

  const [roomModal, setRoomModal] = useState(false);
  const [rHostelId, setRHostelId] = useState('');
  const [rNumber, setRNumber] = useState('');
  const [rFloor, setRFloor] = useState('1st Floor');
  const [rCapacity, setRCapacity] = useState(2);
  const [rFee, setRFee] = useState(6000);

  const [allocRoom, setAllocRoom] = useState<HostelRoom | null>(null);
  const [allocStudentId, setAllocStudentId] = useState('');
  const [createFeeInvoice, setCreateFeeInvoice] = useState(true);

  // Student Request Modal
  const [reqModal, setReqModal] = useState(false);
  const [reqType, setReqType] = useState<HostelRequest['requestType']>('maintenance');
  const [reqSubject, setReqSubject] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState<HostelRequest['priority']>('medium');

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'hostels'),
      s => {
        setHostels(s.docs.map(d => ({ id: d.id, ...d.data() } as HostelType)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = onSnapshot(collection(db, 'hostelRooms'), s => setRooms(s.docs.map(d => ({ id: d.id, ...d.data() } as HostelRoom))), () => {});
    const allocQ = canManage
      ? collection(db, 'hostelAllocations')
      : profile?.uid
      ? query(collection(db, 'hostelAllocations'), where('studentId', '==', profile.uid))
      : null;
    const reqQ = canManage
      ? collection(db, 'hostelRequests')
      : profile?.uid
      ? query(collection(db, 'hostelRequests'), where('studentId', '==', profile.uid))
      : null;
    const u3 = allocQ
      ? onSnapshot(allocQ, s => setAllocations(s.docs.map(d => ({ id: d.id, ...d.data() } as HostelAllocation))), () => {})
      : () => {};
    const u4 = reqQ
      ? onSnapshot(reqQ, s => setRequests(s.docs.map(d => ({ id: d.id, ...d.data() } as HostelRequest))), () => {})
      : () => {};
    return () => { u1(); u2(); u3(); u4(); };
  }, [canManage, profile?.uid]);

  const visibleAllocations = useMemo(() => {
    return canManage ? allocations : allocations.filter(a => a.studentId === profile?.uid);
  }, [allocations, canManage, profile?.uid]);

  const visibleRequests = useMemo(() => {
    return canManage ? requests : requests.filter(r => r.studentId === profile?.uid);
  }, [requests, canManage, profile?.uid]);

  const myActiveAlloc = useMemo(() => {
    if (!isStudent || !profile?.uid) return null;
    return allocations.find(a => a.studentId === profile.uid && a.status === 'active') || null;
  }, [allocations, isStudent, profile?.uid]);

  const myRoom = useMemo(() => {
    if (!myActiveAlloc) return null;
    return rooms.find(r => r.id === myActiveAlloc.roomId) || null;
  }, [myActiveAlloc, rooms]);

  const myRoommates = useMemo(() => {
    if (!myRoom || !profile?.uid) return [];
    const uids = (myRoom.occupants || []).filter(id => id !== profile.uid);
    return students.filter(s => uids.includes(s.uid));
  }, [myRoom, students, profile?.uid]);

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    const warden = employees.find(x => x.uid === hWardenId);
    const ref = await addDoc(collection(db, 'hostels'), {
      name: hName,
      type: hType,
      wardenId: hWardenId || '',
      wardenName: warden?.name || 'Warden',
      totalRooms: 0,
      address: hAddress
    });
    await logAudit(profile, 'CREATE_HOSTEL', 'Hostel', ref.id, hName);
    setHostelModal(false);
    setHName('');
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = hostels.find(x => x.id === rHostelId);
    if (!h) return;
    await addDoc(collection(db, 'hostelRooms'), {
      hostelId: h.id,
      hostelName: h.name,
      roomNumber: rNumber,
      floor: rFloor,
      capacity: Number(rCapacity),
      occupiedCount: 0,
      monthlyFee: Number(rFee),
      occupants: []
    });
    await updateDoc(doc(db, 'hostels', h.id), { totalRooms: (h.totalRooms || 0) + 1 });
    setRoomModal(false);
    setRNumber('');
  };

  const handleAllocateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocRoom || !allocStudentId) return;
    const stu = students.find(s => s.uid === allocStudentId);
    if (!stu) return;

    const ref = await addDoc(collection(db, 'hostelAllocations'), {
      hostelId: allocRoom.hostelId,
      hostelName: allocRoom.hostelName,
      roomId: allocRoom.id,
      roomNumber: allocRoom.roomNumber,
      studentId: stu.uid,
      studentName: stu.name,
      allocatedDate: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    await updateDoc(doc(db, 'hostelRooms', allocRoom.id), {
      occupants: arrayUnion(stu.uid),
      occupiedCount: (allocRoom.occupiedCount || 0) + 1
    });
    await updateDoc(doc(db, 'users', stu.uid), {
      hostelId: allocRoom.hostelId,
      hostelRoomId: allocRoom.id
    });

    if (createFeeInvoice && allocRoom.monthlyFee > 0) {
      await addDoc(collection(db, 'invoices'), {
        invoiceNo: `HST-${Date.now().toString().slice(-6)}`,
        studentId: stu.uid,
        studentName: stu.name,
        rollNo: stu.rollNo || '',
        title: `Hostel Accommodation (${allocRoom.hostelName} · ${allocRoom.roomNumber})`,
        category: 'hostel',
        baseAmount: allocRoom.monthlyFee,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: allocRoom.monthlyFee,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'unpaid',
        createdAt: serverTimestamp()
      });
    }
    await logAudit(profile, 'ALLOCATE_HOSTEL', 'Hostel', ref.id, `${stu.name} -> ${allocRoom.hostelName} ${allocRoom.roomNumber}`);
    setAllocRoom(null);
  };

  const handleVacate = async (al: HostelAllocation) => {
    await updateDoc(doc(db, 'hostelAllocations', al.id), { status: 'vacated' });
    const rm = rooms.find(r => r.id === al.roomId);
    if (rm) {
      await updateDoc(doc(db, 'hostelRooms', rm.id), {
        occupants: arrayRemove(al.studentId),
        occupiedCount: Math.max(0, (rm.occupiedCount || 1) - 1)
      });
    }
    await logAudit(profile, 'VACATE_HOSTEL', 'Hostel', al.id, `${al.studentName} vacated ${al.roomNumber}`);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const ref = await addDoc(collection(db, 'hostelRequests'), {
      studentId: profile.uid,
      studentName: profile.name,
      rollNo: profile.rollNo || '',
      requestType: reqType,
      roomNumber: myActiveAlloc?.roomNumber || '',
      subject: reqSubject,
      description: reqDesc,
      priority: reqPriority,
      status: 'open',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_HOSTEL_REQUEST', 'Hostel', ref.id, `${reqType}: ${reqSubject}`);
    setReqModal(false);
    setReqSubject('');
    setReqDesc('');
    setBanner('Hostel request submitted to the Warden Office.');
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;
  const currency = university.currency || 'INR';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel & Residential Management"
        subtitle="Residence blocks, room allocations, roommate directory, applications, and maintenance requests."
        actions={
          canManage ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => { setRHostelId(hostels[0]?.id || ''); setRoomModal(true); }} disabled={hostels.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> Add Room
              </button>
              <button type="button" onClick={() => setHostelModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
                <Plus className="w-3.5 h-3.5" /> Add Hostel Block
              </button>
            </div>
          ) : isStudent ? (
            <button type="button" onClick={() => setReqModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200">
              <Wrench className="w-3.5 h-3.5" /> {myActiveAlloc ? 'Maintenance / Complaint' : 'Apply for Hostel'}
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
        <StatCard label="Residence Blocks" value={hostels.length} icon={Building2} tone="indigo" />
        <StatCard label="Total Rooms" value={rooms.length} icon={BedDouble} tone="emerald" />
        <StatCard label={isStudent ? 'My Active Allocation' : 'Active Residents'} value={visibleAllocations.filter(a => a.status === 'active').length} icon={Users} tone="amber" />
        <StatCard label="Service Requests" value={visibleRequests.filter(r => r.status !== 'resolved').length} icon={Wrench} />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={v => setActiveTab(v as any)}
        tabs={[
          { id: 'overview', label: isStudent ? 'My Room & Hostels' : 'Rooms & Allocations', count: visibleAllocations.length },
          { id: 'requests', label: isStudent ? 'My Hostel Requests' : 'Applications & Maintenance', count: visibleRequests.length }
        ]}
      />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isStudent && myActiveAlloc && myRoom && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold text-[#111111] dark:text-zinc-200">Assigned Residence</p>
                <h3 className="text-lg font-bold mt-1">{myActiveAlloc.hostelName} — Room {myActiveAlloc.roomNumber}</h3>
                <p className="text-xs text-[#52525B] mt-1">{myRoom.floor} · Capacity {myRoom.capacity} beds · Monthly Fee: <span className="font-mono font-semibold">{currency} {myRoom.monthlyFee.toLocaleString()}</span></p>
                <p className="text-xs text-zinc-400 mt-2">Allocated on {myActiveAlloc.allocatedDate}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#52525B] mb-2">Roommates ({myRoommates.length})</p>
                {myRoommates.length > 0 ? (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                    {myRoommates.map(rm => (
                      <div key={rm.uid} className="py-1.5 flex items-center justify-between">
                        <span className="font-medium">{rm.name}</span>
                        <span className="font-mono text-zinc-400">{rm.rollNo || rm.phone || 'Resident'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">Single occupancy or no roommates assigned yet.</p>
                )}
              </div>
            </div>
          )}

          {canManage && rooms.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(rm => (
                <div key={rm.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between text-xs text-[#52525B]">
                      <span>{rm.hostelName}</span>
                      <span className="font-mono">{rm.floor}</span>
                    </div>
                    <h3 className="text-base font-semibold mt-1">Room {rm.roomNumber}</h3>
                    <p className="text-xs font-mono text-[#111111] dark:text-zinc-200 mt-1">{currency} {rm.monthlyFee.toLocaleString()} / month</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums">{rm.occupiedCount} / {rm.capacity} occupied</span>
                    <button
                      type="button"
                      disabled={rm.occupiedCount >= rm.capacity}
                      onClick={() => { setAllocRoom(rm); setAllocStudentId(students[0]?.uid || ''); }}
                      className="font-semibold text-[#111111] dark:text-zinc-200 hover:underline disabled:opacity-40"
                    >
                      Allocate Student
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold">{isStudent ? 'My Hostel Allocation History' : 'Resident Allocations'}</h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleAllocations.map(al => (
                <div key={al.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{al.studentName}</p>
                    <p className="text-xs text-[#52525B]">{al.hostelName} · Room {al.roomNumber} · Since {al.allocatedDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusText status={al.status} />
                    {canManage && al.status === 'active' && (
                      <button onClick={() => handleVacate(al)} className="text-xs text-rose-600 hover:underline">Vacate</button>
                    )}
                  </div>
                </div>
              ))}
              {visibleAllocations.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-400">No hostel allocations found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] divide-y divide-zinc-100 dark:divide-zinc-800">
          {visibleRequests.map(req => (
            <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#52525B]">
                  <span className="capitalize font-semibold text-[#111111] dark:text-zinc-200">{req.requestType}</span>
                  {req.roomNumber && <span className="font-mono">· Room {req.roomNumber}</span>}
                  <span>· {req.studentName}</span>
                  <StatusText status={req.status} />
                </div>
                <p className="text-sm font-semibold mt-0.5">{req.subject}</p>
                <p className="text-xs text-[#52525B] mt-0.5">{req.description}</p>
                {req.resolutionNote && <p className="text-xs text-[#111111] dark:text-zinc-200 mt-1">Warden Note: {req.resolutionNote}</p>}
              </div>
              {canManage && req.status !== 'resolved' && (
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => updateDoc(doc(db, 'hostelRequests', req.id), { status: 'in_progress' })}
                      className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      In Progress
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateDoc(doc(db, 'hostelRequests', req.id), { status: 'resolved', resolutionNote: 'Completed by Hostel Warden Office.' })}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white"
                  >
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))}
          {visibleRequests.length === 0 && (
            <div className="p-8 text-center text-xs text-zinc-400">No hostel applications or maintenance requests found.</div>
          )}
        </div>
      )}

      <Modal open={hostelModal} onClose={() => setHostelModal(false)} title="Create Hostel Block">
        <form onSubmit={handleCreateHostel} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Hostel Name</label><input type="text" required value={hName} onChange={e => setHName(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Type</label><select value={hType} onChange={e => setHType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"><option value="boys">Boys Residence</option><option value="girls">Girls Residence</option><option value="co-ed">Co-Ed / PG</option></select></div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Warden</label>
            <select value={hWardenId} onChange={e => setHWardenId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="">Select Warden</option>
              {employees.map(e => <option key={e.uid} value={e.uid}>{e.name}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-medium mb-1">Campus Block Address</label><input type="text" value={hAddress} onChange={e => setHAddress(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setHostelModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Hostel</button>
          </div>
        </form>
      </Modal>

      <Modal open={roomModal} onClose={() => setRoomModal(false)} title="Add Hostel Room">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Hostel Block</label>
              <select required value={rHostelId} onChange={e => setRHostelId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium mb-1">Room Number</label><input type="text" required value={rNumber} onChange={e => setRNumber(e.target.value)} placeholder="H-204" className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Capacity</label><input type="number" min={1} value={rCapacity} onChange={e => setRCapacity(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Monthly Fee</label><input type="number" min={0} value={rFee} onChange={e => setRFee(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRoomModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Add Room</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!allocRoom} onClose={() => setAllocRoom(null)} title={`Allocate Room ${allocRoom?.roomNumber || ''}`}>
        <form onSubmit={handleAllocateStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Student</label>
            <select required value={allocStudentId} onChange={e => setAllocStudentId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {students.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.rollNo || s.email})</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={createFeeInvoice} onChange={e => setCreateFeeInvoice(e.target.checked)} />
            Auto-generate monthly hostel fee invoice ({currency} {allocRoom?.monthlyFee})
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAllocRoom(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Confirm Allocation</button>
          </div>
        </form>
      </Modal>

      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Submit Hostel Request">
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Request Type</label>
              <select value={reqType} onChange={e => setReqType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="application">Hostel Room Application</option>
                <option value="maintenance">Maintenance / Repair</option>
                <option value="complaint">Room / Facility Complaint</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select value={reqPriority} onChange={e => setReqPriority(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High / Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Subject</label>
            <input type="text" required value={reqSubject} onChange={e => setReqSubject(e.target.value)} placeholder="e.g. AC repair or Single Room Request" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Details</label>
            <textarea required rows={3} value={reqDesc} onChange={e => setReqDesc(e.target.value)} placeholder="Provide room preference or issue description..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReqModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

