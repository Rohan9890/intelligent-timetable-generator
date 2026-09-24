import { DayOfWeek, PrismaClient, RoomType } from "@prisma/client";

import { WEEKLY_PERIOD_CAPACITY } from "../src/config/schedule";

const prisma = new PrismaClient();

/**
 * Seed scenarios are separated by department.
 * Rooms are college-wide, so Phase 2 should generate one department at a time.
 * A combined run is impossible because IMPOSSIBLE_DEMO cannot be placed.
 * No generation runs, timetable slots, or conflict reports are created here.
 *
 * SOLVABLE_DEMO — department code CE (Computer Engineering)
 * Realistic input sized to fit the Monday–Friday, 6-period grid (30 periods).
 * Each division needs 17 periods. The busiest faculty teaches 8 periods.
 * Availability exceptions remove only a few periods.
 * CE-A (60 students) fits CR-101, CR-102, and LAB-A (all capacity 70).
 * CE-B (45 students) fits every classroom and both CE labs.
 *
 * IMPOSSIBLE_DEMO — department code IT (Information Technology)
 * IT-A has 120 students and a Computer Networks Lab assignment (2 periods).
 * The faculty member has no availability exceptions, and 2 periods fit the grid.
 * The largest lab in the database is LAB-A with capacity 70.
 * LAB-IT (capacity 36) is also too small.
 * No lab satisfies room capacity, so this assignment cannot be scheduled.
 */

const SOLVABLE_DEPARTMENT = {
  name: "Computer Engineering",
  code: "CE",
} as const;

const IMPOSSIBLE_DEPARTMENT = {
  name: "Information Technology",
  code: "IT",
} as const;

async function main(): Promise<void> {
  await prisma.conflictReport.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.generationRun.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.facultyAvailability.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.division.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.department.deleteMany();

  const computerEngineering = await prisma.department.create({
    data: {
      ...SOLVABLE_DEPARTMENT,
      faculty: {
        create: [
          { name: "Dr. Anita Deshmukh", email: "anita.deshmukh@college.test" },
          { name: "Prof. Rahul Kulkarni", email: "rahul.kulkarni@college.test" },
          { name: "Dr. Meera Iyer", email: "meera.iyer@college.test" },
          { name: "Prof. Sanjay Patil", email: "sanjay.patil@college.test" },
          { name: "Dr. Neha Joshi", email: "neha.joshi@college.test" },
        ],
      },
      subjects: {
        create: [
          { name: "Data Structures", code: "DS", isLab: false },
          { name: "Database Management Systems", code: "DBMS", isLab: false },
          { name: "DBMS Lab", code: "DBMS-LAB", isLab: true },
          { name: "Engineering Mathematics", code: "MATH", isLab: false },
          { name: "Operating Systems", code: "OS", isLab: false },
        ],
      },
      divisions: {
        create: [
          { name: "CE-A", studentCount: 60 },
          { name: "CE-B", studentCount: 45 },
        ],
      },
    },
    include: { faculty: true, subjects: true, divisions: true },
  });

  const informationTechnology = await prisma.department.create({
    data: {
      ...IMPOSSIBLE_DEPARTMENT,
      faculty: {
        create: [{ name: "Prof. Kavita Menon", email: "kavita.menon@college.test" }],
      },
      subjects: {
        create: [{ name: "Computer Networks Lab", code: "CN-LAB", isLab: true }],
      },
      divisions: {
        create: [{ name: "IT-A", studentCount: 120 }],
      },
    },
    include: { faculty: true, subjects: true, divisions: true },
  });

  await prisma.classroom.createMany({
    data: [
      { name: "CR-101", capacity: 70, roomType: RoomType.CLASSROOM },
      { name: "CR-102", capacity: 70, roomType: RoomType.CLASSROOM },
      { name: "CR-103", capacity: 50, roomType: RoomType.CLASSROOM },
      { name: "LAB-A", capacity: 70, roomType: RoomType.LAB },
      { name: "LAB-B", capacity: 50, roomType: RoomType.LAB },
      { name: "LAB-IT", capacity: 36, roomType: RoomType.LAB },
    ],
  });

  const ceFaculty = byEmail(computerEngineering.faculty);
  const ceSubject = byCode(computerEngineering.subjects);
  const ceDivision = byName(computerEngineering.divisions);

  await prisma.facultyAvailability.createMany({
    data: [
      { facultyId: ceFaculty["anita.deshmukh@college.test"].id, dayOfWeek: DayOfWeek.MONDAY, period: 1 },
      { facultyId: ceFaculty["anita.deshmukh@college.test"].id, dayOfWeek: DayOfWeek.MONDAY, period: 2 },
      { facultyId: ceFaculty["rahul.kulkarni@college.test"].id, dayOfWeek: DayOfWeek.FRIDAY, period: 6 },
      { facultyId: ceFaculty["meera.iyer@college.test"].id, dayOfWeek: DayOfWeek.WEDNESDAY, period: 3 },
      { facultyId: ceFaculty["sanjay.patil@college.test"].id, dayOfWeek: DayOfWeek.TUESDAY, period: 1 },
      { facultyId: ceFaculty["neha.joshi@college.test"].id, dayOfWeek: DayOfWeek.THURSDAY, period: 5 },
      { facultyId: ceFaculty["neha.joshi@college.test"].id, dayOfWeek: DayOfWeek.THURSDAY, period: 6 },
    ],
  });

  const solvableAssignments = [
    assignment(ceSubject.DS, ceDivision["CE-A"], ceFaculty["anita.deshmukh@college.test"], 4),
    assignment(ceSubject.DBMS, ceDivision["CE-A"], ceFaculty["rahul.kulkarni@college.test"], 4),
    assignment(ceSubject["DBMS-LAB"], ceDivision["CE-A"], ceFaculty["meera.iyer@college.test"], 2),
    assignment(ceSubject.MATH, ceDivision["CE-A"], ceFaculty["sanjay.patil@college.test"], 4),
    assignment(ceSubject.OS, ceDivision["CE-A"], ceFaculty["neha.joshi@college.test"], 3),
    assignment(ceSubject.DS, ceDivision["CE-B"], ceFaculty["anita.deshmukh@college.test"], 4),
    assignment(ceSubject.DBMS, ceDivision["CE-B"], ceFaculty["rahul.kulkarni@college.test"], 4),
    assignment(ceSubject["DBMS-LAB"], ceDivision["CE-B"], ceFaculty["meera.iyer@college.test"], 2),
    assignment(ceSubject.MATH, ceDivision["CE-B"], ceFaculty["sanjay.patil@college.test"], 4),
    assignment(ceSubject.OS, ceDivision["CE-B"], ceFaculty["neha.joshi@college.test"], 3),
  ];

  const itFaculty = informationTechnology.faculty[0];
  const itSubject = informationTechnology.subjects[0];
  const itDivision = informationTechnology.divisions[0];

  const impossibleAssignments = [
    assignment(itSubject, itDivision, itFaculty, 2),
  ];

  const assignments = [...solvableAssignments, ...impossibleAssignments];

  for (const item of assignments) {
    if (item.periodsPerWeek > WEEKLY_PERIOD_CAPACITY) {
      throw new Error(
        `Assignment exceeds the ${WEEKLY_PERIOD_CAPACITY}-period weekly grid.`,
      );
    }
  }

  await prisma.assignment.createMany({ data: assignments });

  const [departmentCount, facultyCount, availabilityCount, subjectCount, divisionCount, classroomCount, assignmentCount, slotCount] =
    await Promise.all([
      prisma.department.count(),
      prisma.faculty.count(),
      prisma.facultyAvailability.count(),
      prisma.subject.count(),
      prisma.division.count(),
      prisma.classroom.count(),
      prisma.assignment.count(),
      prisma.timetableSlot.count(),
    ]);

  console.log("Seed complete.");
  console.log(`Departments: ${departmentCount} (CE solvable, IT impossible)`);
  console.log(`Faculty: ${facultyCount}`);
  console.log(`Availability exceptions: ${availabilityCount}`);
  console.log(`Subjects: ${subjectCount}`);
  console.log(`Divisions: ${divisionCount}`);
  console.log(`Classrooms: ${classroomCount}`);
  console.log(`Assignments: ${assignmentCount}`);
  console.log(`Timetable slots: ${slotCount}`);
}

function assignment(
  subject: { id: string },
  division: { id: string },
  faculty: { id: string },
  periodsPerWeek: number,
) {
  return {
    subjectId: subject.id,
    divisionId: division.id,
    facultyId: faculty.id,
    periodsPerWeek,
  };
}

function byEmail<T extends { email: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((row) => [row.email, row]));
}

function byCode<T extends { code: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((row) => [row.code, row]));
}

function byName<T extends { name: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((row) => [row.name, row]));
}

main()
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
