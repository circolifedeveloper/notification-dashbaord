import express from "express";
import { approve, create, detail, list, reject, stats, update } from "../controllers/broadcastController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { DASHBOARD_ROLES } from "../constants.js";

const router = express.Router();
const anyDashboardRole = requireRole(DASHBOARD_ROLES.ADMIN, DASHBOARD_ROLES.SUPER_ADMIN);
const superAdminOnly = requireRole(DASHBOARD_ROLES.SUPER_ADMIN);

router.use(requireAuth, anyDashboardRole);

router.get("/stats", stats);
router.get("/", list);
router.post("/", create);
router.get("/:id", detail);
router.patch("/:id", update);
router.post("/:id/approve", superAdminOnly, approve);
router.post("/:id/reject", superAdminOnly, reject);

export default router;
