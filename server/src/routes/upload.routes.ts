import { Router } from "express";
import { upload } from "../middleware/upload.middleware";
import { uploadSingleImage } from "../controllers/upload.controller";

const router = Router();

// Endpoint for uploading an image to Cloudinary (field name: "image")
router.post("/upload", upload.single("image"), uploadSingleImage);

export default router;
