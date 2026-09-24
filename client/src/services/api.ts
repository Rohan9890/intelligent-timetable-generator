import type {
  Assignment,
  Classroom,
  Department,
  Division,
  Faculty,
  FacultyAvailability,
  GenerationHistoryEntry,
  GenerationResult,
  Subject,
  Timetable,
  UnavailablePeriod,
  DayOfWeek,
} from "../types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Unable to connect to the server. Please make sure the backend is running.",
      0,
    );
  }

  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      const body = (await response.json()) as { error?: string };
      if (typeof body.error === "string" && body.error.length > 0) {
        message = body.error;
      }
    } catch {
      message = "The request could not be completed.";
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function getDepartments(): Promise<Department[]> {
  return request("/api/departments");
}

export function getFaculty(): Promise<Faculty[]> {
  return request("/api/faculty");
}

export function getFacultyAvailability(facultyId: string): Promise<FacultyAvailability> {
  return request(`/api/faculty/${encodeURIComponent(facultyId)}/availability`);
}

export function saveFacultyAvailability(
  facultyId: string,
  unavailable: UnavailablePeriod[],
): Promise<FacultyAvailability> {
  return request(`/api/faculty/${encodeURIComponent(facultyId)}/availability`, {
    method: "PUT",
    body: JSON.stringify({ unavailable }),
  });
}

export function getSubjects(): Promise<Subject[]> {
  return request("/api/subjects");
}

export function getDivisions(): Promise<Division[]> {
  return request("/api/divisions");
}

export function getClassrooms(): Promise<Classroom[]> {
  return request("/api/classrooms");
}

export function getAssignments(): Promise<Assignment[]> {
  return request("/api/assignments");
}

export function createFaculty(input: { name: string; email: string; departmentId: string }): Promise<Faculty> {
  return request("/api/faculty", { method: "POST", body: JSON.stringify(input) });
}

export function createSubject(input: {
  name: string;
  code: string;
  departmentId: string;
  isLab: boolean;
}): Promise<Subject> {
  return request("/api/subjects", { method: "POST", body: JSON.stringify(input) });
}

export function createDivision(input: {
  name: string;
  departmentId: string;
  studentCount: number;
}): Promise<Division> {
  return request("/api/divisions", { method: "POST", body: JSON.stringify(input) });
}

export function createClassroom(input: {
  name: string;
  capacity: number;
  roomType: Classroom["roomType"];
}): Promise<Classroom> {
  return request("/api/classrooms", { method: "POST", body: JSON.stringify(input) });
}

export function updateFaculty(facultyId: string, input: { name: string; email: string }): Promise<Faculty> {
  return request(`/api/faculty/${encodeURIComponent(facultyId)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteFaculty(facultyId: string): Promise<Faculty> {
  return request(`/api/faculty/${encodeURIComponent(facultyId)}`, { method: "DELETE" });
}

export function updateSubject(
  subjectId: string,
  input: { name: string; code: string; isLab: boolean },
): Promise<Subject> {
  return request(`/api/subjects/${encodeURIComponent(subjectId)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteSubject(subjectId: string): Promise<Subject> {
  return request(`/api/subjects/${encodeURIComponent(subjectId)}`, { method: "DELETE" });
}

export function updateDivision(
  divisionId: string,
  input: { name: string; studentCount: number },
): Promise<Division> {
  return request(`/api/divisions/${encodeURIComponent(divisionId)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteDivision(divisionId: string): Promise<Division> {
  return request(`/api/divisions/${encodeURIComponent(divisionId)}`, { method: "DELETE" });
}

export function updateClassroom(
  classroomId: string,
  input: { name: string; capacity: number; roomType: Classroom["roomType"] },
): Promise<Classroom> {
  return request(`/api/classrooms/${encodeURIComponent(classroomId)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteClassroom(classroomId: string): Promise<Classroom> {
  return request(`/api/classrooms/${encodeURIComponent(classroomId)}`, { method: "DELETE" });
}

export function updateAssignment(
  assignmentId: string,
  input: { subjectId: string; divisionId: string; facultyId: string; periodsPerWeek: number },
): Promise<Assignment> {
  return request(`/api/assignments/${encodeURIComponent(assignmentId)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteAssignment(assignmentId: string): Promise<Assignment> {
  return request(`/api/assignments/${encodeURIComponent(assignmentId)}`, { method: "DELETE" });
}

export function createAssignment(input: {
  subjectId: string;
  divisionId: string;
  facultyId: string;
  periodsPerWeek: number;
}): Promise<Assignment> {
  return request("/api/assignments", { method: "POST", body: JSON.stringify(input) });
}

export function generateTimetable(departmentId: string): Promise<GenerationResult> {
  return request("/api/generate", {
    method: "POST",
    body: JSON.stringify({ departmentId }),
  });
}

export function getTimetable(departmentId: string): Promise<Timetable> {
  return request(`/api/timetable?departmentId=${encodeURIComponent(departmentId)}`);
}

export function getGenerationHistory(departmentId: string): Promise<GenerationHistoryEntry[]> {
  return request(`/api/generations?departmentId=${encodeURIComponent(departmentId)}`);
}

export function updateTimetableSlot(
  slotId: string,
  input: { dayOfWeek: DayOfWeek; period: number; classroomId: string },
): Promise<{ success: boolean }> {
  return request(`/api/timetable/slots/${encodeURIComponent(slotId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
