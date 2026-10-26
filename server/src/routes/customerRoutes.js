import express from "express";
import { customers } from "../controllers/lookupController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, customers);

export default router;
