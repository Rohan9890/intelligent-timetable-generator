import { WEEKLY_PERIOD_CAPACITY } from "../../config/schedule";
import {
  allPeriods,
  isFacultyAvailable,
  isOccupied,
  requiredRoomType,
  suitableRooms,
} from "./constraints";
import type {
  ClassroomInput,
  ConflictEvidence,
  ConflictReasonCode,
  ConflictReport,
  Occupancy,
  Session,
} from "./types";

export function diagnoseConflict(
  session: Session,
  classrooms: ClassroomInput[],
  unavailable: Set<string>,
  occupancy: Occupancy,
  placedSessions: number,
): ConflictReport {
  const roomsOfType = classrooms.filter(
    (classroom) => classroom.roomType === requiredRoomType(session.subject),
  );
  const rooms = suitableRooms(classrooms, session.subject, session.division);
  const periods = allPeriods();
  const availablePeriods = periods.filter((period) =>
    isFacultyAvailable(
      unavailable,
      session.faculty.id,
      period.dayOfWeek,
      period.period,
    ),
  );

  let facultyConflictPeriods = 0;
  let divisionConflictPeriods = 0;
  let classroomConflictPeriods = 0;

  for (const period of availablePeriods) {
    const facultyBusy = isOccupied(
      occupancy,
      "faculty",
      session.faculty.id,
      period.dayOfWeek,
      period.period,
    );
    const divisionBusy = isOccupied(
      occupancy,
      "division",
      session.division.id,
      period.dayOfWeek,
      period.period,
    );
    const roomBusy =
      rooms.length > 0 &&
      rooms.every((classroom) =>
        isOccupied(occupancy, "room", classroom.id, period.dayOfWeek, period.period),
      );
    if (facultyBusy) {
      facultyConflictPeriods += 1;
    }
    if (divisionBusy) {
      divisionConflictPeriods += 1;
    }
    if (roomBusy) {
      classroomConflictPeriods += 1;
    }
  }

  const compatiblePeriods = rooms.length === 0 ? 0 : availablePeriods.length;
  const evidence = buildEvidence(
    session,
    rooms,
    placedSessions,
    periods.length - availablePeriods.length,
    facultyConflictPeriods,
    divisionConflictPeriods,
    classroomConflictPeriods,
  );

  const reasonCode = chooseReason({
    session,
    roomsOfType: roomsOfType.length,
    suitableRoomCount: rooms.length,
    compatiblePeriods,
    availablePeriodCount: availablePeriods.length,
    facultyConflictPeriods,
    divisionConflictPeriods,
    classroomConflictPeriods,
  });

  return {
    assignmentId: session.assignment.id,
    reasonCode,
    requiredPeriods: session.assignment.periodsPerWeek,
    compatiblePeriods,
    summary: summaryFor(reasonCode, session, compatiblePeriods),
    possibleActions: actionsFor(reasonCode, session.subject.isLab),
    evidence,
  };
}

function chooseReason(input: {
  session: Session;
  roomsOfType: number;
  suitableRoomCount: number;
  compatiblePeriods: number;
  availablePeriodCount: number;
  facultyConflictPeriods: number;
  divisionConflictPeriods: number;
  classroomConflictPeriods: number;
}): ConflictReasonCode {
  if (input.session.assignment.periodsPerWeek > WEEKLY_PERIOD_CAPACITY) {
    return "PERIODS_EXCEED_GRID";
  }
  if (input.suitableRoomCount === 0) {
    if (input.session.subject.isLab && input.roomsOfType === 0) {
      return "LAB_ROOM_REQUIRED";
    }
    if (input.roomsOfType > 0) {
      return "ROOM_CAPACITY";
    }
    return "INSUFFICIENT_CANDIDATE_SLOTS";
  }
  if (input.availablePeriodCount === 0) {
    return "FACULTY_UNAVAILABLE";
  }

  const periodCount = input.availablePeriodCount;
  const covers: ConflictReasonCode[] = [];
  if (input.facultyConflictPeriods === periodCount) {
    covers.push("FACULTY_CONFLICT");
  }
  if (input.divisionConflictPeriods === periodCount) {
    covers.push("DIVISION_CONFLICT");
  }
  if (input.classroomConflictPeriods === periodCount) {
    covers.push("CLASSROOM_CONFLICT");
  }
  if (covers.length === 1) {
    return covers[0];
  }
  return "INSUFFICIENT_CANDIDATE_SLOTS";
}

function summaryFor(
  reasonCode: ConflictReasonCode,
  session: Session,
  compatiblePeriods: number,
): string {
  const subject = session.subject.name;
  const faculty = session.faculty.name;
  const division = session.division.name;
  const required = session.assignment.periodsPerWeek;
  const roomLabel = session.subject.isLab ? "lab" : "classroom";

  switch (reasonCode) {
    case "ROOM_CAPACITY":
      return `${subject} requires a ${roomLabel} for ${session.division.studentCount} students, but no available ${roomLabel} has sufficient capacity.`;
    case "LAB_ROOM_REQUIRED":
      return `${subject} is a lab subject, but no laboratory exists to host it.`;
    case "FACULTY_UNAVAILABLE":
      return `${subject} could not be scheduled. ${faculty} is unavailable for the remaining compatible slots.`;
    case "FACULTY_CONFLICT":
      return `${subject} could not be scheduled because ${faculty} is already teaching in every remaining compatible period.`;
    case "DIVISION_CONFLICT":
      return `${division} already has another class in every remaining period, so ${subject} cannot be scheduled.`;
    case "CLASSROOM_CONFLICT":
      return `Every suitable room is already occupied in the remaining periods, so ${subject} cannot be scheduled.`;
    case "PERIODS_EXCEED_GRID":
      return `${subject} needs ${required} periods, but the weekly grid has only ${WEEKLY_PERIOD_CAPACITY}.`;
    case "INSUFFICIENT_CANDIDATE_SLOTS":
      return `${subject} could not be scheduled. Required periods: ${required}. Compatible periods: ${compatiblePeriods}. The remaining slots are blocked by more than one constraint.`;
  }
}

function actionsFor(reasonCode: ConflictReasonCode, isLab: boolean): string[] {
  switch (reasonCode) {
    case "ROOM_CAPACITY":
      return isLab
        ? [
            "Add a larger laboratory",
            "Move the division to a smaller section",
            "Change the lab allocation",
          ]
        : [
            "Add a larger classroom",
            "Move the division to a smaller section",
            "Reduce the division size",
          ];
    case "LAB_ROOM_REQUIRED":
      return [
        "Add a laboratory",
        "Mark an existing room as a lab",
        "Change this subject to a theory class",
      ];
    case "FACULTY_UNAVAILABLE":
      return [
        "Increase faculty availability",
        "Assign another faculty",
        "Reduce the weekly period requirement",
      ];
    case "FACULTY_CONFLICT":
      return [
        "Assign another faculty member",
        "Reduce the weekly period requirement",
        "Move one subject to a different faculty member",
      ];
    case "DIVISION_CONFLICT":
      return [
        "Reduce weekly period requirements for this division",
        "Move a subject to another division",
      ];
    case "CLASSROOM_CONFLICT":
      return [
        "Add another suitable room",
        "Reduce weekly period requirements",
      ];
    case "PERIODS_EXCEED_GRID":
      return [
        `Reduce the weekly period requirement to ${WEEKLY_PERIOD_CAPACITY} or fewer`,
      ];
    case "INSUFFICIENT_CANDIDATE_SLOTS":
      return [
        "Increase faculty availability",
        "Add a suitable room",
        "Reduce the weekly period requirement",
      ];
  }
}

function buildEvidence(
  session: Session,
  rooms: ClassroomInput[],
  placedSessions: number,
  facultyUnavailablePeriods: number,
  facultyConflictPeriods: number,
  divisionConflictPeriods: number,
  classroomConflictPeriods: number,
): ConflictEvidence {
  const largest = rooms.reduce<number | null>((max, room) => {
    if (max === null || room.capacity > max) {
      return room.capacity;
    }
    return max;
  }, null);

  return {
    subjectName: session.subject.name,
    divisionName: session.division.name,
    facultyName: session.faculty.name,
    studentCount: session.division.studentCount,
    requiredRoomType: requiredRoomType(session.subject),
    suitableRoomCount: rooms.length,
    largestSuitableCapacity: largest,
    placedSessions,
    facultyUnavailablePeriods,
    facultyConflictPeriods,
    divisionConflictPeriods,
    classroomConflictPeriods,
  };
}
