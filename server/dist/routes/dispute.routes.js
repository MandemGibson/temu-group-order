"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dispute_controller_1 = require("../controllers/dispute.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post("/pool-joins/:id/disputes", auth_1.requireAuth, dispute_controller_1.createDispute);
exports.default = router;
