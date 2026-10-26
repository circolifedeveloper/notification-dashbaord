import express from "express";
import { enums } from "../controllers/lookupController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/enums", requireAuth, enums);

export default router;
