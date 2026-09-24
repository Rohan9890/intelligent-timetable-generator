import { Router } from "express";

import { createSubject, deleteSubject, listSubjects, updateSubject } from "../controllers/subject.controller";
import { asyncRoute } from "./asyncRoute";

export const subjectRouter = Router();

subjectRouter.get("/", asyncRoute(listSubjects));
subjectRouter.post("/", asyncRoute(createSubject));
subjectRouter.put("/:subjectId", asyncRoute(updateSubject));
subjectRouter.delete("/:subjectId", asyncRoute(deleteSubject));
