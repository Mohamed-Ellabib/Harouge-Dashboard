import { uploadFilesWorkflow } from "@medusajs/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../_utils/merchant-store-context";

const MAX_FILES_PER_UPLOAD = 6;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type MerchantUploadBody = {
  files?: unknown;
};

const invalid = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message);
};

const normalizedFiles = (value: unknown) => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_FILES_PER_UPLOAD
  ) {
    return invalid("Upload between 1 and 6 Product images at a time.");
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return invalid(`Product image ${index + 1} is invalid.`);
    }

    const candidate = entry as Record<string, unknown>;
    const filename =
      typeof candidate.filename === "string" ? candidate.filename.trim() : "";
    const mimeType =
      typeof candidate.mime_type === "string"
        ? candidate.mime_type.trim().toLowerCase()
        : "";
    const content =
      typeof candidate.content === "string" ? candidate.content.trim() : "";

    if (
      !filename ||
      filename.length > 200 ||
      filename.includes("/") ||
      filename.includes("\\") ||
      !ALLOWED_IMAGE_TYPES.has(mimeType) ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(content)
    ) {
      return invalid(`Product image ${index + 1} is invalid.`);
    }

    const decoded = Buffer.from(content, "base64");
    if (!decoded.length || decoded.length > MAX_FILE_BYTES) {
      return invalid(`Product image ${index + 1} exceeds the 4 MB limit.`);
    }

    return {
      filename,
      mimeType,
      content,
      access: "public" as const,
    };
  });
};

export async function POST(
  req: MedusaRequest<MerchantUploadBody>,
  res: MedusaResponse,
) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "products.write");
  const files = normalizedFiles(req.body?.files);
  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: { files },
  });

  return res.json({
    files: result.map((file) => ({ id: file.id, url: file.url })),
  });
}
