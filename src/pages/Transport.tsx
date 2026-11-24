import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Bus, MapPin, Plus, Users } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { Modal, PageHeader, SegmentedTabs, StatCard, StatusText } from '../components/ui/DataUI';
import { logAudit } from '../services/erpService';
import { TransportAllocation, TransportRequest, TransportRoute } from '../types';

export const Transport: React.FC = () => {
  const { profile, isStudent, can } = useAuth();
  const { university, students } = useUniversity();
  const canManage = can('transport.manage');

  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [allocations, setAllocations] = useState<TransportAllocation[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'routes' | 'requests'>('routes');
  const [banner, setBanner] = useState<string | null>(null);

  const [routeModal, setRouteModal] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeCode, setRouteCode] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [capacity, setCapacity] = useState(40);
  const [stopsStr, setStopsStr] = useState('');
  const [monthlyFee, setMonthlyFee] = useState(2500);

  const [allocRoute, setAllocRoute] = useState<TransportRoute | null>(null);
  const [allocStudentId, setAllocStudentId] = useState('');
  const [allocStop, setAllocStop] = useState('');

  // Student Transport Request Modal
  const [reqModal, setReqModal] = useState(false);
  const [reqType, setReqType] = useState<TransportRequest['requestType']>('new_pass');
  const [reqRouteId, setReqRouteId] = useState('');
  const [reqStop, setReqStop] = useState('');
  const [reqReason, setReqReason] = useState('');

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'transportRoutes'),
      s => {
        setRoutes(s.docs.map(d => ({ id: d.id, ...d.data() } as TransportRoute)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const allocQ = canManage
      ? collection(db, 'transportAllocations')
      : profile?.uid
      ? query(collection(db, 'transportAllocations'), where('studentId', '==', profile.uid))
      : null;
    const reqQ = canManage
      ? collection(db, 'transportRequests')
      : profile?.uid
      ? query(collection(db, 'transportRequests'), where('studentId', '==', profile.uid))
      : null;
    const u2 = allocQ
      ? onSnapshot(allocQ, s => setAllocations(s.docs.map(d => ({ id: d.id, ...d.data() } as TransportAllocation))), () => {})
      : () => {};
    const u3 = reqQ
      ? onSnapshot(reqQ, s => setRequests(s.docs.map(d => ({ id: d.id, ...d.data() } as TransportRequest))), () => {})
      : () => {};
    return () => { u1(); u2(); u3(); };
  }, [canManage, profile?.uid]);

  const visibleAllocations = useMemo(() => {
    return canManage ? allocations : allocations.filter(a => a.studentId === profile?.uid);
  }, [allocations, canManage, profile?.uid]);

  const visibleRequests = useMemo(() => {
    return canManage ? requests : requests.filter(r => r.studentId === profile?.uid);
  }, [requests, canManage, profile?.uid]);

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const stops = stopsStr.split(',').map(s => s.trim()).filter(Boolean);
    const ref = await addDoc(collection(db, 'transportRoutes'), {
      routeName,
      routeCode,
      vehicleNumber,
      driverName,
      driverPhone,
      capacity: Number(capacity),
      stops,
      monthlyFee: Number(monthlyFee)
    });
    await logAudit(profile, 'CREATE_TRANSPORT_ROUTE', 'Transport', ref.id, `${routeCode}: ${routeName}`);
    setRouteModal(false);
    setRouteName('');
    setRouteCode('');
  };

  const handleAssignPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocRoute || !allocStudentId) return;
    const stu = students.find(s => s.uid === allocStudentId);
    if (!stu) return;
    const ref = await addDoc(collection(db, 'transportAllocations'), {
      routeId: allocRoute.id,
      routeName: allocRoute.routeName,
      stopName: allocStop || allocRoute.stops[0] || 'Main Stop',
      studentId: stu.uid,
      studentName: stu.name,
      status: 'active',
      assignedAt: new Date().toISOString().split('T')[0]
    });
    await updateDoc(doc(db, 'users', stu.uid), { transportRouteId: allocRoute.id });
    await logAudit(profile, 'ASSIGN_TRANSPORT_PASS', 'Transport', ref.id, `${stu.name} -> ${allocRoute.routeName}`);
    setAllocRoute(null);
  };

  const handleSubmitTransportRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const route = routes.find(r => r.id === reqRouteId);
    const ref = await addDoc(collection(db, 'transportRequests'), {
      studentId: profile.uid,
      studentName: profile.name,
      rollNo: profile.rollNo || '',
      routeId: reqRouteId,
      routeName: route?.routeName || 'Selected Route',
      stopName: reqStop || route?.stops?.[0] || 'Main Stop',
      requestType: reqType,
      reason: reqReason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'REQUEST_TRANSPORT_PASS', 'Transport', ref.id, `${reqType}: ${route?.routeName}`);
    setReqModal(false);
    setReqReason('');
    setBanner('Transport pass request submitted for approval.');
  };

  const handleDecisionRequest = async (req: TransportRequest, decision: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'transportRequests', req.id), { status: decision });
    if (decision === 'approved') {
      if (req.requestType === 'cancel') {
        const activeAlloc = allocations.find(a => a.studentId === req.studentId && a.status === 'active');
        if (activeAlloc) {
          await updateDoc(doc(db, 'transportAllocations', activeAlloc.id), { status: 'cancelled' });
        }
      } else {
        await addDoc(collection(db, 'transportAllocations'), {
          routeId: req.routeId,
          routeName: req.routeName,
          stopName: req.stopName,
          studentId: req.studentId,
          studentName: req.studentName,
          status: 'active',
          assignedAt: new Date().toISOString().split('T')[0]
        });
        await updateDoc(doc(db, 'users', req.studentId), { transportRouteId: req.routeId });
      }
    }
    await logAudit(profile, `TRANSPORT_REQ_${decision.toUpperCase()}`, 'Transport', req.id, `${req.studentName} · ${req.routeName}`);
    setBanner(`Transport request ${decision}.`);
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;
  const currency = university.currency || 'INR';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Transport & Fleet"
        subtitle="Bus routes, vehicles, drivers, boarding stops, commuter passes, and route change requests."
        actions={
          canManage ? (
            <button type="button" onClick={() => setRouteModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
              <Plus className="w-3.5 h-3.5" /> Add Bus Route
            </button>
          ) : isStudent ? (
            <button
              type="button"
              onClick={() => { setReqRouteId(routes[0]?.id || ''); setReqStop(routes[0]?.stops?.[0] || ''); setReqModal(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white hover:bg-[#27272A] dark:hover:bg-zinc-200"
            >
              <Bus className="w-3.5 h-3.5" /> Request Bus Pass / Change
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Bus Routes" value={routes.length} icon={Bus} tone="indigo" />
        <StatCard label="Fleet Seat Capacity" value={routes.reduce((a, r) => a + (r.capacity || 0), 0)} icon={MapPin} tone="emerald" />
        <StatCard label={isStudent ? 'My Bus Passes' : 'Active Student Passes'} value={visibleAllocations.filter(a => a.status === 'active').length} icon={Users} tone="amber" />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={v => setActiveTab(v as any)}
        tabs={[
          { id: 'routes', label: 'Routes & Allocations', count: routes.length },
          { id: 'requests', label: isStudent ? 'My Pass Requests' : 'Pass & Route Requests', count: visibleRequests.length }
        ]}
      />

      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map(r => (
              <div key={r.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#52525B]">
                    <span className="font-mono font-semibold text-[#111111] dark:text-zinc-200">{r.routeCode}</span>
                    <span className="font-mono">{r.vehicleNumber}</span>
                  </div>
                  <h3 className="text-base font-semibold mt-1">{r.routeName}</h3>
                  <p className="text-xs text-[#52525B] mt-1">Driver: {r.driverName} ({r.driverPhone})</p>
                  <p className="text-xs text-[#52525B] mt-1">Stops: {r.stops?.join(' → ') || 'Campus Direct'}</p>
                  <p className="text-xs font-mono font-semibold mt-2">{currency} {r.monthlyFee.toLocaleString()} / month</p>
                </div>
                {canManage ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => { setAllocRoute(r); setAllocStudentId(students[0]?.uid || ''); setAllocStop(r.stops?.[0] || ''); }}
                      className="font-semibold text-[#111111] dark:text-zinc-200 hover:underline"
                    >
                      Issue Pass
                    </button>
                    <button onClick={() => deleteDoc(doc(db, 'transportRoutes', r.id))} className="text-rose-500 hover:underline">Delete</button>
                  </div>
                ) : isStudent && (
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setReqRouteId(r.id); setReqStop(r.stops?.[0] || ''); setReqModal(true); }}
                      className="text-xs font-semibold text-[#111111] dark:text-zinc-200 hover:underline"
                    >
                      Request Pass on This Route
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold">{isStudent ? 'My Transport Allocation' : 'Commuter Pass Directory'}</h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleAllocations.map(a => (
                <div key={a.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold">{a.studentName}</p>
                    <p className="text-xs text-[#52525B]">{a.routeName} · Boarding Stop: {a.stopName} · Assigned {a.assignedAt}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusText status={a.status} />
                    {canManage && a.status === 'active' && (
                      <button onClick={() => updateDoc(doc(db, 'transportAllocations', a.id), { status: 'cancelled' })} className="text-xs text-rose-600 hover:underline">
                        Cancel Pass
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {visibleAllocations.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No transport allocations yet.</p>}
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
                  <span className="font-semibold capitalize text-[#111111] dark:text-zinc-200">{req.requestType.replace('_', ' ')}</span>
                  <span>· {req.studentName}</span>
                  <StatusText status={req.status} />
                </div>
                <p className="text-sm font-semibold mt-0.5">{req.routeName} — Stop: {req.stopName}</p>
                {req.reason && <p className="text-xs text-[#52525B] mt-0.5">{req.reason}</p>}
              </div>
              {canManage && req.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => handleDecisionRequest(req, 'approved')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Approve</button>
                  <button type="button" onClick={() => handleDecisionRequest(req, 'rejected')} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600">Reject</button>
                </div>
              )}
            </div>
          ))}
          {visibleRequests.length === 0 && <p className="p-8 text-center text-xs text-zinc-400">No transport requests submitted yet.</p>}
        </div>
      )}

      <Modal open={routeModal} onClose={() => setRouteModal(false)} title="Add Transport Route">
        <form onSubmit={handleAddRoute} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Route Name</label><input type="text" required value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="South Corridor Express" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Route Code</label><input type="text" required value={routeCode} onChange={e => setRouteCode(e.target.value)} placeholder="RT-04" className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Vehicle Number</label><input type="text" required value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} placeholder="KA-01-UV-4412" className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Driver Name</label><input type="text" required value={driverName} onChange={e => setDriverName(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Driver Phone</label><input type="text" required value={driverPhone} onChange={e => setDriverPhone(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Monthly Fee</label><input type="number" min={0} value={monthlyFee} onChange={e => setMonthlyFee(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <div><label className="block text-xs font-medium mb-1">Stops (comma separated)</label><input type="text" value={stopsStr} onChange={e => setStopsStr(e.target.value)} placeholder="Stop 1, Stop 2, University Campus" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRouteModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Save Route</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!allocRoute} onClose={() => setAllocRoute(null)} title={`Issue Bus Pass — ${allocRoute?.routeName || ''}`}>
        <form onSubmit={handleAssignPass} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Student</label>
            <select required value={allocStudentId} onChange={e => setAllocStudentId(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              {students.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.rollNo || s.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Boarding Stop</label>
            <input type="text" required value={allocStop} onChange={e => setAllocStop(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAllocRoute(null)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Assign Pass</button>
          </div>
        </form>
      </Modal>

      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Request Bus Pass / Route Change">
        <form onSubmit={handleSubmitTransportRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Request Type</label>
            <select value={reqType} onChange={e => setReqType(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <option value="new_pass">New Bus Pass</option>
              <option value="route_change">Change Bus Route / Stop</option>
              <option value="cancel">Cancel Existing Pass</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Route</label>
            <select
              required
              value={reqRouteId}
              onChange={e => {
                setReqRouteId(e.target.value);
                const r = routes.find(x => x.id === e.target.value);
                setReqStop(r?.stops?.[0] || '');
              }}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            >
              {routes.map(r => <option key={r.id} value={r.id}>{r.routeCode} · {r.routeName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Preferred Boarding Stop</label>
            <input type="text" required value={reqStop} onChange={e => setReqStop(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Additional Notes</label>
            <textarea rows={2} value={reqReason} onChange={e => setReqReason(e.target.value)} placeholder="Semester duration, stop timings..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
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

