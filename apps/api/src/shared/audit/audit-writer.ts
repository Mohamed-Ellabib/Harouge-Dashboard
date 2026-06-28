import { env } from "../../config/env";
import { logger } from "../logger/logger";
import type { AuditEvent } from "./audit.types";

export interface AuditWriter {
  record(event: AuditEvent): Promise<void>;
}

class NoopAuditWriter implements AuditWriter {
  public async record(event: AuditEvent): Promise<void> {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    logger.debug({ auditEvent: event }, "Audit writer is not configured yet");
  }
}

let auditWriter: AuditWriter = new NoopAuditWriter();

export function setAuditWriter(writer: AuditWriter): void {
  auditWriter = writer;
}

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  await auditWriter.record(event);
}
