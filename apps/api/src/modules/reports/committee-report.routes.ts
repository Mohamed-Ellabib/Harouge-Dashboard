import path from "node:path";
import { Router } from "express";
import { requirePermission } from "../../middleware/authorization";

export const committeeReportRouter = Router();

committeeReportRouter.get(
  "/erp-development-2026-09-02/pages/:page",
  requirePermission({ action: "view", module: "dashboard" }),
  (req, res, next) => {
    const page = req.params.page;
    if (page !== "1" && page !== "2") {
      res.status(404).json({ success: false, message: "Report page not found." });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(
      `erp-report-2026-09-02-page-${page}.png`,
      { root: path.resolve(__dirname, "../../../assets/committee-reports") },
      (error) => { if (error) next(error); }
    );
  }
);
