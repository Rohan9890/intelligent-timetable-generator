export const WORKING_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const;

export type WorkingDay = (typeof WORKING_DAYS)[number];

export const PERIODS_PER_DAY = 6;

export const PERIOD_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export const WEEKLY_PERIOD_CAPACITY = WORKING_DAYS.length * PERIODS_PER_DAY;
