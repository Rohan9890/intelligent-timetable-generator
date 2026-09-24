import type { WorkingDay } from "../../config/schedule";

export type DayOfWeek = WorkingDay;

export type RoomType = "CLASSROOM" | "LAB";

export type ConflictReasonCode =
  | "FACULTY_UNAVAILABLE"
  | "FACULTY_CONFLICT"
  | "DIVISION_CONFLICT"
  | "CLASSROOM_CONFLICT"
  | "ROOM_CAPACITY"
  | "LAB_ROOM_REQUIRED"
  | "INSUFFICIENT_CANDIDATE_SLOTS"
  | "PERIODS_EXCEED_GRID";

export interface FacultyInput {
  id: string;
  name: string;
}

export interface SubjectInput {
  id: string;
  name: string;
  isLab: boolean;
}

export interface DivisionInput {
  id: string;
  name: string;
  studentCount: number;
}

export interface ClassroomInput {
  id: string;
  name: string;
  capacity: number;
  roomType: RoomType;
}

export interface UnavailablePeriod {
  facultyId: string;
  dayOfWeek: DayOfWeek;
  period: number;
}

export interface AssignmentInput {
  id: string;
  subjectId: string;
  divisionId: string;
  facultyId: string;
  periodsPerWeek: number;
}

export interface SchedulerInput {
  faculty: FacultyInput[];
  subjects: SubjectInput[];
  divisions: DivisionInput[];
  classrooms: ClassroomInput[];
  unavailable: UnavailablePeriod[];
  assignments: AssignmentInput[];
}

export interface Session {
  id: string;
  index: number;
  assignment: AssignmentInput;
  subject: SubjectInput;
  division: DivisionInput;
  faculty: FacultyInput;
}

export interface PeriodRef {
  dayOfWeek: DayOfWeek;
  period: number;
}

export interface Candidate extends PeriodRef {
  classroom: ClassroomInput;
}

export interface ScheduledSlot {
  assignmentId: string;
  subjectId: string;
  divisionId: string;
  facultyId: string;
  classroomId: string;
  dayOfWeek: DayOfWeek;
  period: number;
}

export interface ConflictEvidence {
  subjectName: string;
  divisionName: string;
  facultyName: string;
  studentCount: number;
  requiredRoomType: RoomType;
  suitableRoomCount: number;
  largestSuitableCapacity: number | null;
  placedSessions: number;
  facultyUnavailablePeriods: number;
  facultyConflictPeriods: number;
  divisionConflictPeriods: number;
  classroomConflictPeriods: number;
}

export interface ConflictReport {
  assignmentId: string;
  reasonCode: ConflictReasonCode;
  requiredPeriods: number;
  compatiblePeriods: number;
  summary: string;
  possibleActions: string[];
  evidence: ConflictEvidence;
}

export type SchedulerResult =
  | { success: true; slots: ScheduledSlot[] }
  | { success: false; conflicts: ConflictReport[] };

export interface Occupancy {
  faculty: Map<string, Set<string>>;
  division: Map<string, Set<string>>;
  room: Map<string, Set<string>>;
}
