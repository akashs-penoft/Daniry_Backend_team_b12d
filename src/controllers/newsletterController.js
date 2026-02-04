import { db } from "../configs/db.js";
import { transporter, getNewsletterConfirmationTemplate, getNewsBlastTemplate } from "../utils/mailer.js";

export const subscribeNewsletter = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  try {
    // Check if email already exists
    const [existing] = await db.execute(
      "SELECT id FROM newsletter_subscribers WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email already subscribed" });
    }

    // Insert into database
    await db.execute(
      "INSERT INTO newsletter_subscribers (email) VALUES (?)",
      [email]
    );

    // Send professional confirmation email
    await transporter.sendMail({
      from: `"Daniry" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Welcome to our Newsletter!",
      html: getNewsletterConfirmationTemplate()
    });

    res.json({ success: true, message: "Successfully subscribed to newsletter" });

  } catch (error) {
    next(error);
  }
};

// Admin Action: Get all subscribers
export const getAllSubscribers = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// Admin Action: Send News Blast to all subscribers
export const sendNewsToAllSubscribers = async (req, res, next) => {
  const { heading, content } = req.body;

  if (!heading || !content) {
    return res.status(400).json({ success: false, message: "Heading and Content are required" });
  }

  try {
    // 1. Fetch all active subscribers
    const [subscribers] = await db.execute(
      "SELECT email FROM newsletter_subscribers WHERE is_active = 1"
    );

    if (subscribers.length === 0) {
      return res.status(404).json({ success: false, message: "No active subscribers found" });
    }

    // 2. Prepare the professional email template
    const emailHtml = getNewsBlastTemplate(heading, content);

    // 3. Send emails in parallel (using Promise.all for speed)
    const emailPromises = subscribers.map(sub =>
      transporter.sendMail({
        from: `"Daniry Updates" <${process.env.SMTP_EMAIL}>`,
        to: sub.email,
        subject: heading,
        html: emailHtml
      })
    );

    await Promise.all(emailPromises);

    // 4. Save this news blast to history table
    await db.execute(
      "INSERT INTO newsletters (heading, content, sent_at) VALUES (?, ?, NOW())",
      [heading, content]
    );

    res.json({
      success: true,
      message: `News blast sent successfully to ${subscribers.length} subscribers`
    });

  } catch (error) {
    next(error);
  }
};
