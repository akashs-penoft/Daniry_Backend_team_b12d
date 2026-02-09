import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daniry - Nourish Your Day</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #40308a; /* Dark green for natural feel */
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 30px;
      letter-spacing: 1px;
    }
    .content {
      padding: 30px;
    }
    .footer {
      background-color: #f1f1f1;
      color: #777;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 25px;
      background-color: #40308a;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
    .divider {
      border-top: 1px solid #eee;
      margin: 20px 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .details-table td {
      padding: 8px 0;
      border-bottom: 1px solid #f9f9f9;
    }
    .label {
      font-weight: bold;
      color: #555;
      width: 120px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DANIRY</h1>
      <p style="margin: 5px 0 0; font-size: 10px; opacity: 0.9;">Nourish Your Day</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Daniry. All rights reserved.</p>
      <p>This is an automated message, please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;

export const getUserEmailTemplate = (fullName, message) => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0;">Hello ${fullName},</h2>
  <p>Thank you for reaching out to <strong>Daniry</strong>. We have successfully received your enquiry and our team will get back to you shortly.</p>
  
  <div class="divider"></div>
  
  <h3 style="font-size: 16px; color: #555;">Your Message Summary:</h3>
  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #40308a;">
    <p style="margin: 0; font-style: italic; color: #444;">"${message}"</p>
  </div>
  
  <p style="margin-top: 25px;">Stay healthy,<br/><strong>The Daniry Team</strong></p>
`);

export const getNewsBlastTemplate = (heading, content) => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0; text-align: center;">${heading}</h2>
  
  <div class="divider"></div>
  
  <div style="font-size: 16px; color: #333; line-height: 1.8;">
    ${content}
  </div>
  
  <div class="divider"></div>
  
  <p style="font-size: 12px; color: #999; text-align: center;">
    You are receiving this because you subscribed to Daniry updates.<br/>
    If you no longer wish to receive these emails, you can unsubscribe at any time.
  </p>
  
  <p style="margin-top: 25px; text-align: center;">Stay healthy,<br/><strong>The Daniry Team</strong></p>
`);

export const getAdminEmailTemplate = (fullName, contactNumber, email, reason, message) => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0;">New Contact Enquiry</h2>
  <p>A new enquiry has been submitted through the website contact form.</p>
  
  <table class="details-table">
    <tr>
      <td class="label">Name:</td>
      <td>${fullName}</td>
    </tr>
    <tr>
      <td class="label">Phone:</td>
      <td>${contactNumber}</td>
    </tr>
    <tr>
      <td class="label">Email:</td>
      <td><a href="mailto:${email}" style="color: #40308a;">${email}</a></td>
    </tr>
    ${reason ? `<tr><td class="label">Reason:</td><td>${reason}</td></tr>` : ''}
  </table>
  
  <div class="divider"></div>
  
  <h3 style="font-size: 16px; color: #555;">Message Content:</h3>
  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #40308a;">
    <p style="margin: 0; color: #444;">${message}</p>
  </div>
  
  <div style="text-align: center;">
    <a href="mailto:${email}" class="button" style="color: #ffffff;">Reply to Customer</a>
  </div>
`);

export const getPasswordResetTemplate = (resetUrl) => baseTemplate(`
  <h2 style="color: #2d5a27; margin-top: 0;">Password Reset Request</h2>
  <p>You requested to reset your password for the <strong>Daniry Admin Dashboard</strong>.</p>
  <p>Click the button below to reset your password. This link will expire in 15 minutes.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" class="button" style="color: #ffffff;">Reset Password</a>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 20px;">
    If you didn't request this password reset, please ignore this email.
  </p>
  
  <p style="margin-top: 25px;">Regards,<br/><strong>The Daniry Team</strong></p>
`);

export const getOTPVerificationTemplate = (otp) => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0;">Security Verification Code</h2>
  <p>You are requesting a secure action on your <strong>Daniry Admin</strong> account.</p>
  <p>Please use the following 6-digit verification code to proceed. This code will expire in 10 minutes.</p>
  
  <div style="background-color: #f4f1ff; padding: 30px; border-radius: 8px; border: 1px dashed #40308a; text-align: center; margin: 25px 0;">
    <p style="margin: 0; font-size: 14px; color: #736b91; text-transform: uppercase; tracking-widest;">Your Verification Code</p>
    <p style="margin: 15px 0 0; font-family: 'Courier New', monospace; font-size: 42px; font-weight: bold; color: #40308a; letter-spacing: 12px; line-height: 1;">${otp}</p>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 20px;">
    <strong>Security Note:</strong> Never share this code with anyone. Daniry staff will never ask for your verification code.
  </p>
  
  <p style="margin-top: 25px;">Stay secure,<br/><strong>The Daniry Team</strong></p>
`);

export const getNewsletterConfirmationTemplate = () => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0;">Welcome to Daniry!</h2>
  <p>Thank you for subscribing to our newsletter. You are now part of our community!</p>
  <p>You'll be the first to receive updates on our latest nutritional products, health tips, and exclusive offers.</p>
  
  <div class="divider"></div>
  
  <p style="font-size: 14px; color: #666;">
    If you didn't mean to subscribe, you can safely ignore this email.
  </p>
  
  <p style="margin-top: 25px;">Stay healthy,<br/><strong>The Daniry Team</strong></p>
`);

export const getPartnerUserTemplate = (name) => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0;">Hello ${name},</h2>
  <p>Thank you for your interest in partnering with <strong>Daniry</strong>.</p>
  <p>We have received your partnership enquiry and our business development team will review it and get back to you shortly.</p>
  
  <p style="margin-top: 25px;">Regards,<br/><strong>The Daniry Team</strong></p>
`);

export const getPartnerAdminTemplate = (name, email, phone, message) => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0;">New Partnership Enquiry</h2>
  <p>A new partnership request has been submitted.</p>
  
  <table class="details-table">
    <tr>
      <td class="label">Name:</td>
      <td>${name}</td>
    </tr>
    <tr>
      <td class="label">Phone:</td>
      <td>${phone}</td>
    </tr>
    <tr>
      <td class="label">Email:</td>
      <td><a href="mailto:${email}" style="color: #40308a;">${email}</a></td>
    </tr>
  </table>
  
  <div class="divider"></div>
  
  <h3 style="font-size: 16px; color: #555;">Message:</h3>
  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #40308a;">
    <p style="margin: 0; color: #444;">${message}</p>
  </div>
  
  <div style="text-align: center;">
    <a href="mailto:${email}" class="button" style="color: #ffffff;">Reply to Partner</a>
  </div>
`);

export const getUserInvitationTemplate = (name, setupUrl, tempPassword) => baseTemplate(`
  <h2 style="color: #40308a; margin-top: 0;">Welcome to Daniry Admin!</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>You've been invited to join the <strong>Daniry Admin Dashboard</strong>. To get started, please set your password by clicking the button below:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${setupUrl}" class="button" style="color: #ffffff;">Set Your Password</a>
  </div>

  <div style="background-color: #f4f1ff; padding: 20px; border-radius: 8px; border: 1px dashed #40308a; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #736b91;">Your temporary invitation password:</p>
    <p style="margin: 10px 0 0; font-family: monospace; font-size: 20px; font-weight: bold; color: #40308a; letter-spacing: 2px;">${tempPassword}</p>
    <p style="margin: 10px 0 0; font-size: 12px; color: #a796f9;">* You will need this to set your permanent password.</p>
  </div>
  
  <div class="divider"></div>
  
  <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #40308a; font-size: 12px; background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${setupUrl}</p>
  
  <p style="color: #666; font-size: 14px; margin-top: 20px;">
    <strong>This invitation link will expire in 7 days.</strong>
  </p>
  
  <p style="color: #666; font-size: 14px;">
    If you didn't expect this invitation, please ignore this email.
  </p>
  
  <p style="margin-top: 25px;">Regards,<br/><strong>The Daniry Team</strong></p>
`);
