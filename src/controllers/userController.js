import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../configs/db.js";
import { transporter, getUserInvitationTemplate } from "../utils/mailer.js";
import { clearUserPermissionCache } from "../middlewares/rbacMiddleware.js";

/**
 * Generate a complex temporary password
 */
const generateTempPassword = () => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  // Ensure at least one of each required type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*()_+"[Math.floor(Math.random() * 12)];

  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

/**
 * Invite a new user
 * Creates user in PENDING state and sends invitation email
 * Super Admin only
 */
export const inviteUser = async (req, res, next) => {
  try {
    const { name, email, roleIds, permissions } = req.body;

    if (!name || !email || !roleIds || !Array.isArray(roleIds)) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and role IDs are required",
      });
    }

    // Check if user already exists
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user in PENDING state
    const [result] = await db.execute(
      "INSERT INTO users (name, email, status) VALUES (?, ?, 'PENDING')",
      [name, email],
    );

    const userId = result.insertId;

    // Assign roles to user
    if (roleIds.length > 0) {
      const roleValues = roleIds.map((roleId) => [userId, roleId]);
      await db.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [
        roleValues,
      ]);
    }

    // Assign granular permissions
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      // Get IDs for these permission names
      const [permRecords] = await db.query(
        "SELECT id FROM permissions WHERE name IN (?)",
        [permissions],
      );

      if (permRecords.length > 0) {
        const permValues = permRecords.map((p) => [userId, p.id, 1]); // 1 = granted
        await db.query(
          "INSERT INTO user_permissions (user_id, permission_id, granted) VALUES ?",
          [permValues],
        );
      }
    }

    // Generate secure invitation token and temporary password
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(invitationToken)
      .digest("hex");

    const tempPassword = generateTempPassword();
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // Token expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store hashed token and temporary password
    await db.execute(
      "INSERT INTO user_invitations (user_id, token_hash, temp_password_hash, expires_at) VALUES (?, ?, ?, ?)",
      [userId, tokenHash, tempPasswordHash, expiresAt],
    );

    // Create setup URL
    const setupUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/admin/setup-password/${invitationToken}`;

    // Send invitation email
    await transporter.sendMail({
      from: `"Daniry Admin" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Welcome to Daniry Admin - Set Your Password",
      html: getUserInvitationTemplate(name, setupUrl, tempPassword),
    });

    res.status(201).json({
      success: true,
      message: "User invited successfully. Invitation email sent.",
      data: { userId, setupUrl }, // Include setupUrl for testing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Setup password for invited user
 * Validates token and activates user account
 */
export const setupPassword = async (req, res, next) => {
  try {
    const { token, password, tempPassword } = req.body;

    if (!token || !password || !tempPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, temporary password, and new password are required",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find valid invitation
    const [invitations] = await db.execute(
      `SELECT ui.user_id, ui.temp_password_hash, u.email, u.name 
             FROM user_invitations ui
             JOIN users u ON ui.user_id = u.id
             WHERE ui.token_hash = ? AND ui.expires_at > NOW() AND ui.used = 0`,
      [tokenHash],
    );

    if (invitations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invitation token",
      });
    }

    // Verify temporary password
    const isTempPasswordValid = await bcrypt.compare(
      tempPassword,
      invitations[0].temp_password_hash
    );

    if (!isTempPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Incorrect temporary password",
      });
    }

    const userId = invitations[0].user_id;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and activate account
    await db.execute(
      "UPDATE users SET password_hash = ?, status = 'ACTIVE' WHERE id = ?",
      [hashedPassword, userId],
    );

    // Mark invitation as used
    await db.execute(
      "UPDATE user_invitations SET used = 1 WHERE token_hash = ?",
      [tokenHash],
    );

    res.json({
      success: true,
      message: "Password set successfully. You can now login.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify invitation token
 * Checks if token is valid and not expired
 */
export const verifyInvitationToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [invitations] = await db.execute(
      `SELECT u.email, u.name
             FROM user_invitations ui
             JOIN users u ON ui.user_id = u.id
             WHERE ui.token_hash = ? AND ui.expires_at > NOW() AND ui.used = 0`,
      [tokenHash],
    );

    if (invitations.length === 0) {
      return res.status(400).json({
        success: false,
        data: { valid: false },
        message: "Invalid or expired invitation token",
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        email: invitations[0].email,
        name: invitations[0].name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users with their roles
 * Super Admin only
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const [users] = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.status,
                u.created_at,
                GROUP_CONCAT(DISTINCT r.name) as roles,
                GROUP_CONCAT(DISTINCT p.name) as permissions
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            LEFT JOIN user_permissions up ON u.id = up.user_id AND up.granted = 1
            LEFT JOIN permissions p ON up.permission_id = p.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

    // Parse roles and permissions from comma-separated string to array
    const usersWithRoles = users.map((user) => ({
      ...user,
      roles: user.roles ? user.roles.split(",") : [],
      permissions: user.permissions ? user.permissions.split(",") : [],
    }));

    res.json({
      success: true,
      data: usersWithRoles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID with roles and permissions
 * Super Admin only
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      "SELECT id, name, email, status, created_at FROM users WHERE id = ?",
      [id],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    // Get user roles
    const [roles] = await db.query(
      `
            SELECT r.id, r.name, r.description
            FROM roles r
            INNER JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = ?
        `,
      [id],
    );

    // Get explicit user permissions
    const [permissions] = await db.query(
      `
            SELECT p.id, p.name, p.slug
            FROM permissions p
            INNER JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = ? AND up.granted = 1
        `,
      [id],
    );

    user.roles = roles;
    user.permissions = permissions;

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user details and roles
 * Super Admin only
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, status, roleIds } = req.body;

    // Check if user exists
    const [existing] = await db.query("SELECT id FROM users WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user details
    if (name || email || status) {
      const updates = [];
      const values = [];

      if (name) {
        updates.push("name = ?");
        values.push(name);
      }
      if (email) {
        updates.push("email = ?");
        values.push(email);
      }
      if (status) {
        updates.push("status = ?");
        values.push(status);
      }

      values.push(id);

      await db.execute(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );
    }

    // Update roles if provided
    if (roleIds && Array.isArray(roleIds)) {
      // Remove existing roles
      await db.execute("DELETE FROM user_roles WHERE user_id = ?", [id]);

      // Add new roles
      if (roleIds.length > 0) {
        const roleValues = roleIds.map((roleId) => [id, roleId]);
        await db.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [
          roleValues,
        ]);
      }
    }

    // Clear permission cache for this user
    clearUserPermissionCache(id);

    res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (soft delete by setting status to INACTIVE)
 * Super Admin only
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query("SELECT id FROM users WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Soft delete by setting status to INACTIVE
    await db.execute("UPDATE users SET status = 'INACTIVE' WHERE id = ?", [id]);

    // Clear permission cache
    clearUserPermissionCache(id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's permissions
 * Returns aggregated permissions from roles
 */
export const getMyPermissions = async (req, res, next) => {
  try {
    const userId = req.admin?.id || req.user?.id;
    const isSuperAdmin = req.admin?.isSuperAdmin || false;

    if (isSuperAdmin) {
      // Super Admin has all permissions
      const [allPermissions] = await db.query("SELECT slug FROM permissions");
      return res.json({
        success: true,
        data: {
          permissions: allPermissions.map((p) => p.slug),
          isSuperAdmin: true,
        },
      });
    }

    // Get permissions from roles
    const [permissions] = await db.query(
      `
            SELECT DISTINCT p.slug
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        `,
      [userId],
    );

    res.json({
      success: true,
      data: {
        permissions: permissions.map((p) => p.slug),
        isSuperAdmin: false,
      },
    });
  } catch (error) {
    next(error);
  }
};
