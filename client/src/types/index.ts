export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  departmentId: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  isLab: boolean;
}

export interface Division {
  id: string;
  name: string;
  departmentId: string;
  studentCount: number;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  roomType: "CLASSROOM" | "LAB";
}

export interface Assignment {
  id: string;
  periodsPerWeek: number;
  subject: { id: string; name: string; code: string; isLab: boolean };
  division: { id: string; name: string; studentCount: number };
  faculty: { id: string; name: string };
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  period: number;
  isManual: boolean;
  subject: { id: string; name: string; code: string };
  faculty: { id: string; name: string };
  division: { id: string; name: string };
  classroom: { id: string; name: string; roomType: "CLASSROOM" | "LAB" };
}

export interface Timetable {
  generationRunId: string;
  status: "SUCCESS";
  slots: TimetableSlot[];
}

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

export interface UnavailablePeriod {
  dayOfWeek: DayOfWeek;
  period: number;
}

export interface FacultyAvailability {
  facultyId: string;
  unavailable: UnavailablePeriod[];
}

export interface ConflictReport {
  assignmentId: string;
  reasonCode: string;
  requiredPeriods: number;
  compatiblePeriods: number;
  summary: string;
  possibleActions: string[];
  evidence: {
    subjectName: string;
    divisionName: string;
    facultyName: string;
    studentCount: number;
  };
}

export interface GenerationHistoryEntry {
  id: string;
  status: "SUCCESS" | "FAILED";
  isActive: boolean;
  createdAt: string;
  completedAt: string | null;
  summary: string;
  slotCount: number | null;
  conflicts: ConflictReport[];
}

export interface GenerationResult {
  success: boolean;
  generationRunId: string;
  slotCount: number;
  conflicts: ConflictReport[];
}
