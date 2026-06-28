import pinoHttp from "pino-http";

import { logger } from "../shared/logger/logger";

export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        remoteAddress: req.remoteAddress,
        url: req.url,
        userAgent: req.headers["user-agent"]
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  },
  customProps: (_req, res) => ({
    requestId: (res as unknown as { locals?: { requestId?: string } }).locals?.requestId
  })
});
