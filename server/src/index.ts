import "dotenv/config";

import cors from "cors";
import express from "express";

import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./prisma/client";
import { assignmentRouter } from "./routes/assignment.routes";
import { availabilityRouter } from "./routes/availability.routes";
import { classroomRouter } from "./routes/classroom.routes";
import { divisionRouter } from "./routes/division.routes";
import { facultyRouter } from "./routes/faculty.routes";
import { subjectRouter } from "./routes/subject.routes";
import { timetableRouter } from "./routes/timetable.routes";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: /^http:\/\/localhost:\d+$/ }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/departments", async (_req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
    res.json(departments);
  } catch (error) {
    next(error);
  }
});

app.use("/api/faculty", availabilityRouter);
app.use("/api/faculty", facultyRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/divisions", divisionRouter);
app.use("/api/classrooms", classroomRouter);
app.use("/api/assignments", assignmentRouter);
app.use("/api", timetableRouter);

app.use(errorHandler);

async function main(): Promise<void> {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`SmartSchedule API listening on port ${port}`);
  });
}

main().catch(async (error: unknown) => {
  console.error("SmartSchedule failed to start");
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
