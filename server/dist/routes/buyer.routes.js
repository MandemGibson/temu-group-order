"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const buyer_controller_1 = require("../controllers/buyer.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/orders", auth_1.requireAuth, buyer_controller_1.getMyOrders);
router.get("/credit", auth_1.requireAuth, buyer_controller_1.getMyCredit);
exports.default = router;
