import express from "express"
import { submitContactForm, getAllEnquiries, deleteEnquiry } from "../controllers/contactController.js"
import { adminAuth } from "../middlewares/authMiddleware.js"
import { authorize } from "../middlewares/rbacMiddleware.js"
import rateLimit from "express-rate-limit"

const router = express.Router()

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many requests from this IP, please try again after 15 minutes"
});

router.post("/", contactLimiter, submitContactForm)

// Admin: Get all contact enquiries
router.get("/admin/all", adminAuth, authorize('enquiries.view'), getAllEnquiries)

// Admin: Delete an enquiry
router.delete("/admin/:id", adminAuth, authorize('enquiries.delete'), deleteEnquiry)

export default router
