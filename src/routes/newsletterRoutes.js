import express from "express";
import { subscribeNewsletter, getAllSubscribers, sendNewsToAllSubscribers } from "../controllers/newsletterController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: { message: "Too many attempts, please try again later" }
});

// Public: Subscribe
router.post("/subscribe", newsletterLimiter, subscribeNewsletter);

// Admin: View all subscribers
router.get("/admin/all", adminAuth, authorize('newsletter.view'), getAllSubscribers);

// Admin: Send news blast to all subscribers
router.post("/admin/send-news", adminAuth, authorize('newsletter.create'), sendNewsToAllSubscribers);

export default router;
