import { Router } from "express";

import { createClassroom, deleteClassroom, listClassrooms, updateClassroom } from "../controllers/classroom.controller";
import { asyncRoute } from "./asyncRoute";

export const classroomRouter = Router();

classroomRouter.get("/", asyncRoute(listClassrooms));
classroomRouter.post("/", asyncRoute(createClassroom));
classroomRouter.put("/:classroomId", asyncRoute(updateClassroom));
classroomRouter.delete("/:classroomId", asyncRoute(deleteClassroom));
