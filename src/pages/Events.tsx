import React, { useEffect, useState } from 'react';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Calendar, CheckCircle2, Download, MapPin, Plus, Sparkles, Users } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../contexts/UniversityContext';
import { EmptyState, Modal, PageHeader, SegmentedTabs, StatCard } from '../components/ui/DataUI';
import { exportToCsv, logAudit } from '../services/erpService';
import { StudentClub, UniversityEvent } from '../types';

export const Events: React.FC = () => {
  const { profile, can } = useAuth();
  const { users } = useUniversity();
  const canManage = can('events.manage');

  const [events, setEvents] = useState<UniversityEvent[]>([]);
  const [clubs, setClubs] = useState<StudentClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'clubs'>('events');
  const [modalOpen, setModalOpen] = useState(false);
  const [clubModal, setClubModal] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<UniversityEvent['category']>('academic');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(200);

  const [clubName, setClubName] = useState('');
  const [clubCat, setClubCat] = useState<StudentClub['category']>('technical');
  const [clubCoord, setClubCoord] = useState('');
  const [clubSched, setClubSched] = useState('Fridays, 4:00 PM');
  const [clubDesc, setClubDesc] = useState('');

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'universityEvents'), s => {
      setEvents(s.docs.map(d => ({ id: d.id, ...d.data() } as UniversityEvent)).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
      setLoading(false);
    }, () => setLoading(false));
    const u2 = onSnapshot(collection(db, 'studentClubs'), s => {
      setClubs(s.docs.map(d => ({ id: d.id, ...d.data() } as StudentClub)));
    }, () => {});
    return () => { u1(); u2(); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'universityEvents'), {
      title,
      category,
      date,
      time,
      venue,
      organizer: organizer || profile?.name || 'Student Affairs',
      description,
      maxParticipants: Number(maxParticipants) || 200,
      registeredUserIds: []
    });
    await logAudit(profile, 'CREATE_EVENT', 'Events', ref.id, title);
    setModalOpen(false);
    setTitle('');
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = await addDoc(collection(db, 'studentClubs'), {
      name: clubName,
      category: clubCat,
      coordinatorName: clubCoord || profile?.name || 'Student Affairs',
      description: clubDesc,
      meetingSchedule: clubSched,
      memberIds: [],
      createdAt: serverTimestamp()
    });
    await logAudit(profile, 'CREATE_STUDENT_CLUB', 'Events', ref.id, clubName);
    setClubModal(false);
    setClubName('');
    setClubDesc('');
  };

  const toggleRsvp = async (evt: UniversityEvent) => {
    if (!profile?.uid) return;
    const isReg = evt.registeredUserIds?.includes(profile.uid);
    await updateDoc(doc(db, 'universityEvents', evt.id), {
      registeredUserIds: isReg ? arrayRemove(profile.uid) : arrayUnion(profile.uid)
    });
  };

  const toggleClubJoin = async (club: StudentClub) => {
    if (!profile?.uid) return;
    const isMem = club.memberIds?.includes(profile.uid);
    await updateDoc(doc(db, 'studentClubs', club.id), {
      memberIds: isMem ? arrayRemove(profile.uid) : arrayUnion(profile.uid)
    });
  };

  const exportParticipants = (evt: UniversityEvent) => {
    const rows = (evt.registeredUserIds || []).map(uid => {
      const u = users.find(x => x.uid === uid);
      return { Name: u?.name || uid, Email: u?.email || '', Role: u?.role || '', RollOrEmpId: u?.rollNo || u?.employeeId || '' };
    });
    exportToCsv(`${evt.title.replace(/\s+/g, '_')}_participants.csv`, rows);
  };

  if (loading) return <div className="h-64 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Events, Clubs & Societies"
        subtitle="Academic symposiums, workshops, cultural fests, and student clubs & sports chapters."
        actions={
          canManage ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => setClubModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <Plus className="w-3.5 h-3.5" /> New Club
              </button>
              <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">
                <Plus className="w-3.5 h-3.5" /> Create Event
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scheduled Events" value={events.length} icon={Calendar} tone="indigo" />
        <StatCard label="My Event RSVPs" value={events.filter(e => profile?.uid && e.registeredUserIds?.includes(profile.uid)).length} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Active Clubs & Societies" value={clubs.length} icon={Sparkles} tone="amber" />
        <StatCard label="My Club Memberships" value={clubs.filter(c => profile?.uid && c.memberIds?.includes(profile.uid)).length} icon={Users} />
      </div>

      <SegmentedTabs
        active={activeTab}
        onChange={v => setActiveTab(v as any)}
        tabs={[
          { id: 'events', label: 'Events & Seminars', count: events.length },
          { id: 'clubs', label: 'Clubs, Societies & Sports', count: clubs.length }
        ]}
      />

      {activeTab === 'events' && (
        events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(evt => {
              const isReg = profile?.uid ? evt.registeredUserIds?.includes(profile.uid) : false;
              return (
                <div key={evt.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#52525B]">
                      <span className="capitalize font-semibold text-[#111111] dark:text-zinc-200">{evt.category}</span>
                      <span className="font-mono">{evt.date} · {evt.time}</span>
                    </div>
                    <h3 className="text-base font-semibold">{evt.title}</h3>
                    <p className="text-xs text-[#52525B] dark:text-zinc-400">{evt.description}</p>
                    <p className="text-xs text-[#52525B] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {evt.venue} · By {evt.organizer}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-[#52525B]">{evt.registeredUserIds?.length || 0} / {evt.maxParticipants} registered</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRsvp(evt)}
                        className={`px-3 py-1.5 font-semibold rounded-lg ${isReg ? 'bg-zinc-100 dark:bg-zinc-800/60 text-[#111111] dark:text-zinc-200 border border-zinc-200 dark:border-emerald-800' : 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white'}`}
                      >
                        {isReg ? 'Registered' : 'RSVP'}
                      </button>
                      {canManage && (
                        <>
                          <button type="button" onClick={() => exportParticipants(evt)} title="Export CSV" className="p-1.5 text-[#52525B] hover:text-[#111111]">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => deleteDoc(doc(db, 'universityEvents', evt.id))} className="text-rose-500 hover:underline">Del</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Calendar} title="No Upcoming Events" description="Campus seminars, workshops, and academic events will appear here." />
        )
      )}

      {activeTab === 'clubs' && (
        clubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clubs.map(c => {
              const isMem = profile?.uid ? c.memberIds?.includes(profile.uid) : false;
              return (
                <div key={c.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)] p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#52525B]">
                      <span className="capitalize font-semibold text-[#111111] dark:text-zinc-200">{c.category}</span>
                      <span className="font-mono">{c.memberIds?.length || 0} members</span>
                    </div>
                    <h3 className="text-base font-semibold">{c.name}</h3>
                    <p className="text-xs text-[#52525B] dark:text-zinc-400">{c.description}</p>
                    <p className="text-xs text-[#52525B]">Schedule: {c.meetingSchedule} · Lead: {c.coordinatorName}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => toggleClubJoin(c)}
                      className={`px-3.5 py-1.5 font-semibold rounded-lg ${isMem ? 'bg-zinc-100 dark:bg-zinc-800/60 text-[#111111] dark:text-zinc-200 border border-zinc-200 dark:border-emerald-800' : 'bg-[#111111] dark:bg-white dark:text-zinc-950 text-white'}`}
                    >
                      {isMem ? 'Joined (Leave)' : 'Join Club'}
                    </button>
                    {canManage && (
                      <button type="button" onClick={() => deleteDoc(doc(db, 'studentClubs', c.id))} className="text-rose-500 hover:underline">Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="No Student Clubs Configured" description="University student chapters, societies, and sports clubs will appear here." />
        )
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Publish University Event">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Event Title</label><input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Category</label><select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"><option value="academic">Academic</option><option value="workshop">Workshop</option><option value="seminar">Seminar</option><option value="cultural">Cultural</option><option value="sports">Sports</option><option value="convocation">Convocation</option></select></div>
            <div><label className="block text-xs font-medium mb-1">Date</label><input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Time</label><input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Venue</label><input type="text" required value={venue} onChange={e => setVenue(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Max Capacity</label><input type="number" min={1} value={maxParticipants} onChange={e => setMaxParticipants(Number(e.target.value))} className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Event agenda & details..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Publish Event</button>
          </div>
        </form>
      </Modal>

      <Modal open={clubModal} onClose={() => setClubModal(false)} title="Create Student Club or Society">
        <form onSubmit={handleCreateClub} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Club Name</label><input type="text" required value={clubName} onChange={e => setClubName(e.target.value)} placeholder="Robotics & AI Chapter" className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Category</label><select value={clubCat} onChange={e => setClubCat(e.target.value as any)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"><option value="technical">Technical</option><option value="academic">Academic</option><option value="cultural">Cultural</option><option value="sports">Sports</option><option value="social">Social / NSS</option></select></div>
            <div><label className="block text-xs font-medium mb-1">Faculty / Student Lead</label><input type="text" value={clubCoord} onChange={e => setClubCoord(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
            <div><label className="block text-xs font-medium mb-1">Meeting Schedule</label><input type="text" required value={clubSched} onChange={e => setClubSched(e.target.value)} className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" /></div>
          </div>
          <textarea required rows={3} value={clubDesc} onChange={e => setClubDesc(e.target.value)} placeholder="Club activities, membership benefits..." className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setClubModal(false)} className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#111111] dark:bg-white dark:text-zinc-950 text-white">Create Club</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

