import express from "express";
import { submitPartnershipForm, getAllPartnershipEnquiries } from "../controllers/partnershipController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

import rateLimit from "express-rate-limit";

const partnershipLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many requests, please try again later",
});

// Submit partnership enquiry
router.post("/", partnershipLimiter, submitPartnershipForm);

// Admin: Get all partnership enquiries
router.get("/admin/all", adminAuth, getAllPartnershipEnquiries);

export default router;
