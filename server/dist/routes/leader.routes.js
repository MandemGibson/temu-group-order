"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leader_controller_1 = require("../controllers/leader.controller");
const router = (0, express_1.Router)();
router.get("/:id", leader_controller_1.getLeaderProfile);
exports.default = router;
