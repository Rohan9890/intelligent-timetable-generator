import { Router } from "express";

import { createAssignment, deleteAssignment, listAssignments, updateAssignment } from "../controllers/assignment.controller";
import { asyncRoute } from "./asyncRoute";

export const assignmentRouter = Router();

assignmentRouter.get("/", asyncRoute(listAssignments));
assignmentRouter.post("/", asyncRoute(createAssignment));
assignmentRouter.put("/:assignmentId", asyncRoute(updateAssignment));
assignmentRouter.delete("/:assignmentId", asyncRoute(deleteAssignment));
