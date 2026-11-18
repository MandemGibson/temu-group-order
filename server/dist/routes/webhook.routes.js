"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_controller_1 = require("../controllers/webhook.controller");
const rate_limit_1 = require("../middleware/rate-limit");
const router = (0, express_1.Router)();
router.post("/moolre", rate_limit_1.webhookRateLimiter, webhook_controller_1.handleMoolreWebhook);
exports.default = router;
