-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('CLASSROOM', 'LAB');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ConflictReasonCode" AS ENUM ('FACULTY_UNAVAILABLE', 'FACULTY_CONFLICT', 'DIVISION_CONFLICT', 'CLASSROOM_CONFLICT', 'ROOM_CAPACITY', 'LAB_ROOM_REQUIRED', 'INSUFFICIENT_CANDIDATE_SLOTS', 'PERIODS_EXCEED_GRID');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacultyAvailability" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "period" INTEGER NOT NULL,

    CONSTRAINT "FacultyAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isLab" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" TEXT NOT NULL,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL,
    "generationRunId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "period" INTEGER NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictReport" (
    "id" TEXT NOT NULL,
    "generationRunId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "reasonCode" "ConflictReasonCode" NOT NULL,
    "requiredPeriods" INTEGER NOT NULL,
    "compatiblePeriods" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "possibleActions" TEXT[],
    "evidence" JSONB NOT NULL,

    CONSTRAINT "ConflictReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_email_key" ON "Faculty"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyAvailability_facultyId_dayOfWeek_period_key" ON "FacultyAvailability"("facultyId", "dayOfWeek", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_departmentId_code_key" ON "Subject"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Division_departmentId_name_key" ON "Division"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_name_key" ON "Classroom"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_subjectId_divisionId_key" ON "Assignment"("subjectId", "divisionId");

-- CreateIndex
CREATE INDEX "TimetableSlot_generationRunId_divisionId_idx" ON "TimetableSlot"("generationRunId", "divisionId");

-- CreateIndex
CREATE INDEX "TimetableSlot_generationRunId_facultyId_idx" ON "TimetableSlot"("generationRunId", "facultyId");

-- CreateIndex
CREATE INDEX "TimetableSlot_generationRunId_classroomId_idx" ON "TimetableSlot"("generationRunId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_generationRunId_divisionId_dayOfWeek_period_key" ON "TimetableSlot"("generationRunId", "divisionId", "dayOfWeek", "period");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_generationRunId_facultyId_dayOfWeek_period_key" ON "TimetableSlot"("generationRunId", "facultyId", "dayOfWeek", "period");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSlot_generationRunId_classroomId_dayOfWeek_period_key" ON "TimetableSlot"("generationRunId", "classroomId", "dayOfWeek", "period");

-- CreateIndex
CREATE INDEX "ConflictReport_generationRunId_idx" ON "ConflictReport"("generationRunId");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacultyAvailability" ADD CONSTRAINT "FacultyAvailability_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictReport" ADD CONSTRAINT "ConflictReport_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictReport" ADD CONSTRAINT "ConflictReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraints. Weekly periods exist only on Assignment.
ALTER TABLE "FacultyAvailability" ADD CONSTRAINT "FacultyAvailability_period_check" CHECK ("period" >= 1 AND "period" <= 6);

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_periodsPerWeek_check" CHECK ("periodsPerWeek" > 0);

ALTER TABLE "Division" ADD CONSTRAINT "Division_studentCount_check" CHECK ("studentCount" > 0);

ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_capacity_check" CHECK ("capacity" > 0);

ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_period_check" CHECK ("period" >= 1 AND "period" <= 6);
