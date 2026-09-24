import { WEEKLY_PERIOD_CAPACITY } from "../../config/schedule";
import { diagnoseConflict } from "./conflictDiagnosis";
import {
  buildUnavailableSet,
  calculateCandidates,
  emptyOccupancy,
  occupy,
  staticCompatiblePeriods,
  suitableRooms,
} from "./constraints";
import type {
  AssignmentInput,
  ClassroomInput,
  ConflictReport,
  SchedulerInput,
  SchedulerResult,
  ScheduledSlot,
  Session,
} from "./types";

export function generateTimetable(input: SchedulerInput): SchedulerResult {
  const facultyById = indexById(input.faculty);
  const subjectById = indexById(input.subjects);
  const divisionById = indexById(input.divisions);
  const unavailable = buildUnavailableSet(input.unavailable);
  const occupancy = emptyOccupancy();
  const placedSessions = new Map<string, number>();
  const failed = new Set<string>();
  const conflicts: ConflictReport[] = [];

  for (const assignment of input.assignments) {
    if (assignment.periodsPerWeek > WEEKLY_PERIOD_CAPACITY) {
      const session = toSession(assignment, 1, facultyById, subjectById, divisionById);
      conflicts.push(
        diagnoseConflict(session, input.classrooms, unavailable, occupancy, 0),
      );
      failed.add(assignment.id);
    }
  }

  const sessions = expandAssignments(input.assignments, facultyById, subjectById, divisionById)
    .filter((session) => !failed.has(session.assignment.id))
    .sort((a, b) => compareSessions(a, b, input.classrooms, unavailable));

  const slots: ScheduledSlot[] = [];

  for (const session of sessions) {
    if (failed.has(session.assignment.id)) {
      continue;
    }

    const [candidate] = calculateCandidates(
      session,
      input.classrooms,
      unavailable,
      occupancy,
    );
    if (!candidate) {
      conflicts.push(
        diagnoseConflict(
          session,
          input.classrooms,
          unavailable,
          occupancy,
          placedSessions.get(session.assignment.id) ?? 0,
        ),
      );
      failed.add(session.assignment.id);
      continue;
    }

    occupy(
      occupancy,
      session,
      candidate.classroom.id,
      candidate.dayOfWeek,
      candidate.period,
    );
    placedSessions.set(
      session.assignment.id,
      (placedSessions.get(session.assignment.id) ?? 0) + 1,
    );
    slots.push({
      assignmentId: session.assignment.id,
      subjectId: session.subject.id,
      divisionId: session.division.id,
      facultyId: session.faculty.id,
      classroomId: candidate.classroom.id,
      dayOfWeek: candidate.dayOfWeek,
      period: candidate.period,
    });
  }

  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }

  return { success: true, slots };
}

export function expandAssignments(
  assignments: AssignmentInput[],
  facultyById: Map<string, { id: string; name: string }>,
  subjectById: Map<string, { id: string; name: string; isLab: boolean }>,
  divisionById: Map<string, { id: string; name: string; studentCount: number }>,
): Session[] {
  const sessions: Session[] = [];
  for (const assignment of assignments) {
    for (let index = 1; index <= assignment.periodsPerWeek; index += 1) {
      sessions.push(toSession(assignment, index, facultyById, subjectById, divisionById));
    }
  }
  return sessions;
}

function toSession(
  assignment: AssignmentInput,
  index: number,
  facultyById: Map<string, { id: string; name: string }>,
  subjectById: Map<string, { id: string; name: string; isLab: boolean }>,
  divisionById: Map<string, { id: string; name: string; studentCount: number }>,
): Session {
  const faculty = facultyById.get(assignment.facultyId);
  const subject = subjectById.get(assignment.subjectId);
  const division = divisionById.get(assignment.divisionId);
  if (!faculty || !subject || !division) {
    throw new Error(
      `Assignment ${assignment.id} references missing faculty, subject, or division.`,
    );
  }
  return {
    id: `${assignment.id}:${index}`,
    index,
    assignment,
    faculty,
    subject,
    division,
  };
}

function compareSessions(
  a: Session,
  b: Session,
  classrooms: ClassroomInput[],
  unavailable: Set<string>,
): number {
  const scoreDiff = scoreSession(a, classrooms, unavailable) - scoreSession(b, classrooms, unavailable);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  if (a.assignment.periodsPerWeek !== b.assignment.periodsPerWeek) {
    return b.assignment.periodsPerWeek - a.assignment.periodsPerWeek;
  }
  const byAssignment = a.assignment.id.localeCompare(b.assignment.id);
  if (byAssignment !== 0) {
    return byAssignment;
  }
  return a.index - b.index;
}

function scoreSession(
  session: Session,
  classrooms: ClassroomInput[],
  unavailable: Set<string>,
): number {
  const periodCount = staticCompatiblePeriods(session, classrooms, unavailable).length;
  const roomCount = suitableRooms(classrooms, session.subject, session.division).length;
  return periodCount * roomCount;
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}
