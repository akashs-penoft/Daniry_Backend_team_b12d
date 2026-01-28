import { db } from "../configs/db.js";
import { transporter, getPartnerUserTemplate, getPartnerAdminTemplate } from "../utils/mailer.js";

export const submitPartnershipForm = async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
        return res.status(400).json({ message: "All fields are required" });
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

        res.json({ message: "Partnership enquiry submitted successfully" });

    } catch (error) {
        console.error("Partnership error:", error);
        return res.status(500).json({ message: "Failed to submit enquiry" });
    }
};

// Admin Action: Get all partnership enquiries
export const getAllPartnershipEnquiries = async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT * FROM partnership_enquiries ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching partnership enquiries:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
// Admin Action: Delete a partnership enquiry
export const deletePartnershipEnquiry = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(
            "DELETE FROM partnership_enquiries WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Enquiry not found" });
        }

        res.json({ message: "Partnership enquiry deleted successfully" });
    } catch (error) {
        console.error("Error deleting partnership enquiry:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
