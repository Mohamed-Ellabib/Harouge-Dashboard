import type { Router } from "express";

export interface ApiModule {
  readonly mountPath: string;
  readonly name: string;
  readonly router: Router;
}
