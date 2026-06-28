import type { RequestHandler, Response } from "express";
import type { z } from "zod";

export type RequestValidationPart = "body" | "params" | "query";

export type RequestValidationSchemas = Partial<
  Record<RequestValidationPart, z.ZodType<unknown>>
>;

export type ValidatedRequestData = Partial<Record<RequestValidationPart, unknown>>;

export function validateRequest(schemas: RequestValidationSchemas): RequestHandler {
  return (req, res, next) => {
    try {
      const validated: ValidatedRequestData = {};

      if (schemas.body) {
        validated.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        validated.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        validated.query = schemas.query.parse(req.query);
      }

      res.locals.validated = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getValidated<TValue>(
  res: Response,
  part: RequestValidationPart
): TValue {
  return (res.locals.validated as ValidatedRequestData | undefined)?.[part] as TValue;
}
