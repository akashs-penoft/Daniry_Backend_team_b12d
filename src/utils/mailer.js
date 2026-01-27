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
