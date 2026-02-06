import express from "express";
import {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getAllPermissions
} from "../controllers/roleController.js";
import { adminAuth } from "../middlewares/authMiddleware.js";
import { superAdminOnly } from "../middlewares/rbacMiddleware.js";

const router = express.Router();

// Get all permissions (available to all authenticated users for UI)
router.get("/permissions", adminAuth, getAllPermissions);

// Get all roles (available to all authenticated users for UI)
router.get("/", adminAuth, getAllRoles);
router.get("/:id", adminAuth, getRoleById);

// Super Admin only routes
router.post("/", adminAuth, superAdminOnly, createRole);
router.put("/:id", adminAuth, superAdminOnly, updateRole);
router.delete("/:id", adminAuth, superAdminOnly, deleteRole);

export default router;
