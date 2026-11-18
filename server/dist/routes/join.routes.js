"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const join_controller_1 = require("../controllers/join.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const router = (0, express_1.Router)();
// Pool join endpoints
router.post("/pools/:id/join", auth_1.requireAuth, (0, validate_1.validate)({ body: schemas_1.joinPoolSchema }), join_controller_1.joinPool);
router.patch("/pool-joins/:id", auth_1.requireAuth, join_controller_1.updateJoin);
router.delete("/pool-joins/:id", auth_1.requireAuth, join_controller_1.leavePool);
exports.default = router;
