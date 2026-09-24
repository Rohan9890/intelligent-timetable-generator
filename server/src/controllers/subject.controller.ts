import type { Request, Response } from "express";

import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../prisma/client";
import { requireBoolean, requireObject, requireText } from "../validation";

export async function listSubjects(_req: Request, res: Response): Promise<void> {
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  res.json(subjects);
}

export async function createSubject(req: Request, res: Response): Promise<void> {
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const code = requireText(body.code, "code");
  const departmentId = requireText(body.departmentId, "departmentId");
  const isLab = requireBoolean(body.isLab, "isLab");

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    throw new HttpError(404, "Department not found.");
  }

  const existing = await prisma.subject.findUnique({
    where: { departmentId_code: { departmentId, code } },
  });
  if (existing) {
    throw new HttpError(409, "A subject with this code already exists in the department.");
  }

  const subject = await prisma.subject.create({ data: { name, code, departmentId, isLab } });
  res.status(201).json(subject);
}

export async function updateSubject(req: Request, res: Response): Promise<void> {
  const subjectId = routeId(req.params.subjectId);
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const code = requireText(body.code, "code");
  const isLab = requireBoolean(body.isLab, "isLab");

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    throw new HttpError(404, "Subject not found.");
  }

  const existing = await prisma.subject.findUnique({
    where: { departmentId_code: { departmentId: subject.departmentId, code } },
  });
  if (existing && existing.id !== subject.id) {
    throw new HttpError(409, "A subject with this code already exists in the department.");
  }

  const updated = await prisma.subject.update({
    where: { id: subject.id },
    data: { name, code, isLab },
  });
  res.json(updated);
}

export async function deleteSubject(req: Request, res: Response): Promise<void> {
  const subjectId = routeId(req.params.subjectId);
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { _count: { select: { assignments: true } } },
  });
  if (!subject) {
    throw new HttpError(404, "Subject not found.");
  }
  if (subject._count.assignments > 0) {
    throw new HttpError(409, "Cannot delete this subject because existing assignments reference it.");
  }

  await prisma.subject.delete({ where: { id: subject.id } });
  const { _count: _ignored, ...record } = subject;
  res.json(record);
}

function routeId(value: string | string[] | undefined): string {
  return requireText(Array.isArray(value) ? value[0] : value, "subjectId");
}
