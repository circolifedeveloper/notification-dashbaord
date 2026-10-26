import express from "express";
import { logout, me, sendOtp, verifyOtp } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/security.js";

const router = express.Router();

router.post("/send-otp", authLimiter, sendOtp);
router.post("/verify-otp", authLimiter, verifyOtp);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

export default router;
