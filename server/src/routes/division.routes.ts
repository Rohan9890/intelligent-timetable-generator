import { Router } from "express";

import { createDivision, deleteDivision, listDivisions, updateDivision } from "../controllers/division.controller";
import { asyncRoute } from "./asyncRoute";

export const divisionRouter = Router();

divisionRouter.get("/", asyncRoute(listDivisions));
divisionRouter.post("/", asyncRoute(createDivision));
divisionRouter.put("/:divisionId", asyncRoute(updateDivision));
divisionRouter.delete("/:divisionId", asyncRoute(deleteDivision));
