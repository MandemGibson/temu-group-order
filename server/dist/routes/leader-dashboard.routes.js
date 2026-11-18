"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leader_dashboard_controller_1 = require("../controllers/leader-dashboard.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/dashboard", auth_1.requireAuth, auth_1.requireLeader, leader_dashboard_controller_1.getLeaderDashboard);
router.get("/payouts", auth_1.requireAuth, auth_1.requireLeader, leader_dashboard_controller_1.getLeaderPayouts);
exports.default = router;
