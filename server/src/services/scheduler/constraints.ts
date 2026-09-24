import {
  PERIOD_NUMBERS,
  WORKING_DAYS,
} from "../../config/schedule";
import type {
  Candidate,
  ClassroomInput,
  DayOfWeek,
  DivisionInput,
  Occupancy,
  PeriodRef,
  RoomType,
  Session,
  SubjectInput,
  UnavailablePeriod,
} from "./types";

export function slotKey(dayOfWeek: DayOfWeek, period: number): string {
  return `${dayOfWeek}:${period}`;
}

export function availabilityKey(
  facultyId: string,
  dayOfWeek: DayOfWeek,
  period: number,
): string {
  return `${facultyId}:${dayOfWeek}:${period}`;
}

export function buildUnavailableSet(unavailable: UnavailablePeriod[]): Set<string> {
  return new Set(
    unavailable.map((entry) =>
      availabilityKey(entry.facultyId, entry.dayOfWeek, entry.period),
    ),
  );
}

export function allPeriods(): PeriodRef[] {
  const periods: PeriodRef[] = [];
  for (const dayOfWeek of WORKING_DAYS) {
    for (const period of PERIOD_NUMBERS) {
      periods.push({ dayOfWeek, period });
    }
  }
  return periods;
}

export function isFacultyAvailable(
  unavailable: Set<string>,
  facultyId: string,
  dayOfWeek: DayOfWeek,
  period: number,
): boolean {
  return !unavailable.has(availabilityKey(facultyId, dayOfWeek, period));
}

export function requiredRoomType(subject: SubjectInput): RoomType {
  return subject.isLab ? "LAB" : "CLASSROOM";
}

export function isRoomSuitable(
  classroom: ClassroomInput,
  subject: SubjectInput,
  division: DivisionInput,
): boolean {
  return (
    classroom.roomType === requiredRoomType(subject) &&
    classroom.capacity >= division.studentCount
  );
}

export function suitableRooms(
  classrooms: ClassroomInput[],
  subject: SubjectInput,
  division: DivisionInput,
): ClassroomInput[] {
  return classrooms
    .filter((classroom) => isRoomSuitable(classroom, subject, division))
    .sort(compareClassrooms);
}

export function compareClassrooms(a: ClassroomInput, b: ClassroomInput): number {
  if (a.capacity !== b.capacity) {
    return a.capacity - b.capacity;
  }
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) {
    return byName;
  }
  return a.id.localeCompare(b.id);
}

export function isOccupied(
  occupancy: Occupancy,
  kind: keyof Occupancy,
  id: string,
  dayOfWeek: DayOfWeek,
  period: number,
): boolean {
  return occupancy[kind].get(id)?.has(slotKey(dayOfWeek, period)) ?? false;
}

export function isSlotFree(
  occupancy: Occupancy,
  session: Session,
  classroomId: string,
  dayOfWeek: DayOfWeek,
  period: number,
): boolean {
  return (
    !isOccupied(occupancy, "faculty", session.faculty.id, dayOfWeek, period) &&
    !isOccupied(occupancy, "division", session.division.id, dayOfWeek, period) &&
    !isOccupied(occupancy, "room", classroomId, dayOfWeek, period)
  );
}

export function staticCompatiblePeriods(
  session: Session,
  classrooms: ClassroomInput[],
  unavailable: Set<string>,
): PeriodRef[] {
  const rooms = suitableRooms(classrooms, session.subject, session.division);
  if (rooms.length === 0) {
    return [];
  }
  return allPeriods().filter((period) =>
    isFacultyAvailable(unavailable, session.faculty.id, period.dayOfWeek, period.period),
  );
}

export function calculateCandidates(
  session: Session,
  classrooms: ClassroomInput[],
  unavailable: Set<string>,
  occupancy: Occupancy,
): Candidate[] {
  const rooms = suitableRooms(classrooms, session.subject, session.division);
  const candidates: Candidate[] = [];

  for (const period of allPeriods()) {
    if (
      !isFacultyAvailable(
        unavailable,
        session.faculty.id,
        period.dayOfWeek,
        period.period,
      )
    ) {
      continue;
    }
    for (const classroom of rooms) {
      if (
        isSlotFree(occupancy, session, classroom.id, period.dayOfWeek, period.period)
      ) {
        candidates.push({ ...period, classroom });
      }
    }
  }

  return candidates;
}

export function emptyOccupancy(): Occupancy {
  return {
    faculty: new Map(),
    division: new Map(),
    room: new Map(),
  };
}

export function occupy(
  occupancy: Occupancy,
  session: Session,
  classroomId: string,
  dayOfWeek: DayOfWeek,
  period: number,
): void {
  addOccupant(occupancy.faculty, session.faculty.id, dayOfWeek, period);
  addOccupant(occupancy.division, session.division.id, dayOfWeek, period);
  addOccupant(occupancy.room, classroomId, dayOfWeek, period);
}

function addOccupant(
  map: Map<string, Set<string>>,
  id: string,
  dayOfWeek: DayOfWeek,
  period: number,
): void {
  const key = slotKey(dayOfWeek, period);
  const existing = map.get(id);
  if (existing) {
    existing.add(key);
    return;
  }
  map.set(id, new Set([key]));
}
