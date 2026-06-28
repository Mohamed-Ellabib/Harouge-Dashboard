import { randomInt } from "node:crypto";

import { TaskModel } from "./task.model";

const maxGenerationAttempts = 8;

export async function generateTaskCode(): Promise<string> {
  for (let attempt = 0; attempt < maxGenerationAttempts; attempt += 1) {
    const candidate = createTaskCodeCandidate();
    const existingTask = await TaskModel.exists({ taskCode: candidate });

    if (!existingTask) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique task code");
}

function createTaskCodeCandidate(): string {
  const now = new Date();
  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0")
  ].join("");
  const randomPart = randomInt(100000, 1000000);

  return `TASK-${datePart}-${randomPart}`;
}
