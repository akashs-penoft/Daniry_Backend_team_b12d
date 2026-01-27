import express from "express";
import { getCompanyLogo, updateCompanyLogo } from "../controllers/settingsController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";
import { uploadLogo } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Public route to get the current logo
router.get("/logo", getCompanyLogo);

// Protected route to update the logo
router.put("/logo", adminAuth, uploadLogo.single("logo"), updateCompanyLogo);

export default router;
