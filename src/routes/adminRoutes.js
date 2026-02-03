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
    updatePassword
} from "../controllers/adminController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", adminRegister);
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

router.get("/me", adminAuth, checkAdmin);
router.get("/schema", getSchema);

// Password Management
router.put("/update-password", adminAuth, updatePassword);
router.post("/forgot-password", requestPasswordReset);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password", resetPassword);

export default router;
