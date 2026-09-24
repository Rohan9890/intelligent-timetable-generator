import { Router } from "express";

import { getAvailability, replaceAvailability } from "../controllers/availability.controller";
import { asyncRoute } from "./asyncRoute";

export const availabilityRouter = Router();

availabilityRouter.get("/:facultyId/availability", asyncRoute(getAvailability));
availabilityRouter.put("/:facultyId/availability", asyncRoute(replaceAvailability));
