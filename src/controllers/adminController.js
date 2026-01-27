import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../configs/db.js";
import { transporter, getPasswordResetTemplate } from "../utils/mailer.js";

// Admin Registration-----
export const adminRegister = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
    }

    try {
        // Check if any admin already exists (Single Use Restriction)
        const [existingAdmins] = await db.query("SELECT id FROM admins LIMIT 1");

        if (existingAdmins.length > 0) {
            return res.status(403).json({ 
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

        res.status(201).json({ message: "Admin registered successfully" });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: "Failed to register admin" });
    }
};

// Admin Login------
export const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.query(
            "SELECT * FROM admins WHERE email = ?",
            [email]
        );

        if (!rows.length) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, name: admin.name },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("admin_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ message: "Login successful" });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: "Failed to login" });
    }
};

// Admin Logout------
export const adminLogout = (req, res) => {
    res.clearCookie("admin_token");
    return res.json({ message: "Logged out" });
};

// Admin Check Authentication------
export const checkAdmin = async (req, res) => {
    // If the request reached here, the auth middleware already verified the token
    return res.json({ authenticated: true, admin: req.admin });
};

// Admin Request Password Reset------
export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        // Check if admin exists
        const [admins] = await db.execute(
            'SELECT id, email FROM admins WHERE email = ?',
            [email]
        );

        // Always return success message (don't reveal if email exists)
        if (admins.length === 0) {
            return res.json({
                message: 'If an account with that email exists, a password reset link has been sent.'
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
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        return res.status(500).json({ message: 'Failed to process password reset request' });
    }
};

// Verify reset token validity
export const verifyResetToken = async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }

    try {
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
                valid: false,
                message: 'Invalid or expired reset token'
            });
        }

        res.json({
            valid: true,
            email: tokens[0].email
        });

    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ message: 'Failed to verify token' });
    }
};

// Admin Reset Password------
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
    }

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid token
        const [tokens] = await db.execute(
            'SELECT admin_id FROM admin_password_resets WHERE reset_token = ? AND expires_at > NOW() AND used = 0',
            [hashedToken]
        );

        if (tokens.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
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

        res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({ message: 'Failed to reset password' });
    }
};
