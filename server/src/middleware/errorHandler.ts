import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ error: "A record with this value already exists." });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: "Record not found." });
      return;
    }
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Request body must be valid JSON." });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
};
