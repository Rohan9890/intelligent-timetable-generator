import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../prisma/client";
import {
  buildUnavailableSet,
  isFacultyAvailable,
  isRoomSuitable,
  requiredRoomType,
} from "./scheduler/constraints";
import type { DayOfWeek } from "./scheduler/types";

const DAY_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export async function updateTimetableSlot(
  slotId: string,
  input: { dayOfWeek: DayOfWeek; period: number; classroomId: string },
): Promise<void> {
  const slot = await prisma.timetableSlot.findUnique({
    where: { id: slotId },
    include: {
      generationRun: true,
      division: true,
      faculty: { include: { unavailable: true } },
      assignment: { include: { subject: true } },
    },
  });
  if (!slot || !slot.generationRun.isActive || slot.generationRun.status !== "SUCCESS") {
    throw new HttpError(404, "Timetable slot not found.");
  }

  const classroom = await prisma.classroom.findUnique({ where: { id: input.classroomId } });
  if (!classroom) {
    throw new HttpError(404, "Classroom not found.");
  }

  const subject = slot.assignment.subject;
  const dayLabel = `${DAY_LABEL[input.dayOfWeek]} period ${input.period}`;
  const unavailable = buildUnavailableSet(
    slot.faculty.unavailable.map((row) => ({
      facultyId: row.facultyId,
      dayOfWeek: row.dayOfWeek,
      period: row.period,
    })),
  );

  if (!isFacultyAvailable(unavailable, slot.facultyId, input.dayOfWeek, input.period)) {
    throw new HttpError(400, `${slot.faculty.name} is unavailable on ${dayLabel}.`);
  }

  if (!isRoomSuitable(classroom, subject, slot.division)) {
    if (classroom.roomType !== requiredRoomType(subject)) {
      throw new HttpError(
        400,
        subject.isLab
          ? `${subject.name} is a lab and can only be placed in a lab room.`
          : `${subject.name} is a theory subject and can only be placed in a classroom.`,
      );
    }
    throw new HttpError(
      400,
      `${classroom.name} holds ${classroom.capacity} students, which is fewer than ${slot.division.name}'s ${slot.division.studentCount} students.`,
    );
  }

  const others = await prisma.timetableSlot.findMany({
    where: { generationRunId: slot.generationRunId, NOT: { id: slot.id } },
  });
  const sameTime = others.filter(
    (other) => other.dayOfWeek === input.dayOfWeek && other.period === input.period,
  );
  if (sameTime.some((other) => other.facultyId === slot.facultyId)) {
    throw new HttpError(400, `${slot.faculty.name} already teaches another class on ${dayLabel}.`);
  }
  if (sameTime.some((other) => other.divisionId === slot.divisionId)) {
    throw new HttpError(400, `${slot.division.name} already has another class on ${dayLabel}.`);
  }
  if (sameTime.some((other) => other.classroomId === classroom.id)) {
    throw new HttpError(400, `${classroom.name} is already in use on ${dayLabel}.`);
  }

  await prisma.timetableSlot.update({
    where: { id: slot.id },
    data: {
      dayOfWeek: input.dayOfWeek,
      period: input.period,
      classroomId: classroom.id,
      isManual: true,
    },
  });
}
