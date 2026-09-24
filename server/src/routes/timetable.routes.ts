import { Router } from "express";

import { editTimetableSlot, generateTimetable, getHistory, getTimetable } from "../controllers/timetable.controller";
import { asyncRoute } from "./asyncRoute";

export const timetableRouter = Router();

timetableRouter.post("/generate", asyncRoute(generateTimetable));
timetableRouter.get("/timetable", asyncRoute(getTimetable));
timetableRouter.get("/generations", asyncRoute(getHistory));
timetableRouter.patch("/timetable/slots/:slotId", asyncRoute(editTimetableSlot));
