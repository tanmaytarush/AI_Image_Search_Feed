import express from "express";
const router = express.Router();
import imageController from "../controllers/imageController.js";

// GET /api/images - Get all images from CSV
router.get("/", imageController.getAllImages);

// GET /api/images/search - Search images using vector similarity in QdrantDB
router.get("/search", imageController.searchImages);

export default router;
