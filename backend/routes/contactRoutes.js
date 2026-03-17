const express = require("express");
const nodemailer = require("nodemailer");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "sharmapranshu136@gmail.com",
    pass: process.env.GMAIL_PASSWORD, // Use app password for Gmail
  },
});

// Test the transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.warn("Gmail transporter error:", error.message);
  } else if (success) {
    console.log("Gmail transporter is ready to send emails");
  }
});

// ================================
// SEND CONTACT MESSAGE
// ================================
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, email, subject, message",
      });
    }

    // Check if Gmail is properly configured
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_PASSWORD;

    if (!gmailUser || !gmailPassword || gmailPassword === "your_app_password_here") {
      console.warn("Gmail credentials not properly configured");
      return res.status(500).json({
        success: false,
        message: "Email service is not configured. Please contact support directly.",
      });
    }

    const contactEmail = process.env.CONTACT_EMAIL || "sharmapranshu136@gmail.com";

    // Email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        <p><strong>Category:</strong> ${category || "General"}</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        <h3 style="color: #0066cc;">Message:</h3>
        <p style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
          ${message.replace(/\n/g, "<br>")}
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from HealthPro. Please reply directly to the sender's email address.
        </p>
      </div>
    `;

    try {
      // Send email to support/contact email
      await transporter.sendMail({
        from: gmailUser,
        to: contactEmail,
        subject: `[HealthPro Contact] ${subject}`,
        html: htmlContent,
        replyTo: email,
      });

      // Optional: Send confirmation email to the user
      const confirmationEmail = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #0066cc;">Thank you for contacting HealthPro!</h2>
          <p>Dear ${name},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Your Message Details:</strong></p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Submitted on:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Our support team typically responds within 24 hours.</p>
          <p style="margin-top: 30px;">Best regards,<br><strong>HealthPro Support Team</strong></p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated confirmation email. Please do not reply to this email.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: gmailUser,
        to: email,
        subject: "HealthPro - We received your message",
        html: confirmationEmail,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError.message);
      return res.status(500).json({
        success: false,
        message: "Failed to send email. Email service may be temporarily unavailable. Please try again later.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Your message has been sent successfully. We'll respond shortly!",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ================================
// GET CONTACT INFO (for display on contact page)
// ================================
router.get("/info", async (req, res) => {
  try {
    const contactEmail = process.env.CONTACT_EMAIL || "sharmapranshu136@gmail.com";
    res.json([
      {
        iconName: "mail",
        title: "Email",
        value: contactEmail,
        description: "We'll respond within 24 hours",
      },
      {
        iconName: "phone",
        title: "Phone",
        value: "+1 (800) 555-CARE",
        description: "Monday - Friday, 8 AM - 8 PM EST",
      },
      {
        iconName: "map-pin",
        title: "Headquarters",
        value: "456 Healthcare Blvd, Boston, MA 02101",
        description: "Visit us for consultations",
      },
      {
        iconName: "clock",
        title: "Emergency Support",
        value: "+1 (800) 555-9999",
        description: "24/7 Available",
      },
    ]);
  } catch (error) {
    console.error("Contact info error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
