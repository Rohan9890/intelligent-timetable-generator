import type { Request, Response } from "express";

import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../prisma/client";
import { requireDayOfWeek, requireObject, requirePeriod } from "../validation";

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const facultyId = routeParam(req.params.facultyId);
  await assertFaculty(facultyId);
  const unavailable = await prisma.facultyAvailability.findMany({
    where: { facultyId },
    orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
    select: { dayOfWeek: true, period: true },
  });
  res.json({ facultyId, unavailable });
}

export async function replaceAvailability(req: Request, res: Response): Promise<void> {
  const facultyId = routeParam(req.params.facultyId);
  await assertFaculty(facultyId);
  const body = requireObject(req.body);
  if (!Array.isArray(body.unavailable)) {
    throw new HttpError(400, "unavailable must be an array.");
  }

  const seen = new Set<string>();
  const unavailable = body.unavailable.map((entry) => {
    if (entry === null || typeof entry !== "object") {
      throw new HttpError(400, "Each availability entry must be an object.");
    }
    const row = entry as Record<string, unknown>;
    const dayOfWeek = requireDayOfWeek(row.dayOfWeek);
    const period = requirePeriod(row.period);
    const key = `${dayOfWeek}:${period}`;
    if (seen.has(key)) {
      throw new HttpError(400, "Duplicate day and period in availability.");
    }
    seen.add(key);
    return { facultyId, dayOfWeek, period };
  });

  await prisma.$transaction([
    prisma.facultyAvailability.deleteMany({ where: { facultyId } }),
    prisma.facultyAvailability.createMany({ data: unavailable }),
  ]);

  res.json({ facultyId, unavailable: unavailable.map(({ dayOfWeek, period }) => ({ dayOfWeek, period })) });
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

async function assertFaculty(facultyId: string): Promise<void> {
  const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
  if (!faculty) {
    throw new HttpError(404, "Faculty not found.");
  }
}
