"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSingleImage = void 0;
const storage_1 = require("../utils/storage");
const logger_1 = require("../utils/logger");
const uploadSingleImage = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No image file provided in request." });
            return;
        }
        const folder = req.body.folder || "general";
        const secureUrl = await (0, storage_1.uploadToCloudinary)(req.file.buffer, folder, req.file.mimetype);
        res.status(200).json({
            success: true,
            url: secureUrl,
            filename: req.file.originalname,
            sizeBytes: req.file.size,
        });
    }
    catch (error) {
        logger_1.logger.error("Error in uploadSingleImage controller:", error);
        res.status(500).json({
            error: "Image upload failed",
            message: error.message,
        });
    }
};
exports.uploadSingleImage = uploadSingleImage;
