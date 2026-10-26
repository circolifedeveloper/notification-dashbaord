import express from "express";
import { audiencePreview } from "../controllers/lookupController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/preview", requireAuth, audiencePreview);

export default router;
