import { transporter, getUserEmailTemplate, getAdminEmailTemplate } from "../utils/mailer.js";
import { db } from "../configs/db.js";

export const submitContactForm = async (req, res) => {
    const {
        fullName,
        contactNumber,
        email,
        reason,
        message
    } = req.body;

    if (!fullName || !contactNumber || !email || !message) {
        return res.status(400).json({ message: "All fields required" });
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

        return res.json({ message: "Enquiry sent successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to send email" });
    }
};

// Admin Action: Get all enquiries
export const getAllEnquiries = async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM enquiries ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching enquiries:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Admin Action: Delete an enquiry
export const deleteEnquiry = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM enquiries WHERE id = ?", [id]);
        res.json({ message: "Enquiry deleted successfully" });
    } catch (error) {
        console.error("Error deleting enquiry:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
