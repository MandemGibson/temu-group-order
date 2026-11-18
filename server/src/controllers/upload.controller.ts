import { Request, Response } from "express";
import { uploadToCloudinary } from "../utils/storage";
import { logger } from "../utils/logger";

export const uploadSingleImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided in request." });
      return;
    }

    const folder = (req.body.folder as string) || "general";
    const secureUrl = await uploadToCloudinary(
      req.file.buffer,
      folder,
      req.file.mimetype
    );

    res.status(200).json({
      success: true,
      url: secureUrl,
      filename: req.file.originalname,
      sizeBytes: req.file.size,
    });
  } catch (error: any) {
    logger.error("Error in uploadSingleImage controller:", error);
    res.status(500).json({
      error: "Image upload failed",
      message: error.message,
    });
  }
};
