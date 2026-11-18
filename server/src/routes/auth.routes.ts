import { Router } from "express";
import {
  requestOtp,
  verifyOtp,
  getMe,
  submitLeaderApplication,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { otpRateLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/otp/request", otpRateLimiter, requestOtp);
router.post("/otp/verify", verifyOtp);
router.get("/me", requireAuth, getMe);
router.post("/leader-application", requireAuth, submitLeaderApplication);

export default router;
