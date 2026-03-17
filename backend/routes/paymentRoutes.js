const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const authMiddleware = require("../middleware/authMiddleware");
const PaymentMethod = require("../models/PaymentMethod");
const BillingHistory = require("../models/BillingHistory");
const PaymentWebhookEvent = require("../models/PaymentWebhookEvent");
const User = require("../models/User");

const router = express.Router();

const UPI_ID_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;
const getUserId = (req) => req.user?.id || req.user?._id;
const generateInvoiceId = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const isAdmin = (req) => req.user?.role === "admin";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

const verifyRazorpaySignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected === signature;
};

const isLikelyPlaceholder = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("your_") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace") ||
    normalized === "your_razorpay_secret_here"
  );
};

// ================================
// CREATE RAZORPAY ORDER
// ================================
router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, currency = "INR", receipt, paymentType = "card", upiId, description, doctorId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!["card", "upi"].includes(paymentType)) {
      return res.status(400).json({ message: "Unsupported payment type" });
    }

    if (paymentType === "upi" && (!upiId || !UPI_ID_REGEX.test(String(upiId).trim()))) {
      return res.status(400).json({ message: "Enter a valid UPI ID" });
    }

    // Check if Razorpay is configured
    if (
      isLikelyPlaceholder(process.env.RAZORPAY_KEY_ID) ||
      isLikelyPlaceholder(process.env.RAZORPAY_KEY_SECRET)
    ) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not configured. Set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env.",
      });
    }

    const totalAmountPaise = Math.round(Number(amount) * 100);
    let recipientDoctor = null;

    if (doctorId) {
      recipientDoctor = await User.findOne({ _id: doctorId, role: "doctor" }).select("name");
      if (!recipientDoctor) {
        return res.status(400).json({ success: false, message: "Selected doctor not found" });
      }
    }

    const options = {
      amount: totalAmountPaise, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        userId: String(userId),
        paymentType,
        ...(doctorId ? { doctorId: String(doctorId) } : {}),
        ...(recipientDoctor?.name ? { doctorName: recipientDoctor.name } : {}),
        ...(paymentType === "upi" && upiId ? { upiId: String(upiId).trim().toLowerCase() } : {}),
        ...(description ? { description } : {}),
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ================================
// VERIFY PAYMENT
// ================================
router.post("/verify-payment", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isAuthentic = verifyRazorpaySignature(body, razorpay_signature, process.env.RAZORPAY_KEY_SECRET);

    if (isAuthentic) {
      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      const existing = await BillingHistory.findOne({ razorpayPaymentId: razorpay_payment_id });
      let billingEntry = existing;

      if (!billingEntry) {
        billingEntry = await BillingHistory.create({
          user: userId,
          description: payment.description || "Payment",
          amount: payment.amount / 100,
          currency: payment.currency || "INR",
          status: payment.status === "captured" ? "paid" : "created",
          invoiceId: generateInvoiceId(),
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          method: payment.method || null,
          notes: {
            upiId: payment.vpa || null,
            email: payment.email || null,
            contact: payment.contact || null,
            doctorId: payment.notes?.doctorId || null,
            doctorName: payment.notes?.doctorName || null,
            doctorTransferAmount: payment.notes?.doctorTransferAmountPaise
              ? Number(payment.notes.doctorTransferAmountPaise) / 100
              : null,
            platformFeeAmount: payment.notes?.platformFeeAmountPaise
              ? Number(payment.notes.platformFeeAmountPaise) / 100
              : null,
            platformFeePercent: payment.notes?.platformFeePercent
              ? Number(payment.notes.platformFeePercent)
              : null,
          },
        });
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
        payment,
        invoiceId: billingEntry.invoiceId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ================================
// SAVE PAYMENT METHOD
// ================================
router.post("/methods", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, last4, brand, expiryMonth, expiryYear, holderName, upiId } = req.body;

    if (!["card", "upi"].includes(type)) {
      return res.status(400).json({ success: false, message: "Unsupported payment method type" });
    }

    if (type === "upi") {
      const normalizedUpiId = String(upiId || "").trim().toLowerCase();
      if (!UPI_ID_REGEX.test(normalizedUpiId)) {
        return res.status(400).json({ success: false, message: "Invalid UPI ID" });
      }
    }

    if (type === "card" && (!last4 || !brand || !expiryMonth || !expiryYear || !holderName)) {
      return res.status(400).json({ success: false, message: "Incomplete card details" });
    }

    const existingCount = await PaymentMethod.countDocuments({ user: userId });
    const normalizedUpiId = type === "upi" ? String(upiId || "").trim().toLowerCase() : null;

    if (type === "upi" && normalizedUpiId) {
      const duplicate = await PaymentMethod.findOne({ user: userId, type: "upi", upiId: normalizedUpiId });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "UPI ID already saved" });
      }
    }

    const newMethod = await PaymentMethod.create({
      user: userId,
      type, // 'card' or 'upi'
      ...(type === "card" && {
        brand,
        last4,
        expiryMonth,
        expiryYear,
        holderName,
      }),
      ...(type === "upi" && { upiId: normalizedUpiId }),
      isDefault: existingCount === 0,
    });

    res.json({
      success: true,
      message: "Payment method added successfully",
      method: {
        id: newMethod._id,
        type: newMethod.type,
        brand: newMethod.brand,
        last4: newMethod.last4,
        expiry: newMethod.expiryMonth && newMethod.expiryYear ? `${newMethod.expiryMonth}/${newMethod.expiryYear}` : null,
        holderName: newMethod.holderName,
        upiId: newMethod.upiId,
        isDefault: newMethod.isDefault,
      },
    });
  } catch (error) {
    console.error("Save payment method error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save payment method",
    });
  }
});

// ================================
// GET PAYMENT METHODS
// ================================
router.get("/methods", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const methods = await PaymentMethod.find({ user: userId }).sort({ createdAt: -1 }).lean();

    const normalized = methods.map((method) => ({
      id: method._id,
      type: method.type,
      brand: method.brand,
      last4: method.last4,
      expiry: method.expiryMonth && method.expiryYear ? `${method.expiryMonth}/${method.expiryYear}` : null,
      holderName: method.holderName,
      upiId: method.upiId,
      isDefault: method.isDefault,
    }));

    res.json(normalized);
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ message: "Failed to fetch payment methods" });
  }
});

// ================================
// DELETE PAYMENT METHOD
// ================================
router.delete("/methods/:id", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const methodId = req.params.id;

    const method = await PaymentMethod.findOne({ _id: methodId, user: userId });
    if (!method) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    const wasDefault = method.isDefault;
    await PaymentMethod.deleteOne({ _id: methodId, user: userId });

    // If we deleted the default method, set a new default
    if (wasDefault) {
      const nextDefault = await PaymentMethod.findOne({ user: userId }).sort({ createdAt: 1 });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    res.json({
      success: true,
      message: "Payment method deleted successfully",
    });
  } catch (error) {
    console.error("Delete payment method error:", error);
    res.status(500).json({ message: "Failed to delete payment method" });
  }
});

// ================================
// SET DEFAULT PAYMENT METHOD
// ================================
router.put("/methods/:id/default", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const methodId = req.params.id;

    const targetMethod = await PaymentMethod.findOne({ _id: methodId, user: userId });
    if (!targetMethod) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    await PaymentMethod.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } });
    targetMethod.isDefault = true;
    await targetMethod.save();

    res.json({
      success: true,
      message: "Default payment method updated",
    });
  } catch (error) {
    console.error("Set default payment method error:", error);
    res.status(500).json({ message: "Failed to update default method" });
  }
});

// ================================
// GET BILLING HISTORY
// ================================
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const history = await BillingHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(200).lean();

    const normalized = history.map((item) => ({
      id: item._id,
      date: item.createdAt,
      description: item.description,
      amount: item.amount,
      status: item.status,
      invoiceId: item.invoiceId,
      razorpay_payment_id: item.razorpayPaymentId,
      razorpay_order_id: item.razorpayOrderId,
      method: item.method,
      notes: item.notes || {},
    }));

    res.json(normalized);
  } catch (error) {
    console.error("Get billing history error:", error);
    res.status(500).json({ message: "Failed to fetch billing history" });
  }
});

// ================================
// DOWNLOAD INVOICE
// ================================
router.get("/invoice/:invoiceId", authMiddleware, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = getUserId(req);

    const invoice = await BillingHistory.findOne({ invoiceId, user: userId }).lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const filename = `${invoiceId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    doc.fontSize(22).text("HealthPro", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor("#4b5563").text("Payment Invoice", { align: "left" });
    doc.moveDown();

    doc.fillColor("#111827").fontSize(11);
    doc.text(`Invoice ID: ${invoice.invoiceId}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Currency: ${invoice.currency || "INR"}`);
    doc.moveDown();

    doc.fontSize(12).text("Billing Details", { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(11);
    doc.text(`Description: ${invoice.description || "Payment"}`);
    doc.text(`Amount Paid: ${invoice.currency || "INR"} ${Number(invoice.amount || 0).toFixed(2)}`);
    doc.text(`Payment Method: ${invoice.method || "N/A"}`);
    doc.text(`Razorpay Payment ID: ${invoice.razorpayPaymentId || "N/A"}`);
    doc.text(`Razorpay Order ID: ${invoice.razorpayOrderId || "N/A"}`);

    if (invoice.notes && Object.keys(invoice.notes).length > 0) {
      doc.moveDown();
      doc.fontSize(12).text("Additional Details", { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(11);
      Object.entries(invoice.notes).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          doc.text(`${key}: ${value}`);
        }
      });
    }

    doc.moveDown(2);
    doc.fillColor("#6b7280").fontSize(10).text("This is a system-generated invoice from HealthPro.", { align: "left" });
    doc.end();
  } catch (error) {
    console.error("Download invoice error:", error);
    res.status(500).json({ message: "Failed to download invoice" });
  }
});

// ================================
// RAZORPAY WEBHOOK
// ================================
router.post("/webhook", async (req, res) => {
  let webhookLog = null;
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const eventName = req.body?.event || "unknown";
    const entityId = req.body?.payload?.payment?.entity?.id || req.body?.payload?.order?.entity?.id || null;

    webhookLog = await PaymentWebhookEvent.create({
      event: eventName,
      entityId,
      status: "received",
      message: "Webhook received",
      payload: req.body || {},
    });

    if (!verifyRazorpaySignature(rawBody, signature, secret)) {
      if (webhookLog) {
        webhookLog.status = "failed";
        webhookLog.message = "Invalid webhook signature";
        await webhookLog.save();
      }
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body;
    if (event?.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      const notes = payment?.notes || {};
      const userId = notes.userId || null;

      if (payment?.id && userId) {
        await BillingHistory.findOneAndUpdate(
          { razorpayPaymentId: payment.id },
          {
            $setOnInsert: {
              user: userId,
              invoiceId: generateInvoiceId(),
            },
            $set: {
              description: notes.description || payment.description || "Payment",
              amount: (payment.amount || 0) / 100,
              currency: payment.currency || "INR",
              status: "paid",
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id || null,
              method: payment.method || null,
              notes: {
                paymentType: notes.paymentType || null,
                upiId: notes.upiId || payment.vpa || null,
                doctorId: notes.doctorId || null,
                doctorName: notes.doctorName || null,
                doctorTransferAmount: notes.doctorTransferAmountPaise
                  ? Number(notes.doctorTransferAmountPaise) / 100
                  : null,
                platformFeeAmount: notes.platformFeeAmountPaise
                  ? Number(notes.platformFeeAmountPaise) / 100
                  : null,
                platformFeePercent: notes.platformFeePercent
                  ? Number(notes.platformFeePercent)
                  : null,
              },
            },
          },
          { upsert: true, new: true }
        );
      }

      if (webhookLog) {
        webhookLog.status = "processed";
        webhookLog.message = "payment.captured handled";
        await webhookLog.save();
      }
    } else if (webhookLog) {
      webhookLog.status = "ignored";
      webhookLog.message = `${event?.event || "unknown"} ignored`;
      await webhookLog.save();
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    if (webhookLog) {
      webhookLog.status = "failed";
      webhookLog.message = error.message || "Webhook processing failed";
      await webhookLog.save();
    }
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

// ================================
// ADMIN: WEBHOOK EVENTS
// ================================
router.get("/webhook-events", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const events = await PaymentWebhookEvent.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("event entityId status message createdAt")
      .lean();

    res.json({ success: true, events });
  } catch (error) {
    console.error("Get webhook events error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch webhook events" });
  }
});

// ================================
// ADMIN: DOCTOR PAYOUT ACCOUNTS
// ================================
router.get("/admin/doctor-payouts", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const doctors = await User.find({ role: "doctor" })
      .select("name email specialization razorpayRouteAccountId doctorUpiId")
      .sort({ name: 1 })
      .lean();

    const items = doctors.map((doctor) => ({
      id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      specialization: doctor.specialization || "",
      razorpayRouteAccountId: doctor.razorpayRouteAccountId || "",
      doctorUpiId: doctor.doctorUpiId || "",
      payoutConfigured: Boolean(doctor.razorpayRouteAccountId || doctor.doctorUpiId),
    }));

    res.json({ success: true, doctors: items });
  } catch (error) {
    console.error("Get doctor payout accounts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch doctor payout accounts" });
  }
});

router.put("/admin/doctor-payouts/:doctorId", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { doctorId } = req.params;
    const routeAccountId = String(req.body.razorpayRouteAccountId || "").trim();
    const doctorUpiId = String(req.body.doctorUpiId || "").trim().toLowerCase();

    if (routeAccountId && !/^acc_[a-zA-Z0-9]+$/.test(routeAccountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay Route account ID format. Expected pattern like acc_XXXXXXXXXXXX",
      });
    }

    if (doctorUpiId && !UPI_ID_REGEX.test(doctorUpiId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor UPI ID format. Expected value like doctor@bank",
      });
    }

    const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    doctor.razorpayRouteAccountId = routeAccountId || null;
    doctor.doctorUpiId = doctorUpiId || null;
    await doctor.save();

    const isConfigured = Boolean(doctor.razorpayRouteAccountId || doctor.doctorUpiId);

    res.json({
      success: true,
      message: isConfigured ? "Doctor payout details updated" : "Doctor payout details removed",
      doctor: {
        id: doctor._id,
        name: doctor.name,
        razorpayRouteAccountId: doctor.razorpayRouteAccountId || "",
        doctorUpiId: doctor.doctorUpiId || "",
        payoutConfigured: isConfigured,
      },
    });
  } catch (error) {
    console.error("Update doctor payout account error:", error);
    res.status(500).json({ success: false, message: "Failed to update doctor payout account" });
  }
});

module.exports = router;
