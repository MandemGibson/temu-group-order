"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
const cloudinary_1 = require("../config/cloudinary");
const env_1 = require("../env");
const logger_1 = require("./logger");
/**
 * Uploads a file buffer to Cloudinary and returns the secure URL.
 * @param fileBuffer The file content buffer.
 * @param folder The target subfolder inside the Cloudinary directory.
 * @param mimeType Optional file mime type for fallback base64.
 * @returns Secure URL string.
 */
async function uploadToCloudinary(fileBuffer, folder = "general", mimeType = "image/png") {
    // If Cloudinary keys are not set in dev, fallback to data URI / placeholder
    if (!env_1.env.CLOUDINARY_CLOUD_NAME || !env_1.env.CLOUDINARY_API_KEY) {
        logger_1.logger.warn("⚠️ CLOUDINARY credentials not configured. Converting buffer to data URI string for dev preview.");
        const base64 = fileBuffer.toString("base64");
        return `data:${mimeType};base64,${base64}`;
    }
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.cloudinary.uploader.upload_stream({
            folder: `fides-platform/${folder}`,
            resource_type: "auto",
        }, (error, result) => {
            if (error) {
                logger_1.logger.error("Cloudinary upload error:", error);
                reject(new Error(`Failed to upload image to storage: ${error.message}`));
            }
            else if (result && result.secure_url) {
                logger_1.logger.info(`📸 Image uploaded to Cloudinary: ${result.secure_url}`);
                resolve(result.secure_url);
            }
            else {
                reject(new Error("Upload to Cloudinary succeeded but did not return a secure URL."));
            }
        });
        uploadStream.end(fileBuffer);
    });
}
/**
 * Deletes an asset from Cloudinary using its public URL.
 * @param publicUrl Public secure URL of the asset.
 */
async function deleteFromCloudinary(publicUrl) {
    if (!publicUrl || publicUrl.startsWith("data:"))
        return;
    try {
        const parts = publicUrl.split("/upload/");
        if (parts.length < 2)
            return;
        const pathWithVersion = parts[1];
        const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, "");
        const publicId = pathWithoutVersion.substring(0, pathWithoutVersion.lastIndexOf("."));
        await cloudinary_1.cloudinary.uploader.destroy(publicId);
        logger_1.logger.info(`🗑️ Deleted asset from Cloudinary: ${publicId}`);
    }
    catch (error) {
        logger_1.logger.error("Failed to delete asset from Cloudinary:", error);
    }
}
