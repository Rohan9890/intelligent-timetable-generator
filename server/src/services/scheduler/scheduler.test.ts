import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateTimetable } from "./scheduler";
import type {
  AssignmentInput,
  ClassroomInput,
  DayOfWeek,
  DivisionInput,
  FacultyInput,
  SchedulerInput,
  ScheduledSlot,
  SubjectInput,
  UnavailablePeriod,
} from "./types";

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

describe("generateTimetable", () => {
  it("schedules the solvable demo", () => {
    const result = generateTimetable(solvableDemo());
    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.equal(result.slots.length, 34);
    assert.equal(hasDuplicate(result.slots, (slot) => `${slot.facultyId}:${slot.dayOfWeek}:${slot.period}`), false);
    assert.equal(hasDuplicate(result.slots, (slot) => `${slot.divisionId}:${slot.dayOfWeek}:${slot.period}`), false);
    assert.equal(hasDuplicate(result.slots, (slot) => `${slot.classroomId}:${slot.dayOfWeek}:${slot.period}`), false);
  });

  it("does not schedule the same faculty twice in one period", () => {
    const result = generateTimetable(
      input({
        faculty: [faculty("f1", "Anita")],
        subjects: [subject("s1", "Data Structures", false), subject("s2", "Mathematics", false)],
        divisions: [division("d1", "CE-A", 40), division("d2", "CE-B", 40)],
        classrooms: [room("r1", "CR-101", 50, "CLASSROOM"), room("r2", "CR-102", 50, "CLASSROOM")],
        unavailable: unavailableExcept("f1", [{ dayOfWeek: "MONDAY", period: 1 }]),
        assignments: [
          assignment("a1", "s1", "d1", "f1", 1),
          assignment("a2", "s2", "d2", "f1", 1),
        ],
      }),
    );

    assert.equal(result.success, false);
    if (result.success) {
      return;
    }
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0]?.reasonCode, "FACULTY_CONFLICT");
  });

  it("does not schedule the same division twice in one period", () => {
    const result = generateTimetable(
      input({
        faculty: [faculty("f1", "Anita"), faculty("f2", "Rahul")],
        subjects: [subject("s1", "Data Structures", false), subject("s2", "Mathematics", false)],
        divisions: [division("d1", "CE-A", 40)],
        classrooms: [room("r1", "CR-101", 50, "CLASSROOM"), room("r2", "CR-102", 50, "CLASSROOM")],
        unavailable: [],
        assignments: [
          assignment("a1", "s1", "d1", "f1", 16),
          assignment("a2", "s2", "d1", "f2", 16),
        ],
      }),
    );

    assert.equal(result.success, false);
    if (result.success) {
      return;
    }
    assert.equal(result.conflicts.some((conflict) => conflict.reasonCode === "DIVISION_CONFLICT"), true);
  });

  it("does not schedule the same room twice in one period", () => {
    const result = generateTimetable(
      input({
        faculty: [faculty("f1", "Anita"), faculty("f2", "Rahul")],
        subjects: [subject("s1", "Data Structures", false), subject("s2", "Mathematics", false)],
        divisions: [division("d1", "CE-A", 40), division("d2", "CE-B", 40)],
        classrooms: [room("r1", "CR-101", 50, "CLASSROOM")],
        unavailable: [],
        assignments: [
          assignment("a1", "s1", "d1", "f1", 20),
          assignment("a2", "s2", "d2", "f2", 20),
        ],
      }),
    );

    assert.equal(result.success, false);
    if (result.success) {
      return;
    }
    assert.equal(result.conflicts.some((conflict) => conflict.reasonCode === "CLASSROOM_CONFLICT"), true);
  });

  it("never selects an unavailable faculty period", () => {
    const result = generateTimetable(
      input({
        faculty: [faculty("f1", "Anita")],
        subjects: [subject("s1", "Data Structures", false)],
        divisions: [division("d1", "CE-A", 40)],
        classrooms: [room("r1", "CR-101", 50, "CLASSROOM")],
        unavailable: [{ facultyId: "f1", dayOfWeek: "MONDAY", period: 1 }],
        assignments: [assignment("a1", "s1", "d1", "f1", 1)],
      }),
    );

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.equal(
      result.slots.some((slot) => slot.dayOfWeek === "MONDAY" && slot.period === 1),
      false,
    );
  });

  it("does not place a lab subject in a classroom", () => {
    const result = generateTimetable(
      input({
        faculty: [faculty("f1", "Meera")],
        subjects: [subject("s1", "DBMS Lab", true)],
        divisions: [division("d1", "CE-A", 40)],
        classrooms: [
          room("r1", "CR-101", 80, "CLASSROOM"),
          room("lab", "LAB-A", 50, "LAB"),
        ],
        unavailable: [],
        assignments: [assignment("a1", "s1", "d1", "f1", 1)],
      }),
    );

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    assert.deepEqual(
      result.slots.map((slot) => slot.classroomId),
      ["lab"],
    );

    const noLab = generateTimetable(
      input({
        faculty: [faculty("f1", "Meera")],
        subjects: [subject("s1", "DBMS Lab", true)],
        divisions: [division("d1", "CE-A", 40)],
        classrooms: [room("r1", "CR-101", 80, "CLASSROOM")],
        unavailable: [],
        assignments: [assignment("a1", "s1", "d1", "f1", 1)],
      }),
    );
    assert.equal(noLab.success, false);
    if (noLab.success) {
      return;
    }
    assert.equal(noLab.conflicts[0]?.reasonCode, "LAB_ROOM_REQUIRED");
  });

  it("rejects a division that fits in no room", () => {
    const result = generateTimetable(
      input({
        faculty: [faculty("f1", "Sanjay")],
        subjects: [subject("s1", "Mathematics", false)],
        divisions: [division("d1", "CE-A", 100)],
        classrooms: [room("r1", "CR-101", 50, "CLASSROOM"), room("lab", "LAB-A", 120, "LAB")],
        unavailable: [],
        assignments: [assignment("a1", "s1", "d1", "f1", 1)],
      }),
    );

    assert.equal(result.success, false);
    if (result.success) {
      return;
    }
    assert.equal(result.conflicts[0]?.reasonCode, "ROOM_CAPACITY");
    assert.equal(result.conflicts[0]?.compatiblePeriods, 0);
    assert.equal(result.conflicts[0]?.requiredPeriods, 1);
  });

  it("explains the impossible IT lab scenario", () => {
    const result = generateTimetable(impossibleDemo());
    assert.equal(result.success, false);
    if (result.success) {
      return;
    }
    assert.equal(result.conflicts.length, 1);
    const conflict = result.conflicts[0];
    assert.ok(conflict);
    assert.equal(conflict.reasonCode, "ROOM_CAPACITY");
    assert.equal(conflict.requiredPeriods, 2);
    assert.equal(conflict.compatiblePeriods, 0);
    assert.match(conflict.summary, /120 students/);
    assert.match(conflict.summary, /no available lab has sufficient capacity/);
    assert.ok(conflict.possibleActions.length >= 2);
  });

  it("meets every weekly period requirement on success", () => {
    const demo = solvableDemo();
    const result = generateTimetable(demo);
    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }
    const slots = result.slots;
    for (const item of demo.assignments) {
      let count = 0;
      for (const slot of slots) {
        if (slot.assignmentId === item.id) {
          count += 1;
        }
      }
      assert.equal(count, item.periodsPerWeek);
    }
  });

  it("returns the same timetable for the same input", () => {
    const demo = solvableDemo();
    assert.deepEqual(generateTimetable(demo), generateTimetable(demo));
  });
});

function solvableDemo(): SchedulerInput {
  return input({
    faculty: [
      faculty("anita", "Dr. Anita Deshmukh"),
      faculty("rahul", "Prof. Rahul Kulkarni"),
      faculty("meera", "Dr. Meera Iyer"),
      faculty("sanjay", "Prof. Sanjay Patil"),
      faculty("neha", "Dr. Neha Joshi"),
    ],
    subjects: [
      subject("ds", "Data Structures", false),
      subject("dbms", "Database Management Systems", false),
      subject("dbms-lab", "DBMS Lab", true),
      subject("math", "Engineering Mathematics", false),
      subject("os", "Operating Systems", false),
    ],
    divisions: [division("ce-a", "CE-A", 60), division("ce-b", "CE-B", 45)],
    classrooms: collegeRooms(),
    unavailable: [
      { facultyId: "anita", dayOfWeek: "MONDAY", period: 1 },
      { facultyId: "anita", dayOfWeek: "MONDAY", period: 2 },
      { facultyId: "rahul", dayOfWeek: "FRIDAY", period: 6 },
      { facultyId: "meera", dayOfWeek: "WEDNESDAY", period: 3 },
      { facultyId: "sanjay", dayOfWeek: "TUESDAY", period: 1 },
      { facultyId: "neha", dayOfWeek: "THURSDAY", period: 5 },
      { facultyId: "neha", dayOfWeek: "THURSDAY", period: 6 },
    ],
    assignments: [
      assignment("ds-a", "ds", "ce-a", "anita", 4),
      assignment("dbms-a", "dbms", "ce-a", "rahul", 4),
      assignment("lab-a", "dbms-lab", "ce-a", "meera", 2),
      assignment("math-a", "math", "ce-a", "sanjay", 4),
      assignment("os-a", "os", "ce-a", "neha", 3),
      assignment("ds-b", "ds", "ce-b", "anita", 4),
      assignment("dbms-b", "dbms", "ce-b", "rahul", 4),
      assignment("lab-b", "dbms-lab", "ce-b", "meera", 2),
      assignment("math-b", "math", "ce-b", "sanjay", 4),
      assignment("os-b", "os", "ce-b", "neha", 3),
    ],
  });
}

function impossibleDemo(): SchedulerInput {
  return input({
    faculty: [faculty("kavita", "Prof. Kavita Menon")],
    subjects: [subject("cn-lab", "Computer Networks Lab", true)],
    divisions: [division("it-a", "IT-A", 120)],
    classrooms: collegeRooms(),
    unavailable: [],
    assignments: [assignment("cn-it", "cn-lab", "it-a", "kavita", 2)],
  });
}

function collegeRooms(): ClassroomInput[] {
  return [
    room("cr-101", "CR-101", 70, "CLASSROOM"),
    room("cr-102", "CR-102", 70, "CLASSROOM"),
    room("cr-103", "CR-103", 50, "CLASSROOM"),
    room("lab-a", "LAB-A", 70, "LAB"),
    room("lab-b", "LAB-B", 50, "LAB"),
    room("lab-it", "LAB-IT", 36, "LAB"),
  ];
}

function unavailableExcept(
  facultyId: string,
  allowed: Array<{ dayOfWeek: DayOfWeek; period: number }>,
): UnavailablePeriod[] {
  const allowedKeys = new Set(allowed.map((period) => `${period.dayOfWeek}:${period.period}`));
  const rows: UnavailablePeriod[] = [];
  for (const dayOfWeek of DAYS) {
    for (let period = 1; period <= 6; period += 1) {
      if (!allowedKeys.has(`${dayOfWeek}:${period}`)) {
        rows.push({ facultyId, dayOfWeek, period });
      }
    }
  }
  return rows;
}

function input(value: SchedulerInput): SchedulerInput {
  return value;
}

function faculty(id: string, name: string): FacultyInput {
  return { id, name };
}

function subject(id: string, name: string, isLab: boolean): SubjectInput {
  return { id, name, isLab };
}

function division(id: string, name: string, studentCount: number): DivisionInput {
  return { id, name, studentCount };
}

function room(
  id: string,
  name: string,
  capacity: number,
  roomType: ClassroomInput["roomType"],
): ClassroomInput {
  return { id, name, capacity, roomType };
}

function assignment(
  id: string,
  subjectId: string,
  divisionId: string,
  facultyId: string,
  periodsPerWeek: number,
): AssignmentInput {
  return { id, subjectId, divisionId, facultyId, periodsPerWeek };
}

function hasDuplicate(slots: ScheduledSlot[], key: (slot: ScheduledSlot) => string): boolean {
  const seen = new Set<string>();
  for (const slot of slots) {
    const value = key(slot);
    if (seen.has(value)) {
      return true;
    }
    seen.add(value);
  }
  return false;
}
