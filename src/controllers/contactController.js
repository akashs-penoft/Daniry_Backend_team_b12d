import { transporter, getUserEmailTemplate, getAdminEmailTemplate } from "../utils/mailer.js";
import { db } from "../configs/db.js";

export const submitContactForm = async (req, res, next) => {
    const {
        fullName,
        contactNumber,
        email,
        reason,
        message
    } = req.body;

    if (!fullName || !contactNumber || !email || !message) {
        return res.status(400).json({ success: false, message: "All fields required" });
    }

    try {
        // Insert into DB
        await db.execute(
            `INSERT INTO enquiries (full_name, phone, email, reason, message)
       VALUES (?, ?, ?, ?, ?)`,
            [fullName, contactNumber, email, reason || null, message]
        );

        // Mail to Admin
        await transporter.sendMail({
            from: `"Website Contact" <${process.env.SMTP_EMAIL}>`,
            to: process.env.ADMIN_EMAIL,
            subject: "New Contact Enquiry",
            html: getAdminEmailTemplate(fullName, contactNumber, email, reason, message)
        });

        // Confirmation mail to User
        await transporter.sendMail({
            from: `"Daniry - Nourish Your Day" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: "We received your enquiry",
            html: getUserEmailTemplate(fullName, message)
        });

        return res.json({ success: true, message: "Enquiry sent successfully" });

    } catch (error) {
        next(error);
    }
};

// Admin Action: Get all enquiries
export const getAllEnquiries = async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM enquiries ORDER BY created_at DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Admin Action: Delete an enquiry
export const deleteEnquiry = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM enquiries WHERE id = ?", [id]);
        res.json({ success: true, message: "Enquiry deleted successfully" });
    } catch (error) {
        next(error);
    }
};
