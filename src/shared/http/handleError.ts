import {
  ForeignKeyConstraintViolationException,
  NotFoundError,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { NextFunction, Request, Response } from "express";
import { logger } from "../logger.js";

// Traduce los errores más comunes del ORM a códigos HTTP adecuados,
// para no responder 500 cuando en realidad es un 404 o un 409.
export function handleError(res: Response, error: unknown, message: string) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ message: "Recurso no encontrado" });
  }
  if (error instanceof ForeignKeyConstraintViolationException) {
    return res.status(409).json({
      // Se da al borrar algo que está en uso o al referenciar un id inexistente
      message: "Conflicto con registros relacionados",
    });
  }
  if (error instanceof UniqueConstraintViolationException) {
    return res.status(409).json({ message: "El recurso ya existe" });
  }

  logger.error(message, error);
  return res.status(500).json({ message });
}

// Último middleware de la app: captura lo que llega por next(error)
// o por express-async-errors y siempre responde JSON.
export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  return handleError(res, error, "Error interno del servidor");
}
