import express from "express";
import {
    inviteUser,
    setupPassword,
    verifyInvitationToken,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getMyPermissions
} from "../controllers/userController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";
import { superAdminOnly } from "../middlewares/rbacMiddleware.js";

const router = express.Router();

// Public routes (invitation setup)
router.get("/verify-invitation/:token", verifyInvitationToken);
router.post("/setup-password", setupPassword);

// Authenticated user routes
router.get("/me/permissions", adminAuth, getMyPermissions);

// Super Admin only routes
router.post("/invite", adminAuth, superAdminOnly, inviteUser);
router.get("/", adminAuth, superAdminOnly, getAllUsers);
router.get("/:id", adminAuth, superAdminOnly, getUserById);
router.put("/:id", adminAuth, superAdminOnly, updateUser);
router.delete("/:id", adminAuth, superAdminOnly, deleteUser);

export default router;
