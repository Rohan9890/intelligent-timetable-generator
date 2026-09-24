import type { Request, Response } from "express";

import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../prisma/client";
import { requireObject, requireText } from "../validation";

export async function listFaculty(_req: Request, res: Response): Promise<void> {
  const faculty = await prisma.faculty.findMany({ orderBy: { name: "asc" } });
  res.json(faculty);
}

export async function createFaculty(req: Request, res: Response): Promise<void> {
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const email = requireText(body.email, "email");
  const departmentId = requireText(body.departmentId, "departmentId");

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    throw new HttpError(404, "Department not found.");
  }

  const existing = await prisma.faculty.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "A faculty member with this email already exists.");
  }

  const faculty = await prisma.faculty.create({ data: { name, email, departmentId } });
  res.status(201).json(faculty);
}

export async function updateFaculty(req: Request, res: Response): Promise<void> {
  const facultyId = routeId(req.params.facultyId);
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const email = requireText(body.email, "email");

  const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
  if (!faculty) {
    throw new HttpError(404, "Faculty member not found.");
  }

  const existing = await prisma.faculty.findUnique({ where: { email } });
  if (existing && existing.id !== faculty.id) {
    throw new HttpError(409, "A faculty member with this email already exists.");
  }

  const updated = await prisma.faculty.update({
    where: { id: faculty.id },
    data: { name, email },
  });
  res.json(updated);
}

export async function deleteFaculty(req: Request, res: Response): Promise<void> {
  const facultyId = routeId(req.params.facultyId);
  const faculty = await prisma.faculty.findUnique({
    where: { id: facultyId },
    include: { _count: { select: { assignments: true, timetableSlots: true } } },
  });
  if (!faculty) {
    throw new HttpError(404, "Faculty member not found.");
  }
  if (faculty._count.assignments > 0) {
    throw new HttpError(409, "Cannot delete this faculty member because existing assignments reference them.");
  }
  if (faculty._count.timetableSlots > 0) {
    throw new HttpError(409, "Cannot delete this faculty member because timetable slots reference them.");
  }

  await prisma.faculty.delete({ where: { id: faculty.id } });
  const { _count: _ignored, ...record } = faculty;
  res.json(record);
}

function routeId(value: string | string[] | undefined): string {
  return requireText(Array.isArray(value) ? value[0] : value, "facultyId");
}
