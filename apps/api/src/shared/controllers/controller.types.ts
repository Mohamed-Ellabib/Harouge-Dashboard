import type { NextFunction, Request, Response } from "express";

export type ControllerHandler<TRequest extends Request = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export interface ControllerModule {
  readonly name: string;
}
