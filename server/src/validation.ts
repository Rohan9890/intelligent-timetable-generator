import { PERIOD_NUMBERS, WEEKLY_PERIOD_CAPACITY, WORKING_DAYS } from "./config/schedule";
import { HttpError } from "./middleware/errorHandler";

export function requireObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

export function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${label} is required.`);
  }
  return value.trim();
}

export function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new HttpError(400, `${label} must be true or false.`);
  }
  return value;
}

export function requirePositiveInt(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, `${label} must be a positive integer.`);
  }
  return value;
}

export function requirePeriodsPerWeek(value: unknown): number {
  const periods = requirePositiveInt(value, "periodsPerWeek");
  if (periods > WEEKLY_PERIOD_CAPACITY) {
    throw new HttpError(400, `periodsPerWeek must be ${WEEKLY_PERIOD_CAPACITY} or fewer.`);
  }
  return periods;
}

export function requireRoomType(value: unknown): "CLASSROOM" | "LAB" {
  if (value !== "CLASSROOM" && value !== "LAB") {
    throw new HttpError(400, "roomType must be CLASSROOM or LAB.");
  }
  return value;
}

export function requireDayOfWeek(value: unknown): (typeof WORKING_DAYS)[number] {
  if (typeof value !== "string" || !WORKING_DAYS.includes(value as (typeof WORKING_DAYS)[number])) {
    throw new HttpError(400, "dayOfWeek must be MONDAY, TUESDAY, WEDNESDAY, THURSDAY, or FRIDAY.");
  }
  return value as (typeof WORKING_DAYS)[number];
}

export function requirePeriod(value: unknown): number {
  if (typeof value !== "number" || !PERIOD_NUMBERS.includes(value as (typeof PERIOD_NUMBERS)[number])) {
    throw new HttpError(400, "period must be an integer from 1 to 6.");
  }
  return value;
}
