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
