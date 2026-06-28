import { randomInt } from "node:crypto";

import { ItRequestModel } from "./request.model";

const maxGenerationAttempts = 8;

export async function generateRequestCode(): Promise<string> {
  for (let attempt = 0; attempt < maxGenerationAttempts; attempt += 1) {
    const candidate = createRequestCodeCandidate();
    const existingRequest = await ItRequestModel.exists({ requestCode: candidate });

    if (!existingRequest) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique request code");
}

function createRequestCodeCandidate(): string {
  const now = new Date();
  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0")
  ].join("");
  const randomPart = randomInt(100000, 1000000);

  return `REQ-${datePart}-${randomPart}`;
}
