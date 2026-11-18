import { cloudinary } from "../config/cloudinary";
import { env } from "../env";
import { logger } from "./logger";

/**
 * Uploads a file buffer to Cloudinary and returns the secure URL.
 * @param fileBuffer The file content buffer.
 * @param folder The target subfolder inside the Cloudinary directory.
 * @param mimeType Optional file mime type for fallback base64.
 * @returns Secure URL string.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string = "general",
  mimeType: string = "image/png"
): Promise<string> {
  // If Cloudinary keys are not set in dev, fallback to data URI / placeholder
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
    logger.warn("CLOUDINARY credentials not configured. Converting buffer to data URI string for dev preview.");
    const base64 = fileBuffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `fides-platform/${folder}`,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error:", error);
          reject(
            new Error(`Failed to upload image to storage: ${error.message}`)
          );
        } else if (result && result.secure_url) {
          logger.info(`Image uploaded to Cloudinary: ${result.secure_url}`);
          resolve(result.secure_url);
        } else {
          reject(
            new Error(
              "Upload to Cloudinary succeeded but did not return a secure URL."
            )
          );
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
}

/**
 * Deletes an asset from Cloudinary using its public URL.
 * @param publicUrl Public secure URL of the asset.
 */
export async function deleteFromCloudinary(publicUrl: string): Promise<void> {
  if (!publicUrl || publicUrl.startsWith("data:")) return;

  try {
    const parts = publicUrl.split("/upload/");
    if (parts.length < 2) return;

    const pathWithVersion = parts[1];
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, "");
    const publicId = pathWithoutVersion.substring(
      0,
      pathWithoutVersion.lastIndexOf(".")
    );

    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted asset from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error("Failed to delete asset from Cloudinary:", error);
  }
}
