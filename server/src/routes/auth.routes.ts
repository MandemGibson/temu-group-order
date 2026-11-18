import { Router } from "express";
import {
  requestOtp,
  verifyOtp,
  getMe,
  submitLeaderApplication,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { otpRateLimiter } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";
import { requestOtpSchema, verifyOtpSchema } from "../validators/schemas";

const router = Router();

router.post(
  "/otp/request",
  otpRateLimiter,
  validate({ body: requestOtpSchema }),
  requestOtp
);
router.post(
  "/otp/verify",
  validate({ body: verifyOtpSchema }),
  verifyOtp
);
router.get("/me", requireAuth, getMe);
router.post("/leader-application", requireAuth, submitLeaderApplication);

export default router;
