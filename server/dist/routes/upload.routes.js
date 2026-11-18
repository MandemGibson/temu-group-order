"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_middleware_1 = require("../middleware/upload.middleware");
const upload_controller_1 = require("../controllers/upload.controller");
const router = (0, express_1.Router)();
// Endpoint for uploading an image to Cloudinary (field name: "image")
router.post("/upload", upload_middleware_1.upload.single("image"), upload_controller_1.uploadSingleImage);
exports.default = router;
