import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../configs/db.js";
import { transporter, getPasswordResetTemplate, getOTPVerificationTemplate } from "../utils/mailer.js";

// Admin Registration-----
export const adminRegister = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email and password are required" });
        }

        // Check if any admin already exists (Single Use Restriction)
        const [existingAdmins] = await db.query("SELECT id FROM admins LIMIT 1");

        if (existingAdmins.length > 0) {
            return res.status(403).json({
                success: false,
                message: "Registration is locked. An admin account already exists."
            });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the admin
        await db.execute(
            "INSERT INTO admins (name, email, password_hash, is_active) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, 1]
        );

        res.status(201).json({ success: true, message: "Admin registered successfully" });
    } catch (error) {
        next(error);
    }
};

// Admin Login------
export const adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Check Super Admin (admins table)
        const [adminRows] = await db.query(
            "SELECT * FROM admins WHERE email = ? AND is_active = 1",
            [email]
        );

        if (adminRows.length > 0) {
            const admin = adminRows[0];
            const isMatch = await bcrypt.compare(password, admin.password_hash);

            if (isMatch) {
                const token = jwt.sign(
                    { id: admin.id, email: admin.email, name: admin.name, isSuperAdmin: true },
                    process.env.JWT_SECRET,
                    { expiresIn: "1d" }
                );

                res.cookie("admin_token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: "lax",
                    maxAge: 24 * 60 * 60 * 1000
                });

                return res.json({
                    success: true,
                    message: "Login successful",
                    data: {
                        admin: {
                            id: admin.id,
                            name: admin.name,
                            email: admin.email,
                            isSuperAdmin: true
                        }
                    }
                });
            }
        }

        // 2. Check Regular User (users table)
        const [userRows] = await db.query(
            "SELECT * FROM users WHERE email = ? AND status = 'ACTIVE'",
            [email]
        );

        if (userRows.length > 0) {
            const user = userRows[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (isMatch) {
                const token = jwt.sign(
                    { id: user.id, email: user.email, name: user.name, isSuperAdmin: false },
                    process.env.JWT_SECRET,
                    { expiresIn: "1d" }
                );

                res.cookie("admin_token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: "lax",
                    maxAge: 24 * 60 * 60 * 1000
                });

                return res.json({
                    success: true,
                    message: "Login successful",
                    data: {
                        admin: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            isSuperAdmin: false
                        }
                    }
                });
            }
        }

        // 3. User not found or password mismatch
        return res.status(401).json({ success: false, message: "Invalid credentials" });

    } catch (error) {
        next(error);
    }
};

// Admin Logout------
export const adminLogout = (req, res) => {
    res.clearCookie("admin_token");
    return res.json({ success: true, message: "Logged out" });
};

// Admin Check Authentication------
export const checkAdmin = async (req, res) => {
    // If the request reached here, the auth middleware already verified the token
    // Return admin info with isSuperAdmin flag for frontend
    return res.json({
        success: true,
        data: {
            authenticated: true,
            admin: req.admin,
            isSuperAdmin: req.admin?.isSuperAdmin || false
        }
    });
};

// Admin Request Password Reset------
export const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Check if admin exists
        const [admins] = await db.execute(
            'SELECT id, email FROM admins WHERE email = ?',
            [email]
        );

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No admin account found with this email address.'
            });
        }

        const admin = admins[0];

        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Token expires in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Delete any existing tokens for this admin
        await db.execute(
            'DELETE FROM admin_password_resets WHERE admin_id = ?',
            [admin.id]
        );

        // Store hashed token in database
        await db.execute(
            'INSERT INTO admin_password_resets (admin_id, reset_token, expires_at, used) VALUES (?, ?, ?, ?)',
            [admin.id, hashedToken, expiresAt, 0]
        );

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/reset-password/${resetToken}`;

        // Send email
        await transporter.sendMail({
            from: `"Daniry Admin" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: 'Password Reset Request',
            html: getPasswordResetTemplate(resetUrl)
        });

        res.json({
            success: true,
            message: 'A password reset link has been sent to your email address.'
        });

    } catch (error) {
        next(error);
    }
};

// Verify reset token validity
export const verifyResetToken = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token is required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const [tokens] = await db.execute(
            `SELECT prt.*, a.email 
       FROM admin_password_resets prt 
       JOIN admins a ON prt.admin_id = a.id 
       WHERE prt.reset_token = ? AND prt.expires_at > NOW() AND prt.used = 0`,
            [hashedToken]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                data: { valid: false },
                message: 'Invalid or expired reset token'
            });
        }

        res.json({
            success: true,
            data: {
                valid: true,
                email: tokens[0].email
            }
        });

    } catch (error) {
        next(error);
    }
};

// Admin Update Password (Logged In)
export const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminId = req.admin.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Both current and new passwords are required" });
        }

        // Fetch admin with current password hash
        const [rows] = await db.query(
            "SELECT password_hash FROM admins WHERE id = ?",
            [adminId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        const admin = rows[0];

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect current password" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in DB
        await db.execute(
            "UPDATE admins SET password_hash = ? WHERE id = ?",
            [hashedPassword, adminId]
        );

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        next(error);
    }
};

/**
 * Send Security OTP for password change (Authenticated)
 */
export const sendSecurityOTP = async (req, res, next) => {
    try {
        const { id, isSuperAdmin, email } = req.admin;

        const table = isSuperAdmin ? "admins" : "users";
        const [rows] = await db.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete previous OTPs for this email and purpose
        await db.execute(
            "DELETE FROM otp_verifications WHERE email = ? AND purpose = 'PASSWORD_CHANGE'",
            [email]
        );

        // Store new OTP
        await db.execute(
            "INSERT INTO otp_verifications (email, otp_hash, purpose, expires_at) VALUES (?, ?, 'PASSWORD_CHANGE', ?)",
            [email, otpHash, expiresAt]
        );

        // Send OTP email
        await transporter.sendMail({
            from: `"Daniry Admin" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: "Security Verification Code",
            html: getOTPVerificationTemplate(otp)
        });

        res.json({ success: true, message: "Verification code sent to your email" });
    } catch (error) {
        next(error);
    }
};

/**
 * Update password with OTP verification
 */
export const updatePasswordWithOTP = async (req, res, next) => {
    try {
        const { otp, newPassword } = req.body;
        const { id, isSuperAdmin, email } = req.admin;

        if (!otp || !newPassword) {
            return res.status(400).json({ success: false, message: "OTP and new password are required" });
        }

        // Validate password strength
        const strengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!strengthRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
            });
        }

        // Verify OTP
        const [otps] = await db.query(
            "SELECT otp_hash FROM otp_verifications WHERE email = ? AND purpose = 'PASSWORD_CHANGE' AND expires_at > NOW() AND verified = 0",
            [email]
        );

        if (otps.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
        }

        const isOtpMatch = await bcrypt.compare(otp, otps[0].otp_hash);
        if (!isOtpMatch) {
            return res.status(400).json({ success: false, message: "Incorrect verification code" });
        }

        // Update password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const table = isSuperAdmin ? "admins" : "users";

        await db.execute(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [hashedPassword, id]);

        // Mark OTP as verified/used
        await db.execute(
            "UPDATE otp_verifications SET verified = 1 WHERE email = ? AND purpose = 'PASSWORD_CHANGE'",
            [email]
        );

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Profile Details (Name, Email)
 */
export const updateProfileDetails = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const { id, isSuperAdmin } = req.admin;

        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }

        const table = isSuperAdmin ? "admins" : "users";

        if (email) {
            // Check if email already taken by another user
            const [existing] = await db.query(
                `SELECT id FROM ${table} WHERE email = ? AND id != ?`,
                [email, id]
            );

            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: "Email is already in use" });
            }

            await db.execute(
                `UPDATE ${table} SET name = ?, email = ? WHERE id = ?`,
                [name, email, id]
            );
        } else {
            await db.execute(
                `UPDATE ${table} SET name = ? WHERE id = ?`,
                [name, id]
            );
        }

        res.json({ success: true, message: "Profile details updated successfully" });
    } catch (error) {
        next(error);
    }
};

// Admin Reset Password------
export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and password are required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid token
        const [tokens] = await db.execute(
            'SELECT admin_id FROM admin_password_resets WHERE reset_token = ? AND expires_at > NOW() AND used = 0',
            [hashedToken]
        );

        if (tokens.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        const adminId = tokens[0].admin_id;

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password
        await db.execute(
            'UPDATE admins SET password_hash = ? WHERE id = ?',
            [hashedPassword, adminId]
        );

        // Mark token as used
        await db.execute(
            'UPDATE admin_password_resets SET used = 1 WHERE admin_id = ? AND reset_token = ?',
            [adminId, hashedToken]
        );

        res.json({ success: true, message: 'Password has been reset successfully' });

    } catch (error) {
        next(error);
    }
};

// Helper to get schema info
export const getSchema = async (req, res, next) => {
    try {
        const [tables] = await db.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);

        const schema = {};
        for (const table of tableNames) {
            const [columns] = await db.query(`DESCRIBE ${table}`);
            schema[table] = columns;
        }

        res.json({ success: true, data: schema });
    } catch (error) {
        next(error);
    }
};
