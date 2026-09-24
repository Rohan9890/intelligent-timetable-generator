import type { Request, Response } from "express";

import { prisma } from "../prisma/client";
import { HttpError } from "../middleware/errorHandler";
import { requireObject, requirePositiveInt, requireRoomType, requireText } from "../validation";

export async function listClassrooms(_req: Request, res: Response): Promise<void> {
  const classrooms = await prisma.classroom.findMany({ orderBy: { name: "asc" } });
  res.json(classrooms);
}

export async function createClassroom(req: Request, res: Response): Promise<void> {
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const capacity = requirePositiveInt(body.capacity, "capacity");
  const roomType = requireRoomType(body.roomType);

  const existing = await prisma.classroom.findUnique({ where: { name } });
  if (existing) {
    throw new HttpError(409, "A classroom with this name already exists.");
  }

  const classroom = await prisma.classroom.create({ data: { name, capacity, roomType } });
  res.status(201).json(classroom);
}

export async function updateClassroom(req: Request, res: Response): Promise<void> {
  const classroomId = routeId(req.params.classroomId);
  const body = requireObject(req.body);
  const name = requireText(body.name, "name");
  const capacity = requirePositiveInt(body.capacity, "capacity");
  const roomType = requireRoomType(body.roomType);

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) {
    throw new HttpError(404, "Classroom not found.");
  }

  const existing = await prisma.classroom.findUnique({ where: { name } });
  if (existing && existing.id !== classroom.id) {
    throw new HttpError(409, "A classroom with this name already exists.");
  }

  const updated = await prisma.classroom.update({
    where: { id: classroom.id },
    data: { name, capacity, roomType },
  });
  res.json(updated);
}

export async function deleteClassroom(req: Request, res: Response): Promise<void> {
  const classroomId = routeId(req.params.classroomId);
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: { _count: { select: { slots: true } } },
  });
  if (!classroom) {
    throw new HttpError(404, "Classroom not found.");
  }
  if (classroom._count.slots > 0) {
    throw new HttpError(409, "Cannot delete this classroom because timetable slots reference it.");
  }

  await prisma.classroom.delete({ where: { id: classroom.id } });
  const { _count: _ignored, ...record } = classroom;
  res.json(record);
}

function routeId(value: string | string[] | undefined): string {
  return requireText(Array.isArray(value) ? value[0] : value, "classroomId");
}
