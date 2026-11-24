import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Class,
  GradeBand,
  Room,
  Subject,
  TimetableEntry,
  TimetableSlotConfig,
  UserProfile
} from '../types';

export const DEFAULT_GRADING_SCALE: GradeBand[] = [
  { grade: 'O', minPercentage: 90, maxPercentage: 100, gradePoint: 10, remarks: 'Outstanding' },
  { grade: 'A+', minPercentage: 80, maxPercentage: 89.99, gradePoint: 9, remarks: 'Excellent' },
  { grade: 'A', minPercentage: 70, maxPercentage: 79.99, gradePoint: 8, remarks: 'Very Good' },
  { grade: 'B+', minPercentage: 60, maxPercentage: 69.99, gradePoint: 7, remarks: 'Good' },
  { grade: 'B', minPercentage: 50, maxPercentage: 59.99, gradePoint: 6, remarks: 'Above Average' },
  { grade: 'C', minPercentage: 40, maxPercentage: 49.99, gradePoint: 5, remarks: 'Pass' },
  { grade: 'F', minPercentage: 0, maxPercentage: 39.99, gradePoint: 0, remarks: 'Fail' },
];

export const DEFAULT_TIMETABLE_CONFIG: TimetableSlotConfig = {
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayStartTime: '09:00',
  dayEndTime: '16:00',
  slotDurationMinutes: 60,
  breaks: [{ name: 'Lunch Break', startTime: '12:00', endTime: '13:00' }]
};

export function calculateGrade(percentage: number, scale: GradeBand[] = DEFAULT_GRADING_SCALE): { grade: string; gradePoint: number; pass: boolean } {
  const sorted = [...scale].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const band of sorted) {
    if (percentage >= band.minPercentage) {
      return { grade: band.grade, gradePoint: band.gradePoint, pass: band.gradePoint > 0 };
    }
  }
  return { grade: 'F', gradePoint: 0, pass: false };
}

export async function logAudit(
  actor: Pick<UserProfile, 'uid' | 'name' | 'role'> | null | undefined,
  action: string,
  module: string,
  targetId: string,
  details: string
) {
  if (!actor?.uid) return;
  try {
    await addDoc(collection(db, 'auditLogs'), {
      actorId: actor.uid,
      actorName: actor.name || 'System User',
      actorRole: actor.role || 'unknown',
      action,
      module,
      targetId,
      details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn('Audit log write skipped:', err);
  }
}

export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const a1 = toMinutes(s1);
  const b1 = toMinutes(e1);
  const a2 = toMinutes(s2);
  const b2 = toMinutes(e2);
  return a1 < b2 && a2 < b1;
}

export interface ConflictReport {
  hasConflict: boolean;
  reasons: string[];
}

export function detectTimetableConflicts(
  candidate: Partial<TimetableEntry>,
  existingEntries: TimetableEntry[],
  rooms: Room[],
  classes: Class[],
  ignoreEntryId?: string
): ConflictReport {
  const reasons: string[] = [];
  if (!candidate.day || !candidate.startTime || !candidate.endTime) {
    return { hasConflict: false, reasons };
  }

  if (toMinutes(candidate.startTime) >= toMinutes(candidate.endTime)) {
    reasons.push('End time must be after start time.');
  }

  const sameDay = existingEntries.filter(
    e => e.day === candidate.day && e.id !== ignoreEntryId && e.status !== 'cancelled'
  );

  for (const entry of sameDay) {
    if (!timesOverlap(candidate.startTime, candidate.endTime, entry.startTime, entry.endTime)) continue;

    if (candidate.teacherId && (entry.teacherId === candidate.teacherId || entry.substituteTeacherId === candidate.teacherId)) {
      reasons.push(`Teacher conflict: already scheduled for ${entry.className || 'another class'} (${entry.startTime}–${entry.endTime}).`);
    }
    if (candidate.classId && entry.classId === candidate.classId) {
      reasons.push(`Class/Section conflict: ${entry.className || 'class'} already has ${entry.subjectName || 'a lecture'} (${entry.startTime}–${entry.endTime}).`);
    }
    if (candidate.roomId && entry.roomId === candidate.roomId) {
      reasons.push(`Room conflict: ${entry.room || 'Room'} is booked by ${entry.className} (${entry.startTime}–${entry.endTime}).`);
    } else if (candidate.room && entry.room && candidate.room.trim().toLowerCase() === entry.room.trim().toLowerCase()) {
      reasons.push(`Room conflict: ${entry.room} is booked by ${entry.className} (${entry.startTime}–${entry.endTime}).`);
    }
  }

  // Capacity check
  if (candidate.roomId && candidate.classId) {
    const room = rooms.find(r => r.id === candidate.roomId);
    const cls = classes.find(c => c.id === candidate.classId);
    const studentCount = cls?.students?.length || 0;
    if (room && studentCount > room.capacity) {
      reasons.push(`Capacity warning: ${room.name || room.roomNumber} holds ${room.capacity} seats, but ${cls?.name} has ${studentCount} students.`);
    }
  }

  return { hasConflict: reasons.length > 0, reasons };
}

export function buildTimeSlots(config: TimetableSlotConfig): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = [];
  const start = toMinutes(config.dayStartTime);
  const end = toMinutes(config.dayEndTime);
  const step = Math.max(30, config.slotDurationMinutes || 60);

  let cursor = start;
  while (cursor + step <= end) {
    const s = fromMinutes(cursor);
    const e = fromMinutes(cursor + step);
    const inBreak = (config.breaks || []).some(b => timesOverlap(s, e, b.startTime, b.endTime));
    if (!inBreak) {
      slots.push({ startTime: s, endTime: e });
    }
    cursor += step;
  }
  return slots;
}

export function autoGenerateTimetable(params: {
  targetClass: Class;
  allocations: { subjectId: string; teacherId: string; sessionsPerWeek: number; type: 'lecture' | 'lab' | 'tutorial' }[];
  existingEntries: TimetableEntry[];
  subjects: Subject[];
  teachers: UserProfile[];
  rooms: Room[];
  classes: Class[];
  config: TimetableSlotConfig;
}): { generated: Omit<TimetableEntry, 'id'>[]; unplaced: string[] } {
  const { targetClass, allocations, existingEntries, subjects, teachers, rooms, classes, config } = params;
  const slots = buildTimeSlots(config);
  const days = config.workingDays?.length ? config.workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const workingList: TimetableEntry[] = [...existingEntries];
  const generated: Omit<TimetableEntry, 'id'>[] = [];
  const unplaced: string[] = [];

  const studentCount = targetClass.students?.length || 0;
  const suitableRooms = (type: string) => {
    const matching = rooms.filter(r =>
      (type === 'lab' ? r.type === 'lab' : r.type === 'classroom' || r.type === 'seminar' || r.type === 'auditorium') &&
      r.capacity >= studentCount
    );
    return matching.length ? matching : rooms.filter(r => r.capacity >= studentCount).length ? rooms.filter(r => r.capacity >= studentCount) : rooms;
  };

  for (const alloc of allocations) {
    const sub = subjects.find(s => s.id === alloc.subjectId);
    const teacher = teachers.find(t => t.uid === alloc.teacherId);
    if (!sub || !teacher) continue;

    let placedCount = 0;
    // Spread across days (avoid repeating same subject on same day first)
    const candidateRooms = suitableRooms(alloc.type);

    for (let round = 0; round < alloc.sessionsPerWeek && placedCount < alloc.sessionsPerWeek; round++) {
      let placedThisRound = false;
      // Rotate start day by round for even weekly distribution
      for (let dIdx = 0; dIdx < days.length && !placedThisRound; dIdx++) {
        const day = days[(dIdx + round) % days.length];
        const alreadyOnDay = generated.some(g => g.day === day && g.subjectId === sub.id);
        if (alreadyOnDay && round < days.length) continue;

        for (const slot of slots) {
          const pickedRoom = candidateRooms.find(rm => {
            const check = detectTimetableConflicts(
              {
                classId: targetClass.id,
                className: targetClass.name,
                teacherId: teacher.uid,
                roomId: rm.id,
                room: rm.roomNumber || rm.name,
                day,
                startTime: slot.startTime,
                endTime: slot.endTime
              },
              workingList,
              rooms,
              classes
            );
            return !check.hasConflict;
          });

          const fallbackRoom = candidateRooms.length === 0 ? (() => {
            const check = detectTimetableConflicts(
              {
                classId: targetClass.id,
                className: targetClass.name,
                teacherId: teacher.uid,
                room: 'Main Hall',
                day,
                startTime: slot.startTime,
                endTime: slot.endTime
              },
              workingList,
              rooms,
              classes
            );
            return !check.hasConflict ? { id: '', roomNumber: 'Room 101', name: 'Room 101' } : null;
          })() : null;

          const chosenRoom = pickedRoom || fallbackRoom;
          if (chosenRoom) {
            const entry: Omit<TimetableEntry, 'id'> = {
              classId: targetClass.id,
              className: targetClass.name,
              departmentId: targetClass.departmentId || '',
              mentorId: targetClass.mentorId || '',
              subjectId: sub.id,
              subjectName: sub.name,
              teacherId: teacher.uid,
              teacherName: teacher.name,
              roomId: chosenRoom.id || '',
              room: (chosenRoom as Room).roomNumber || chosenRoom.name,
              day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              type: alloc.type,
              status: 'scheduled'
            };
            generated.push(entry);
            workingList.push({ id: `temp-${generated.length}`, ...entry });
            placedCount++;
            placedThisRound = true;
            break;
          }
        }
      }
    }

    if (placedCount < alloc.sessionsPerWeek) {
      unplaced.push(`${sub.name} (${alloc.sessionsPerWeek - placedCount} unplaced session(s))`);
    }
  }

  return { generated, unplaced };
}
