import type { Request, Response } from "express";

import { HttpError } from "../middleware/errorHandler";
import { generateForDepartment, getActiveTimetable, getGenerationHistory } from "../services/generation.service";
import { updateTimetableSlot } from "../services/slotEdit.service";
import { requireDayOfWeek, requireObject, requirePeriod, requireText } from "../validation";

export async function generateTimetable(req: Request, res: Response): Promise<void> {
  const body = requireObject(req.body);
  if (body.departmentId === undefined) {
    throw new HttpError(400, "departmentId is required.");
  }
  const departmentId = requireText(body.departmentId, "departmentId");
  const result = await generateForDepartment(departmentId);
  res.status(result.success ? 200 : 200).json(result);
}

export async function getTimetable(req: Request, res: Response): Promise<void> {
  const departmentId = req.query.departmentId;
  if (typeof departmentId !== "string" || departmentId.trim() === "") {
    throw new HttpError(400, "departmentId query parameter is required.");
  }
  const timetable = await getActiveTimetable(departmentId.trim());
  res.json(timetable);
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const departmentId = req.query.departmentId;
  if (typeof departmentId !== "string" || departmentId.trim() === "") {
    throw new HttpError(400, "departmentId query parameter is required.");
  }
  const history = await getGenerationHistory(departmentId.trim());
  res.json(history);
}

export async function editTimetableSlot(req: Request, res: Response): Promise<void> {
  const slotId = Array.isArray(req.params.slotId) ? req.params.slotId[0] ?? "" : req.params.slotId;
  const body = requireObject(req.body);
  await updateTimetableSlot(slotId, {
    dayOfWeek: requireDayOfWeek(body.dayOfWeek),
    period: requirePeriod(body.period),
    classroomId: requireText(body.classroomId, "classroomId"),
  });
  res.json({ success: true });
}
