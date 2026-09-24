import { Prisma } from "@prisma/client";

import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../prisma/client";
import { generateTimetable } from "./scheduler/scheduler";
import type { ConflictEvidence, ConflictReport, SchedulerInput, ScheduledSlot } from "./scheduler/types";

export interface GenerationResponse {
  success: boolean;
  generationRunId: string;
  slotCount: number;
  conflicts: ConflictReport[];
}

export async function generateForDepartment(departmentId: string): Promise<GenerationResponse> {
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    throw new HttpError(404, "Department not found.");
  }

  const [assignments, classrooms] = await Promise.all([
    prisma.assignment.findMany({
      where: { division: { departmentId } },
      include: {
        subject: true,
        division: true,
        faculty: { include: { unavailable: true } },
      },
    }),
    prisma.classroom.findMany(),
  ]);

  if (assignments.length === 0) {
    throw new HttpError(400, "This department has no assignments to schedule.");
  }

  const result = generateTimetable(toSchedulerInput(assignments, classrooms));

  if (result.success) {
    const run = await prisma.$transaction(async (tx) => {
      await deactivateActiveRuns(tx, departmentId);
      return tx.generationRun.create({
        data: {
          status: "SUCCESS",
          isActive: true,
          completedAt: new Date(),
          summary: `Scheduled ${result.slots.length} sessions for ${department.name}.`,
          slots: { create: result.slots.map(toSlotCreate) },
        },
      });
    });

    return {
      success: true,
      generationRunId: run.id,
      slotCount: result.slots.length,
      conflicts: [],
    };
  }

  const run = await prisma.$transaction((tx) =>
    tx.generationRun.create({
      data: {
        status: "FAILED",
        isActive: false,
        completedAt: new Date(),
        summary: result.conflicts[0]?.summary ?? `Generation failed for ${department.name}.`,
        conflicts: {
          create: result.conflicts.map((conflict) => ({
            assignmentId: conflict.assignmentId,
            reasonCode: conflict.reasonCode,
            requiredPeriods: conflict.requiredPeriods,
            compatiblePeriods: conflict.compatiblePeriods,
            summary: conflict.summary,
            possibleActions: conflict.possibleActions,
            evidence: conflict.evidence as unknown as Prisma.InputJsonValue,
          })),
        },
      },
    }),
  );

  return {
    success: false,
    generationRunId: run.id,
    slotCount: 0,
    conflicts: result.conflicts,
  };
}

export async function getActiveTimetable(departmentId: string) {
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    throw new HttpError(404, "Department not found.");
  }

  const run = await prisma.generationRun.findFirst({
    where: activeRunForDepartment(departmentId),
    orderBy: { createdAt: "desc" },
    include: {
      slots: {
        where: { division: { departmentId } },
        orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }, { divisionId: "asc" }],
        include: {
          faculty: { select: { id: true, name: true } },
          division: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true, roomType: true } },
          assignment: { include: { subject: { select: { id: true, name: true, code: true } } } },
        },
      },
    },
  });

  if (!run) {
    throw new HttpError(404, "No generated timetable exists for this department.");
  }

  return {
    generationRunId: run.id,
    status: run.status,
    slots: run.slots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      isManual: slot.isManual,
      subject: slot.assignment.subject,
      faculty: slot.faculty,
      division: slot.division,
      classroom: slot.classroom,
    })),
  };
}

export async function getGenerationHistory(departmentId: string) {
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    throw new HttpError(404, "Department not found.");
  }

  const runs = await prisma.generationRun.findMany({
    where: {
      OR: [
        { slots: { some: { division: { departmentId } } } },
        { conflicts: { some: { assignment: { division: { departmentId } } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { slots: { where: { division: { departmentId } } } } },
      conflicts: {
        where: { assignment: { division: { departmentId } } },
        orderBy: { id: "asc" },
      },
    },
  });

  return runs.map((run) => ({
    id: run.id,
    status: run.status,
    isActive: run.isActive,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    summary: run.summary,
    slotCount: run.status === "SUCCESS" ? run._count.slots : null,
    conflicts: run.conflicts.flatMap((conflict) => {
      const report = toStoredConflict(conflict);
      return report ? [report] : [];
    }),
  }));
}

function toStoredConflict(conflict: {
  assignmentId: string | null;
  reasonCode: ConflictReport["reasonCode"];
  requiredPeriods: number;
  compatiblePeriods: number;
  summary: string;
  possibleActions: string[];
  evidence: Prisma.JsonValue;
}): ConflictReport | null {
  if (!conflict.assignmentId || !isConflictEvidence(conflict.evidence)) {
    return null;
  }
  return {
    assignmentId: conflict.assignmentId,
    reasonCode: conflict.reasonCode,
    requiredPeriods: conflict.requiredPeriods,
    compatiblePeriods: conflict.compatiblePeriods,
    summary: conflict.summary,
    possibleActions: conflict.possibleActions,
    evidence: conflict.evidence as unknown as ConflictEvidence,
  };
}

function isConflictEvidence(value: Prisma.JsonValue): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const evidence = value as Record<string, unknown>;
  return (
    typeof evidence.subjectName === "string" &&
    typeof evidence.divisionName === "string" &&
    typeof evidence.facultyName === "string" &&
    typeof evidence.studentCount === "number"
  );
}

function activeRunForDepartment(departmentId: string) {
  return {
    isActive: true,
    status: "SUCCESS" as const,
    slots: { some: { division: { departmentId } } },
  };
}

async function deactivateActiveRuns(tx: Prisma.TransactionClient, departmentId: string) {
  const previous = await tx.generationRun.findMany({
    where: activeRunForDepartment(departmentId),
    select: { id: true },
  });
  if (previous.length === 0) {
    return;
  }
  await tx.generationRun.updateMany({
    where: { id: { in: previous.map((run) => run.id) } },
    data: { isActive: false },
  });
}

type LoadedAssignment = Prisma.AssignmentGetPayload<{
  include: {
    subject: true;
    division: true;
    faculty: { include: { unavailable: true } };
  };
}>;

function toSchedulerInput(
  assignments: LoadedAssignment[],
  classrooms: Array<{ id: string; name: string; capacity: number; roomType: "CLASSROOM" | "LAB" }>,
): SchedulerInput {
  const faculty = new Map<string, LoadedAssignment["faculty"]>();
  const subjects = new Map<string, LoadedAssignment["subject"]>();
  const divisions = new Map<string, LoadedAssignment["division"]>();

  for (const assignment of assignments) {
    faculty.set(assignment.faculty.id, assignment.faculty);
    subjects.set(assignment.subject.id, assignment.subject);
    divisions.set(assignment.division.id, assignment.division);
  }

  return {
    faculty: [...faculty.values()].map((member) => ({ id: member.id, name: member.name })),
    subjects: [...subjects.values()].map((subject) => ({
      id: subject.id,
      name: subject.name,
      isLab: subject.isLab,
    })),
    divisions: [...divisions.values()].map((division) => ({
      id: division.id,
      name: division.name,
      studentCount: division.studentCount,
    })),
    classrooms: classrooms.map((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      roomType: room.roomType,
    })),
    unavailable: [...faculty.values()].flatMap((member) =>
      member.unavailable.map((row) => ({
        facultyId: row.facultyId,
        dayOfWeek: row.dayOfWeek,
        period: row.period,
      })),
    ),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      subjectId: assignment.subjectId,
      divisionId: assignment.divisionId,
      facultyId: assignment.facultyId,
      periodsPerWeek: assignment.periodsPerWeek,
    })),
  };
}

function toSlotCreate(slot: ScheduledSlot) {
  return {
    assignmentId: slot.assignmentId,
    subjectId: slot.subjectId,
    divisionId: slot.divisionId,
    facultyId: slot.facultyId,
    classroomId: slot.classroomId,
    dayOfWeek: slot.dayOfWeek,
    period: slot.period,
  };
}
