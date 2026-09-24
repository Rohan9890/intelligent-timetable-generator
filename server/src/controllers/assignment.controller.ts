import type { Request, Response } from "express";

import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../prisma/client";
import { requireObject, requirePeriodsPerWeek, requireText } from "../validation";

export async function listAssignments(_req: Request, res: Response): Promise<void> {
  const assignments = await prisma.assignment.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      subject: { select: { id: true, name: true, code: true, isLab: true } },
      division: { select: { id: true, name: true, studentCount: true } },
      faculty: { select: { id: true, name: true } },
    },
  });
  res.json(assignments);
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const body = requireObject(req.body);
  const subjectId = requireText(body.subjectId, "subjectId");
  const divisionId = requireText(body.divisionId, "divisionId");
  const facultyId = requireText(body.facultyId, "facultyId");
  const periodsPerWeek = requirePeriodsPerWeek(body.periodsPerWeek);

  const [subject, division, faculty, existing] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.division.findUnique({ where: { id: divisionId } }),
    prisma.faculty.findUnique({ where: { id: facultyId } }),
    prisma.assignment.findUnique({ where: { subjectId_divisionId: { subjectId, divisionId } } }),
  ]);

  if (!subject) {
    throw new HttpError(404, "Subject not found.");
  }
  if (!division) {
    throw new HttpError(404, "Division not found.");
  }
  if (!faculty) {
    throw new HttpError(404, "Faculty not found.");
  }
  if (existing) {
    throw new HttpError(409, "This subject is already assigned to the division.");
  }

  const assignment = await prisma.assignment.create({
    data: { subjectId, divisionId, facultyId, periodsPerWeek },
  });
  res.status(201).json(assignment);
}

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = routeId(req.params.assignmentId);
  const body = requireObject(req.body);
  const subjectId = requireText(body.subjectId, "subjectId");
  const divisionId = requireText(body.divisionId, "divisionId");
  const facultyId = requireText(body.facultyId, "facultyId");
  const periodsPerWeek = requirePeriodsPerWeek(body.periodsPerWeek);

  const [assignment, subject, division, faculty, existing] = await Promise.all([
    prisma.assignment.findUnique({ where: { id: assignmentId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.division.findUnique({ where: { id: divisionId } }),
    prisma.faculty.findUnique({ where: { id: facultyId } }),
    prisma.assignment.findUnique({ where: { subjectId_divisionId: { subjectId, divisionId } } }),
  ]);

  if (!assignment) {
    throw new HttpError(404, "Assignment not found.");
  }
  if (!subject) {
    throw new HttpError(404, "Subject not found.");
  }
  if (!division) {
    throw new HttpError(404, "Division not found.");
  }
  if (!faculty) {
    throw new HttpError(404, "Faculty not found.");
  }
  if (existing && existing.id !== assignment.id) {
    throw new HttpError(409, "This subject is already assigned to the division.");
  }

  const updated = await prisma.assignment.update({
    where: { id: assignment.id },
    data: { subjectId, divisionId, facultyId, periodsPerWeek },
  });
  res.json(updated);
}

export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = routeId(req.params.assignmentId);
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { _count: { select: { slots: true } } },
  });
  if (!assignment) {
    throw new HttpError(404, "Assignment not found.");
  }
  if (assignment._count.slots > 0) {
    throw new HttpError(409, "Cannot delete this assignment because timetable slots reference it.");
  }

  await prisma.assignment.delete({ where: { id: assignment.id } });
  const { _count: _ignored, ...record } = assignment;
  res.json(record);
}

function routeId(value: string | string[] | undefined): string {
  return requireText(Array.isArray(value) ? value[0] : value, "assignmentId");
}
