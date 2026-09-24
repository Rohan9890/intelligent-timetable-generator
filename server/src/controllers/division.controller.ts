import type { Request, Response } from "express";

import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../prisma/client";
import { requireObject, requirePositiveInt, requireText } from "../validation";

export async function listDivisions(_req: Request, res: Response): Promise<void> {
  const divisions = await prisma.division.findMany({ orderBy: { name: "asc" } });
  res.json(divisions);
}

export async function createDivision(req: Request, res: Response): Promise<void> {
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const departmentId = requireText(body.departmentId, "departmentId");
  const studentCount = requirePositiveInt(body.studentCount, "studentCount");

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    throw new HttpError(404, "Department not found.");
  }

  const existing = await prisma.division.findUnique({
    where: { departmentId_name: { departmentId, name } },
  });
  if (existing) {
    throw new HttpError(409, "A division with this name already exists in the department.");
  }

  const division = await prisma.division.create({ data: { name, departmentId, studentCount } });
  res.status(201).json(division);
}

export async function updateDivision(req: Request, res: Response): Promise<void> {
  const divisionId = routeId(req.params.divisionId);
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const studentCount = requirePositiveInt(body.studentCount, "studentCount");

  const division = await prisma.division.findUnique({ where: { id: divisionId } });
  if (!division) {
    throw new HttpError(404, "Division not found.");
  }

  const existing = await prisma.division.findUnique({
    where: { departmentId_name: { departmentId: division.departmentId, name } },
  });
  if (existing && existing.id !== division.id) {
    throw new HttpError(409, "A division with this name already exists in the department.");
  }

  const updated = await prisma.division.update({
    where: { id: division.id },
    data: { name, studentCount },
  });
  res.json(updated);
}

export async function deleteDivision(req: Request, res: Response): Promise<void> {
  const divisionId = routeId(req.params.divisionId);
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: { _count: { select: { assignments: true, slots: true } } },
  });
  if (!division) {
    throw new HttpError(404, "Division not found.");
  }
  if (division._count.assignments > 0) {
    throw new HttpError(409, "Cannot delete this division because existing assignments reference it.");
  }
  if (division._count.slots > 0) {
    throw new HttpError(409, "Cannot delete this division because timetable slots reference it.");
  }

  await prisma.division.delete({ where: { id: division.id } });
  const { _count: _ignored, ...record } = division;
  res.json(record);
}

function routeId(value: string | string[] | undefined): string {
  return requireText(Array.isArray(value) ? value[0] : value, "divisionId");
}
