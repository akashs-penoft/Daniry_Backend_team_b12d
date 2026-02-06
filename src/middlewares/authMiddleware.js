import jwt from "jsonwebtoken";
import { db } from "../configs/db.js";

/**
 * Admin Authentication Middleware
 * Supports both Super Admin (admins table) and regular users (users table)
 */
export const adminAuth = async (req, res, next) => {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a Super Admin (from admins table)
    const [adminRows] = await db.query(
      "SELECT id, name, email FROM admins WHERE id = ? AND is_active = 1",
      [decoded.id]
    );

    if (adminRows.length > 0) {
      // Super Admin from admins table
      req.admin = {
        id: adminRows[0].id,
        name: adminRows[0].name,
        email: adminRows[0].email,
        isSuperAdmin: true
      };
      return next();
    }

    // Check if this is a regular user (from users table)
    const [userRows] = await db.query(
      "SELECT id, name, email, status FROM users WHERE id = ? AND status = 'ACTIVE'",
      [decoded.id]
    );

    if (userRows.length > 0) {
      // Regular user from users table
      req.user = {
        id: userRows[0].id,
        name: userRows[0].name,
        email: userRows[0].email,
        isSuperAdmin: false
      };
      // Also set req.admin for backward compatibility
      req.admin = req.user;
      return next();
    }

    // User not found or inactive
    return res.status(401).json({ message: "Invalid or inactive user" });

  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};
