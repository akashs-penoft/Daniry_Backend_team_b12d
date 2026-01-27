import express from "express"
import { submitContactForm } from "../controllers/contactController.js"
import rateLimit from "express-rate-limit"

const router = express.Router()

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many requests from this IP, please try again after 15 minutes"
});

router.post("/", contactLimiter, submitContactForm)

export default router
