const isTruthy = (value) => ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());

let twilioClient = null;
let mailTransporter = null;

const normalizePhoneNumber = (phone, defaultCountryCode = "+91") => {
  const raw = String(phone || "").trim();
  if (!raw) return "";

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (hasPlus) {
    return `+${digits}`;
  }

  // If already looks like country code + number without plus
  if (digits.length > 10) {
    return `+${digits}`;
  }

  return `${defaultCountryCode}${digits}`;
};

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return null;
  }

  const twilio = require("twilio");
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

const getMailTransporter = () => {
  if (mailTransporter) return mailTransporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 0);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASSWORD;

  const nodemailer = require("nodemailer");

  if (smtpHost && smtpPort && smtpUser && smtpPass) {
    mailTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    return mailTransporter;
  }

  if (gmailUser && gmailPass) {
    mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
    return mailTransporter;
  }

  return null;
};

const sendInAppReminder = (io, userId, payload) => {
  if (!io || !userId) return false;
  io.to(`user_${userId}`).emit("notification", payload);
  return true;
};

const sendEmailReminder = async ({ toEmail, subject, text }) => {
  if (!toEmail) return { delivered: false, reason: "missing-email" };

  if (!isTruthy(process.env.ENABLE_EMAIL_REMINDERS)) {
    return { delivered: false, reason: "email-provider-disabled" };
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    return { delivered: false, reason: "email-credentials-missing" };
  }

  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER;

  if (!fromAddress) {
    return { delivered: false, reason: "email-from-missing" };
  }

  try {
    const result = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: String(subject || "HealthPro appointment reminder").slice(0, 150),
      text: String(text || "").slice(0, 4000),
    });

    return { delivered: true, providerMessageId: result.messageId };
  } catch (error) {
    console.warn("Reminder email send failed:", error.message);
    return { delivered: false, reason: "email-send-failed", error: error.message };
  }
};

const sendSmsReminder = async ({ toPhone, message }) => {
  if (!toPhone) return { delivered: false, reason: "missing-phone" };

  if (!isTruthy(process.env.ENABLE_SMS_REMINDERS)) {
    return { delivered: false, reason: "sms-provider-disabled" };
  }

  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  if (!fromPhone) {
    return { delivered: false, reason: "twilio-from-missing" };
  }

  const to = normalizePhoneNumber(toPhone, process.env.DEFAULT_COUNTRY_CODE || "+91");
  if (!to) {
    return { delivered: false, reason: "invalid-destination-phone" };
  }

  const client = getTwilioClient();
  if (!client) {
    return { delivered: false, reason: "twilio-credentials-missing" };
  }

  try {
    const response = await client.messages.create({
      from: fromPhone,
      to,
      body: String(message || "").trim().slice(0, 1600),
    });
    return { delivered: true, providerMessageId: response.sid };
  } catch (error) {
    console.warn("Twilio SMS send failed:", error.message);
    return { delivered: false, reason: "twilio-send-failed", error: error.message };
  }

};

module.exports = {
  sendInAppReminder,
  sendEmailReminder,
  sendSmsReminder,
};
