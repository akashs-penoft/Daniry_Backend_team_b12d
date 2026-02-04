import { db } from "../configs/db.js";
import { transporter, getPartnerUserTemplate, getPartnerAdminTemplate } from "../utils/mailer.js";

export const submitPartnershipForm = async (req, res, next) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        // 1. Save to Database
        await db.execute(
            "INSERT INTO partnership_enquiries (name, email, phone, message) VALUES (?, ?, ?, ?)",
            [name, email, phone, message]
        );

        // 2. Send Notification to Admin
        await transporter.sendMail({
            from: `"Partnership Lead" <${process.env.SMTP_EMAIL}>`,
            to: process.env.ADMIN_EMAIL,
            subject: "New Partnership Enquiry",
            html: getPartnerAdminTemplate(name, email, phone, message)
        });

        // 3. Send Confirmation to User
        await transporter.sendMail({
            from: `"Daniry Partnerships" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: "We received your partnership enquiry",
            html: getPartnerUserTemplate(name)
        });

        res.json({ success: true, message: "Partnership enquiry submitted successfully" });

    } catch (error) {
        next(error);
    }
};

// Admin Action: Get all partnership enquiries
export const getAllPartnershipEnquiries = async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM partnership_enquiries ORDER BY created_at DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};
// Admin Action: Delete a partnership enquiry
export const deletePartnershipEnquiry = async (req, res, next) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(
            "DELETE FROM partnership_enquiries WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Enquiry not found" });
        }

        res.json({ success: true, message: "Partnership enquiry deleted successfully" });
    } catch (error) {
        next(error);
    }
};
