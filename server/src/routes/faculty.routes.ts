import { Router } from "express";

import { createFaculty, deleteFaculty, listFaculty, updateFaculty } from "../controllers/faculty.controller";
import { asyncRoute } from "./asyncRoute";

export const facultyRouter = Router();

facultyRouter.get("/", asyncRoute(listFaculty));
facultyRouter.post("/", asyncRoute(createFaculty));
facultyRouter.put("/:facultyId", asyncRoute(updateFaculty));
facultyRouter.delete("/:facultyId", asyncRoute(deleteFaculty));
