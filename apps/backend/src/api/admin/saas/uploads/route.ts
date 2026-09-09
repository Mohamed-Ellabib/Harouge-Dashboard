import { uploadFilesWorkflow } from "@medusajs/core-flows"
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { getPlatformSuperAdminActor } from "../../../_utils/platform-super-admin"

const MAX_FILE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

const invalid = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  const candidate = (req.body as any)?.file
  if (!candidate || typeof candidate !== "object") {
    return invalid("Choose a JPG, PNG, or WebP image.")
  }
  const filename = typeof candidate.filename === "string" ? candidate.filename.trim() : ""
  const mimeType = typeof candidate.mime_type === "string" ? candidate.mime_type.trim().toLowerCase() : ""
  const content = typeof candidate.content === "string" ? candidate.content.trim() : ""
  if (
    !filename ||
    filename.length > 200 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    !ALLOWED_TYPES.has(mimeType) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(content)
  ) {
    return invalid("Choose a valid JPG, PNG, or WebP image.")
  }
  const decoded = Buffer.from(content, "base64")
  if (!decoded.length || decoded.length > MAX_FILE_BYTES) {
    return invalid("The image must be 2 MB or smaller.")
  }
  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: { files: [{ filename, mimeType, content, access: "public" }] },
  })
  res.setHeader("Cache-Control", "no-store")
  return res.status(201).json({ file: { id: result[0].id, url: result[0].url } })
}
