import express from "express";
import {
    adminRegister,
    adminLogin,
    adminLogout,
    checkAdmin,
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
    getSchema,
    updatePassword,
    sendSecurityOTP,
    updatePasswordWithOTP,
    updateProfileDetails
} from "../controllers/adminController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", adminRegister);
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

router.get("/me", adminAuth, checkAdmin);
router.get("/schema", getSchema);

// Password Management (Existing)
router.put("/update-password", adminAuth, updatePassword);
router.post("/forgot-password", requestPasswordReset);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password", resetPassword);

// Security & Profile (NEW OTP-based)
router.post("/security/send-otp", adminAuth, sendSecurityOTP);
router.put("/security/update-password", adminAuth, updatePasswordWithOTP);
router.put("/profile/update", adminAuth, updateProfileDetails);

export default router;
