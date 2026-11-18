import { Router } from "express";
import { handleMoolreWebhook } from "../controllers/webhook.controller";
import { webhookRateLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/moolre", webhookRateLimiter, handleMoolreWebhook);

export default router;
