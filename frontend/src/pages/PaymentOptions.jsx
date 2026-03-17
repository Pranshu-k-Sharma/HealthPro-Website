import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE } from '../config';
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  Loader,
  Smartphone,
  Search,
  Eye,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const UPI_ID_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;
const PAYMENT_TYPE_STORAGE_KEY = "healthpro-payment-type";
const UPI_APP_STORAGE_KEY = "healthpro-upi-app";
const PLATFORM_UPI_ID = import.meta.env.VITE_HEALTHPRO_UPI_ID || "healthpro@upi";
const PLATFORM_UPI_QR = import.meta.env.VITE_HEALTHPRO_UPI_QR_PATH || "";

// Load Razorpay script
const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (existingScript) {
    return new Promise((resolve) => {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function PaymentOptions() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isAdmin = role === "admin";
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentType, setPaymentType] = useState(() => localStorage.getItem(PAYMENT_TYPE_STORAGE_KEY) || "card"); // 'card' or 'upi'
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentMessageType, setPaymentMessageType] = useState("info");
  const [preferredUpiApp, setPreferredUpiApp] = useState(() => localStorage.getItem(UPI_APP_STORAGE_KEY) || "google-pay");
  const [logoLoadFailed, setLogoLoadFailed] = useState({});
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookEventFilter, setWebhookEventFilter] = useState("all");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("all");
  const [doctorPayouts, setDoctorPayouts] = useState([]);
  const [doctorPayoutDrafts, setDoctorPayoutDrafts] = useState({});
  const [doctorUpiDrafts, setDoctorUpiDrafts] = useState({});
  const [doctorPayoutLoading, setDoctorPayoutLoading] = useState(false);
  const [savingDoctorPayoutId, setSavingDoctorPayoutId] = useState("");
  const [pendingAppointmentPayments, setPendingAppointmentPayments] = useState([]);
  const [pendingAppointmentLoading, setPendingAppointmentLoading] = useState(false);
  const [reviewingAppointmentId, setReviewingAppointmentId] = useState("");
  const [appointmentPaymentSearch, setAppointmentPaymentSearch] = useState("");
  const [appointmentPaymentDateFilter, setAppointmentPaymentDateFilter] = useState("");
  const [reviewNotesByAppointment, setReviewNotesByAppointment] = useState({});
  const [proofPreview, setProofPreview] = useState({ open: false, url: "", title: "" });
  const [reminderStatus, setReminderStatus] = useState(null);
  const [reminderStatusLoading, setReminderStatusLoading] = useState(false);
  const [reminderAutoRefresh, setReminderAutoRefresh] = useState(true);
  const [reminderLastFetchedAt, setReminderLastFetchedAt] = useState(null);
  const [reminderDeliveryLogs, setReminderDeliveryLogs] = useState([]);
  const [reminderDeliveryLoading, setReminderDeliveryLoading] = useState(false);
  const [reminderDeliveryChannelFilter, setReminderDeliveryChannelFilter] = useState("all");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  useEffect(() => {
    let isMounted = true;

    loadRazorpayScript().then((loaded) => {
      if (isMounted) {
        setRazorpayReady(loaded);
      }
    });

    fetchPaymentData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(PAYMENT_TYPE_STORAGE_KEY, paymentType);
  }, [paymentType]);

  useEffect(() => {
    localStorage.setItem(UPI_APP_STORAGE_KEY, preferredUpiApp);
  }, [preferredUpiApp]);

  const fetchWebhookEvents = async () => {
    if (!isAdmin) return;

    setWebhookLoading(true);
    try {
      const webhookResponse = await fetch(`${API_BASE}/api/payments/webhook-events?limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (webhookResponse.ok) {
        const payload = await webhookResponse.json();
        setWebhookEvents(payload.events || []);
      }
    } catch (err) {
      console.error("Error fetching webhook events:", err);
    } finally {
      setWebhookLoading(false);
    }
  };

  const fetchDoctorPayouts = async () => {
    if (!isAdmin) return;

    setDoctorPayoutLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/payments/admin/doctor-payouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const payload = await response.json();
        const items = payload.doctors || [];
        setDoctorPayouts(items);

        const drafts = {};
        const upiDrafts = {};
        items.forEach((doctor) => {
          drafts[doctor.id] = doctor.razorpayRouteAccountId || "";
          upiDrafts[doctor.id] = doctor.doctorUpiId || "";
        });
        setDoctorPayoutDrafts(drafts);
        setDoctorUpiDrafts(upiDrafts);
      }
    } catch (err) {
      console.error("Error fetching doctor payout settings:", err);
    } finally {
      setDoctorPayoutLoading(false);
    }
  };

  const handleSaveDoctorPayout = async (doctorId) => {
    try {
      setSavingDoctorPayoutId(doctorId);
      const routeAccountValue = String(doctorPayoutDrafts[doctorId] || "").trim();
      const doctorUpiValue = String(doctorUpiDrafts[doctorId] || "").trim().toLowerCase();

      const response = await fetch(`${API_BASE}/api/payments/admin/doctor-payouts/${doctorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpayRouteAccountId: routeAccountValue,
          doctorUpiId: doctorUpiValue,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Failed to save payout account");
      }

      setStatusMessage(payload.message || "Doctor payout account saved", "success");
      await fetchDoctorPayouts();
    } catch (err) {
      setStatusMessage(err.message || "Failed to save payout account", "error");
    } finally {
      setSavingDoctorPayoutId("");
    }
  };

  const fetchPendingAppointmentPayments = async () => {
    if (!isAdmin) return;

    setPendingAppointmentLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/appointments/payments/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const payload = await response.json();
        setPendingAppointmentPayments(payload || []);
      }
    } catch (err) {
      console.error("Error fetching pending appointment payments:", err);
    } finally {
      setPendingAppointmentLoading(false);
    }
  };

  const fetchReminderStatus = useCallback(async () => {
    if (!isAdmin) return;

    setReminderStatusLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/appointments/admin/reminders/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const payload = await response.json();
        setReminderStatus(payload || null);
        setReminderLastFetchedAt(new Date());
      }
    } catch (err) {
      console.error("Error fetching reminder status:", err);
    } finally {
      setReminderStatusLoading(false);
    }
  }, [isAdmin, token]);

  const fetchReminderDeliveries = useCallback(async () => {
    if (!isAdmin) return;

    setReminderDeliveryLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/appointments/admin/reminders/deliveries?delivered=false&limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const payload = await response.json();
        setReminderDeliveryLogs(Array.isArray(payload) ? payload : []);
      }
    } catch (err) {
      console.error("Error fetching reminder delivery logs:", err);
    } finally {
      setReminderDeliveryLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !reminderAutoRefresh) return undefined;

    const timer = window.setInterval(() => {
      fetchReminderStatus();
      fetchReminderDeliveries();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [isAdmin, reminderAutoRefresh, fetchReminderStatus, fetchReminderDeliveries]);

  const handleReviewAppointmentPayment = async (appointmentId, action) => {
    try {
      setReviewingAppointmentId(`${appointmentId}-${action}`);
      const reviewNotes = String(reviewNotesByAppointment[appointmentId] || "").trim();
      const response = await fetch(`${API_BASE}/api/appointments/payments/${appointmentId}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, notes: reviewNotes }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Failed to review appointment payment");
      }

      setStatusMessage(payload.message || "Appointment payment reviewed", "success");
      setReviewNotesByAppointment((prev) => {
        const next = { ...prev };
        delete next[appointmentId];
        return next;
      });
      await fetchPendingAppointmentPayments();
    } catch (err) {
      setStatusMessage(err.message || "Failed to review appointment payment", "error");
    } finally {
      setReviewingAppointmentId("");
    }
  };

  const fetchPaymentData = async () => {
    try {
      setLoading(true);

      const methodsResponse = await fetch(`${API_BASE}/api/payments/methods`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const historyResponse = await fetch(`${API_BASE}/api/payments/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (methodsResponse.ok) {
        setPaymentMethods(await methodsResponse.json());
      }

      if (historyResponse.ok) {
        setBillingHistory(await historyResponse.json());
      }

      if (role === "patient") {
        const doctorsResponse = await fetch(`${API_BASE}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (doctorsResponse.ok) {
          const users = await doctorsResponse.json();
          const doctorList = users
            .filter((user) => user.role === "doctor")
            .map((doctor) => ({
              ...doctor,
              payoutConfigured: Boolean(doctor.razorpayRouteAccountId || doctor.doctorUpiId),
            }));

          setDoctors(doctorList);

          const configuredDoctor = doctorList.find((doctor) => doctor.payoutConfigured);

          if (!selectedDoctorId && doctorList.length > 0) {
            setSelectedDoctorId((configuredDoctor || doctorList[0])._id);
          }

          if (selectedDoctorId) {
            const selectedExists = doctorList.some((doctor) => doctor._id === selectedDoctorId);
            if (!selectedExists) {
              setSelectedDoctorId((configuredDoctor || doctorList[0])?._id || "");
            }
          }
        }
      }

      if (isAdmin) {
        await fetchWebhookEvents();
        await fetchDoctorPayouts();
        await fetchPendingAppointmentPayments();
        await fetchReminderStatus();
        await fetchReminderDeliveries();
      }
    } catch (err) {
      console.error("Error fetching payment data:", err);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    upiId: "",
    testAmount: "100",
  });

  const normalizedUpiId = formData.upiId.trim().toLowerCase();
  const isUpiValid = UPI_ID_REGEX.test(normalizedUpiId);
  const upiApps = [
    {
      id: "google-pay",
      label: "Google Pay",
      shortLabel: "GPay",
      accent: "bg-sky-500",
      logoPaths: [
        "/images/payments/google_pay.png",
        "/images/payments/google-pay.png",
        "/images/payments/google-pay.jpg",
        "/images/payments/google-pay.jpeg",
        "/images/payments/google-pay.webp",
        "/images/payments/google-pay.svg",
      ],
    },
    {
      id: "phonepe",
      label: "PhonePe",
      shortLabel: "Pe",
      accent: "bg-violet-600",
      logoPaths: [
        "/images/payments/Phonepe.png",
        "/images/payments/phone_pe.png",
        "/images/payments/phonepe.png",
        "/images/payments/phonepe.jpg",
        "/images/payments/phonepe.jpeg",
        "/images/payments/phonepe.webp",
        "/images/payments/phonepe.svg",
      ],
    },
    {
      id: "paytm",
      label: "Paytm",
      shortLabel: "Paytm",
      accent: "bg-cyan-600",
      logoPaths: [
        "/images/payments/Paytm.png",
        "/images/payments/paytm.png",
        "/images/payments/paytm.jpg",
        "/images/payments/paytm.jpeg",
        "/images/payments/paytm.webp",
        "/images/payments/paytm.svg",
      ],
    },
    {
      id: "bhim",
      label: "BHIM",
      shortLabel: "BHIM",
      accent: "bg-orange-500",
      logoPaths: [
        "/images/payments/BHIM.png",
        "/images/payments/bhim.png",
        "/images/payments/bhim.jpg",
        "/images/payments/bhim.jpeg",
        "/images/payments/bhim.webp",
        "/images/payments/bhim.svg",
      ],
    },
  ];
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const selectedUpiApp = upiApps.find((app) => app.id === preferredUpiApp) || upiApps[0];

  const buildUpiIntentUrl = (appId) => {
    const paymentAmount = formData.testAmount || "";
    const paymentNote = "HealthPro Payment";

    switch (appId) {
      case "phonepe":
        return `phonepe://pay?pa=${encodeURIComponent(PLATFORM_UPI_ID)}&pn=HealthPro&am=${paymentAmount}&cu=INR&tn=${encodeURIComponent(paymentNote)}`;
      case "google-pay":
        return `tez://upi/pay?pa=${encodeURIComponent(PLATFORM_UPI_ID)}&pn=HealthPro&am=${paymentAmount}&cu=INR&tn=${encodeURIComponent(paymentNote)}`;
      case "paytm":
        return `paytmmp://pay?pa=${encodeURIComponent(PLATFORM_UPI_ID)}&pn=HealthPro&am=${paymentAmount}&cu=INR&tn=${encodeURIComponent(paymentNote)}`;
      default:
        return `upi://pay?pa=${encodeURIComponent(PLATFORM_UPI_ID)}&pn=HealthPro&am=${paymentAmount}&cu=INR&tn=${encodeURIComponent(paymentNote)}`;
    }
  };

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobileViewport(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleCopyPlatformUpi = async () => {
    try {
      await navigator.clipboard.writeText(PLATFORM_UPI_ID);
      setCopiedUpi(true);
      window.setTimeout(() => setCopiedUpi(false), 1500);
    } catch {}
  };

  const setStatusMessage = (message, type = "info") => {
    setPaymentMessage(message);
    setPaymentMessageType(type);
  };

  const renderUpiAppMark = (app) => {
    const activeLogoPath = app.logoPaths.find((path, index) => !logoLoadFailed[`${app.id}-${index}`]);

    if (activeLogoPath) {
      return (
        <img
          src={activeLogoPath}
          alt={`${app.label} logo`}
          className="h-6 w-6 rounded-full object-contain bg-white p-0.5"
          onError={() => {
            const activeIndex = app.logoPaths.indexOf(activeLogoPath);
            if (activeIndex >= 0) {
              setLogoLoadFailed((prev) => ({ ...prev, [`${app.id}-${activeIndex}`]: true }));
            }
          }}
        />
      );
    }

    return (
      <span className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold text-white ${app.accent}`}>
        {app.shortLabel}
      </span>
    );
  };

  const filteredWebhookEvents = webhookEvents.filter((event) => {
    const matchesEvent = webhookEventFilter === "all" || event.event === webhookEventFilter;
    const matchesStatus = webhookStatusFilter === "all" || event.status === webhookStatusFilter;
    return matchesEvent && matchesStatus;
  });

  const webhookEventOptions = [
    "all",
    ...Array.from(new Set(webhookEvents.map((event) => event.event).filter(Boolean))),
  ];

  const webhookStatusOptions = ["all", "received", "processed", "ignored", "failed"];
  const selectedDoctor = doctors.find((doctor) => doctor._id === selectedDoctorId) || null;
  const normalizedAppointmentSearch = appointmentPaymentSearch.trim().toLowerCase();
  const filteredPendingAppointmentPayments = pendingAppointmentPayments.filter((appointment) => {
    const patientName = String(appointment.patient?.name || "").toLowerCase();
    const doctorName = String(appointment.doctor?.name || "").toLowerCase();
    const reference = String(appointment.paymentReference || "").toLowerCase();
    const specialization = String(appointment.doctor?.specialization || "").toLowerCase();

    const matchesText = !normalizedAppointmentSearch
      || patientName.includes(normalizedAppointmentSearch)
      || doctorName.includes(normalizedAppointmentSearch)
      || reference.includes(normalizedAppointmentSearch)
      || specialization.includes(normalizedAppointmentSearch);

    if (!matchesText) return false;
    if (!appointmentPaymentDateFilter) return true;

    const dateText = new Date(appointment.appointmentDate).toISOString().slice(0, 10);
    return dateText === appointmentPaymentDateFilter;
  });

  const openProofPreview = (appointment) => {
    if (!appointment?.paymentProofUrl) return;
    setProofPreview({
      open: true,
      url: `${API_BASE}${appointment.paymentProofUrl}`,
      title: `${appointment.patient?.name || "Patient"} → Dr. ${appointment.doctor?.name || "Doctor"}`,
    });
  };

  const reminderPending24h = reminderStatus?.pendingCandidates?.reminder24h ?? 0;
  const reminderPending1h = reminderStatus?.pendingCandidates?.reminder1h ?? 0;
  const lastRunAt = reminderStatus?.scheduler?.lastRunAt
    ? new Date(reminderStatus.scheduler.lastRunAt).toLocaleString()
    : "-";
  const lastSuccessAt = reminderStatus?.scheduler?.lastSuccessAt
    ? new Date(reminderStatus.scheduler.lastSuccessAt).toLocaleString()
    : "-";
  const reminderLastError = reminderStatus?.scheduler?.lastError?.message || "";
  const reminderLastCycle24hSent = reminderStatus?.scheduler?.lastCycleStats?.reminder24h?.sentCount ?? 0;
  const reminderLastCycle1hSent = reminderStatus?.scheduler?.lastCycleStats?.reminder1h?.sentCount ?? 0;
  const reminderFetchedAtText = reminderLastFetchedAt
    ? reminderLastFetchedAt.toLocaleTimeString()
    : "-";
  const reminderFailedLast24h = reminderStatus?.delivery?.failedLast24h ?? 0;

  const filteredReminderDeliveryLogs = reminderDeliveryLogs.filter((log) => {
    if (reminderDeliveryChannelFilter === "all") return true;
    return log.channel === reminderDeliveryChannelFilter;
  });

  const validatePaymentForm = () => {
    const amount = Number(formData.testAmount);
    if (!amount || amount <= 0) {
      setStatusMessage("Enter a valid payment amount.", "error");
      return false;
    }

    if (role === "patient" && !selectedDoctorId) {
      setStatusMessage("Please select a doctor to receive this payment.", "error");
      return false;
    }

    if (paymentType === "upi") {
      if (!isUpiValid) {
        setStatusMessage("Enter a valid UPI ID such as name@paytm or success@razorpay.", "error");
        return false;
      }
      return true;
    }

    if (formData.cardNumber.length !== 16 || !formData.cardHolder || formData.expiryMonth.length !== 2 || formData.expiryYear.length !== 2 || formData.cvv.length !== 3) {
      setStatusMessage("Enter complete card details before continuing.", "error");
      return false;
    }

    return true;
  };

  const handleTestPayment = async () => {
    try {
      if (!validatePaymentForm()) return;

      if (!window.Razorpay) {
        throw new Error("Secure checkout is still loading. Refresh the page and try again.");
      }

      setProcessing(true);
      setStatusMessage(paymentType === "upi" ? "Opening secure UPI checkout..." : "Opening secure card checkout...", "info");

      const orderResponse = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(formData.testAmount),
          currency: "INR",
          paymentType,
          upiId: paymentType === "upi" ? normalizedUpiId : undefined,
          description: paymentType === "upi" ? "UPI test payment" : "Card test payment",
          doctorId: role === "patient" ? selectedDoctorId : undefined,
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.message || "Failed to create order");
      }

      const orderData = await orderResponse.json();

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "HealthPro",
        description: "Test Payment",
        order_id: orderData.order.id,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(`${API_BASE}/api/payments/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(response),
            });

            if (verifyResponse.ok) {
              setStatusMessage(paymentType === "upi" ? "UPI payment successful." : "Card payment successful.", "success");
              
              if (paymentType === "card" && formData.cardNumber) {
                await savePaymentMethod();
              } else if (paymentType === "upi" && formData.upiId) {
                await savePaymentMethod();
              }

              fetchPaymentData();
              setShowAddPayment(false);
              resetForm();
            } else {
              setStatusMessage("Payment verification failed.", "error");
            }
          } catch (error) {
            console.error("Verification error:", error);
            setStatusMessage("Payment verification failed.", "error");
          }
        },
        prefill: {
          name: formData.cardHolder || "User",
          email: "user@example.com",
          ...(paymentType === "upi" ? { method: "upi", vpa: normalizedUpiId } : {}),
        },
        theme: {
          color: "#2563eb",
        },
        method: {
          card: paymentType === "card",
          upi: paymentType === "upi",
          netbanking: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setStatusMessage(`Payment failed: ${response.error.description}`, "error");
      });
      rzp.open();
    } catch (error) {
      setStatusMessage(error.message || "Payment failed. Please try again.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const savePaymentMethod = async () => {
    try {
      const payload = paymentType === "card"
        ? {
            type: "card",
            brand: formData.cardNumber.startsWith("4") ? "Visa" : "Mastercard",
            last4: formData.cardNumber.slice(-4),
            expiryMonth: formData.expiryMonth,
            expiryYear: formData.expiryYear,
            holderName: formData.cardHolder,
          }
        : {
            type: "upi",
            upiId: normalizedUpiId,
          };

      const response = await fetch(`${API_BASE}/api/payments/methods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to save payment method");
      }
    } catch (error) {
      console.error("Save payment method error:", error);
      setStatusMessage(error.message || "Failed to save payment method", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      cardNumber: "",
      cardHolder: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      upiId: "",
      testAmount: "100",
    });
    setStatusMessage("", "info");
    if (role !== "patient") {
      setSelectedDoctorId("");
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm("Remove this payment method?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/payments/methods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) fetchPaymentData();
    } catch (error) {
      alert("Failed to delete payment method");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await fetch(`${API_BASE}/api/payments/methods/${id}/default`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPaymentData();
    } catch (error) {
      console.error("Set default error:", error);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await fetch(`${API_BASE}/api/payments/invoice/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = `${invoiceId}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setStatusMessage(`Invoice ${invoiceId} downloaded.`, "success");
      } else {
        const message = await response.json().catch(() => ({}));
        setStatusMessage(message.message || "Failed to download invoice", "error");
      }
    } catch (error) {
      console.error("Download invoice error:", error);
      setStatusMessage("Failed to download invoice", "error");
    }
  };

  return (
    <Layout>
      <div className="relative overflow-hidden bg-brand-gradient text-white shadow-button mb-6 sm:mb-8">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-blue-100 hover:text-white transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
              <Sparkles size={13} />
              Payments Hub
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
              <ShieldCheck size={13} />
              Secure Checkout
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white">Payment Options</h1>
          <p className="text-blue-100 mt-2 max-w-2xl">Manage saved methods, track billing history, and monitor payment operations from one place.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-600" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-8 space-y-8">
              {/* Payment Methods */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
                  <button
                    onClick={() => setShowAddPayment(!showAddPayment)}
                    className="flex items-center gap-2 bg-brand-gradient text-white px-4 py-2 rounded-xl hover:shadow-lg transition font-medium"
                  >
                    <Plus size={18} />
                    Add Payment
                  </button>
                </div>

                {/* Add Payment Form */}
                {showAddPayment && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                    {role === "patient" && (
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Who should receive this payment?</label>
                        <select
                          value={selectedDoctorId}
                          onChange={(e) => setSelectedDoctorId(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a doctor</option>
                          {doctors.map((doctor) => (
                            <option key={doctor._id} value={doctor._id}>
                              Dr. {doctor.name}
                            </option>
                          ))}
                        </select>
                        {selectedDoctor && (
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-xs text-emerald-700">
                            Recipient: Dr. {selectedDoctor.name}
                            {selectedDoctor.specialization ? ` (${selectedDoctor.specialization})` : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 mb-4">
                      <button
                        onClick={() => setPaymentType("card")}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                          paymentType === "card"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        <CreditCard className="inline mr-2" size={18} />
                        Card
                      </button>
                      <button
                        onClick={() => setPaymentType("upi")}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                          paymentType === "upi"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        <Smartphone className="inline mr-2" size={18} />
                        UPI
                        {isMobileViewport && <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">Recommended</span>}
                      </button>
                    </div>

                    {paymentType === "card" ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Card Number (16 digits)"
                          maxLength="16"
                          value={formData.cardNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Cardholder Name"
                          value={formData.cardHolder}
                          onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder="MM"
                            maxLength="2"
                            value={formData.expiryMonth}
                            onChange={(e) =>
                              setFormData({ ...formData, expiryMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })
                            }
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="YY"
                            maxLength="2"
                            value={formData.expiryYear}
                            onChange={(e) =>
                              setFormData({ ...formData, expiryYear: e.target.value.replace(/\D/g, "").slice(0, 2) })
                            }
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="CVV"
                            maxLength="3"
                            value={formData.cvv}
                            onChange={(e) =>
                              setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) })
                            }
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">UPI ID</label>
                          <input
                            type="text"
                            placeholder="yourname@bank"
                            value={formData.upiId}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                upiId: e.target.value.trimStart(),
                              })
                            }
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck="false"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                              formData.upiId && !isUpiValid
                                ? "border-red-300 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                          />
                          <p className={`mt-2 text-xs ${formData.upiId && !isUpiValid ? "text-red-600" : "text-gray-500"}`}>
                            {formData.upiId && !isUpiValid
                              ? "Enter a valid UPI ID like name@paytm or success@razorpay."
                              : "Enter the UPI ID you want to pay with during checkout."}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Preferred UPI app</p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {upiApps.map((app) => {
                              const isSelected = preferredUpiApp === app.id;

                              return (
                                <button
                                  key={app.id}
                                  type="button"
                                  onClick={() => setPreferredUpiApp(app.id)}
                                  className={`rounded-xl border px-3 py-3 text-left transition ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50 shadow-sm"
                                      : "border-gray-200 bg-white hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {renderUpiAppMark(app)}
                                    <span className="text-sm font-semibold text-gray-800">{app.label}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {isMobileViewport ? (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700">Tap to open your preferred UPI app</p>
                            <a
                              href={buildUpiIntentUrl(selectedUpiApp?.id)}
                              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
                            >
                              {selectedUpiApp ? renderUpiAppMark(selectedUpiApp) : null}
                              Open {selectedUpiApp?.label || "UPI app"}
                            </a>
                            <a
                              href={buildUpiIntentUrl("generic")}
                              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
                            >
                              <Smartphone size={16} />
                              Open in any UPI app
                            </a>
                            <p className="text-xs text-gray-500">UPI ID: <span className="font-semibold">{PLATFORM_UPI_ID}</span></p>
                          </div>
                        ) : (
                          PLATFORM_UPI_QR ? (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                              <img
                                src={PLATFORM_UPI_QR}
                                alt="HealthPro UPI QR"
                                className="mx-auto h-48 w-48 rounded-lg border border-blue-200 bg-white object-contain p-2"
                              />
                              <p className="mt-2 text-sm text-blue-800 font-medium">Scan to pay</p>
                              <div className="mt-2 flex items-center justify-center gap-2">
                                <span className="font-mono text-sm text-blue-900">{PLATFORM_UPI_ID}</span>
                                <button
                                  type="button"
                                  onClick={handleCopyPlatformUpi}
                                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
                                >
                                  {copiedUpi ? "Copied ✓" : "Copy"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                              Set <span className="font-semibold">VITE_HEALTHPRO_UPI_QR_PATH</span> in your .env to show the QR code here.
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Test Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.testAmount}
                        onChange={(e) => setFormData({ ...formData, testAmount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleTestPayment}
                        disabled={processing || !razorpayReady}
                        className="flex-1 bg-brand-gradient text-white py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                      >
                        {processing
                          ? "Processing..."
                          : !razorpayReady
                            ? "Loading secure checkout..."
                            : paymentType === "upi"
                              ? "Pay with UPI"
                              : "Pay with Card"}
                      </button>
                      <button
                        onClick={() => setShowAddPayment(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    </div>

                    {paymentMessage && (
                      <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${paymentMessageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : paymentMessageType === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                        {paymentMessage}
                      </div>
                    )}
                  </div>
                )}

                {/* Saved Payment Methods */}
                <div className="space-y-3">
                  {paymentMethods.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No payment methods saved yet</p>
                  ) : (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPayment(selectedPayment === method.id ? null : method.id)}
                        className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                          method.isDefault
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {method.type === "card" ? (
                                <CreditCard className="text-gray-700" size={20} />
                              ) : (
                                <Smartphone className="text-gray-700" size={20} />
                              )}
                            </div>
                            <div>
                              {method.type === "card" ? (
                                <>
                                  <p className="font-bold text-gray-900">
                                    {method.brand} •••• {method.last4}
                                  </p>
                                  <p className="text-sm text-gray-600">{method.holderName}</p>
                                  <p className="text-xs text-gray-500">Expires {method.expiry}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-bold text-gray-900">UPI</p>
                                  <p className="text-sm text-gray-600">{method.upiId}</p>
                                </>
                              )}
                            </div>
                          </div>
                          {method.isDefault && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              <CheckCircle size={12} />
                              Default
                            </span>
                          )}
                        </div>

                        {selectedPayment === method.id && (
                          <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
                            {!method.isDefault && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(method.id);
                                }}
                                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition"
                              >
                                Set as Default
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePayment(method.id);
                              }}
                              className="px-3 py-1.5 border border-red-300 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Billing History */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing History</h2>

                {billingHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No billing history yet</p>
                ) : (
                  <div className="space-y-3">
                    {billingHistory.map((billing) => (
                      <div key={billing.id} className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{billing.description}</p>
                            <p className="text-sm text-gray-600">{new Date(billing.date).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{billing.invoiceId}</p>
                            {billing.notes?.doctorName && (
                              <p className="text-xs text-emerald-700 mt-1">Paid to: Dr. {billing.notes.doctorName}</p>
                            )}
                            {billing.notes?.platformFeeAmount !== null && billing.notes?.platformFeeAmount !== undefined && (
                              <p className="text-xs text-gray-500 mt-1">
                                Platform fee: ₹{Number(billing.notes.platformFeeAmount).toFixed(2)}
                                {billing.notes?.platformFeePercent ? ` (${billing.notes.platformFeePercent}%)` : ""}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">₹{billing.amount.toFixed(2)}</p>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              {billing.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadInvoice(billing.invoiceId)}
                          className="mt-2 text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
                        >
                          <Download size={16} />
                          Download Invoice
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Payment Security Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-blue-900 mb-1">Secure Payment</p>
                    <p className="text-sm text-blue-800">
                      All transactions are encrypted using SSL technology and processed securely through Razorpay.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">UPI Quick Guide</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>Best for fast payments on mobile devices using Google Pay, PhonePe, Paytm, or BHIM.</p>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <p className="font-semibold text-emerald-800">Recommended flow</p>
                    <p className="text-emerald-700 mt-1">Enter a valid UPI ID, choose UPI, then complete the approval in your UPI app.</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                    <p className="font-semibold text-slate-800">Test mode</p>
                    <p className="mt-1">Use success@razorpay for successful test payments and failure@razorpay for failed test payments.</p>
                  </div>
                </div>
              </div>

              {/* Setup Instructions */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">How to Setup</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-bold">1.</span>
                    <span>Sign up at <a href="https://dashboard.razorpay.com" target="_blank" className="text-blue-600 underline">Razorpay</a></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">2.</span>
                    <span>Get your API keys from Settings → API Keys</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">3.</span>
                    <span>Add keys to backend .env file</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">4.</span>
                    <span>Test with the amount above</span>
                  </li>
                </ol>
              </div>

              {isAdmin && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-gray-900">Reminder Monitor (Admin)</h3>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={reminderAutoRefresh}
                          onChange={(e) => setReminderAutoRefresh(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Auto refresh (30s)
                      </label>
                      <button
                        onClick={fetchReminderStatus}
                        disabled={reminderStatusLoading}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                      >
                        <RefreshCw size={13} className={reminderStatusLoading ? "animate-spin" : ""} />
                        {reminderStatusLoading ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                  </div>

                  {reminderStatusLoading && !reminderStatus ? (
                    <p className="text-sm text-gray-500">Loading reminder status...</p>
                  ) : !reminderStatus ? (
                    <p className="text-sm text-gray-500">Reminder status is unavailable right now.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <p className="text-[11px] font-semibold text-amber-700">24h pending</p>
                          <p className="text-lg font-bold text-amber-900">{reminderPending24h}</p>
                        </div>
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                          <p className="text-[11px] font-semibold text-indigo-700">1h pending</p>
                          <p className="text-lg font-bold text-indigo-900">{reminderPending1h}</p>
                        </div>
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 col-span-2">
                          <p className="text-[11px] font-semibold text-rose-700">Failed deliveries (last 24h)</p>
                          <p className="text-lg font-bold text-rose-900">{reminderFailedLast24h}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                        <p>Fetched at: {reminderFetchedAtText}</p>
                        <p>Last run: {lastRunAt}</p>
                        <p className="mt-1">Last success: {lastSuccessAt}</p>
                        <p className="mt-1">Last cycle sent: 24h {reminderLastCycle24hSent}, 1h {reminderLastCycle1hSent}</p>
                      </div>

                      {reminderLastError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          Last error: {reminderLastError}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          Reminder scheduler is healthy.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-gray-900">Reminder Delivery Failures (Admin)</h3>
                    <button
                      onClick={fetchReminderDeliveries}
                      disabled={reminderDeliveryLoading}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                    >
                      <RefreshCw size={13} className={reminderDeliveryLoading ? "animate-spin" : ""} />
                      {reminderDeliveryLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  <div className="mb-3">
                    <select
                      value={reminderDeliveryChannelFilter}
                      onChange={(e) => setReminderDeliveryChannelFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All channels</option>
                      <option value="inApp">In-app</option>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>

                  {reminderDeliveryLoading && reminderDeliveryLogs.length === 0 ? (
                    <p className="text-sm text-gray-500">Loading delivery logs...</p>
                  ) : filteredReminderDeliveryLogs.length === 0 ? (
                    <p className="text-sm text-gray-500">No failed deliveries found for selected channel.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {filteredReminderDeliveryLogs.map((log) => (
                        <div key={log._id} className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide">{log.channel} • {log.reminderType}</p>
                            <span className="text-[11px] text-rose-700">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-700">{log.user?.name || "User"} ({log.user?.role || "-"})</p>
                          <p className="text-xs text-gray-600">Reason: {log.reason || "unknown"}</p>
                          {log.appointment?.appointmentDate && (
                            <p className="text-xs text-gray-500 mt-1">Appointment: {new Date(log.appointment.appointmentDate).toLocaleString()}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Appointment Payment Reviews (Admin)</h3>

                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="relative">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={appointmentPaymentSearch}
                        onChange={(e) => setAppointmentPaymentSearch(e.target.value)}
                        placeholder="Search patient, doctor, ref..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <input
                      type="date"
                      value={appointmentPaymentDateFilter}
                      onChange={(e) => setAppointmentPaymentDateFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {pendingAppointmentLoading ? (
                    <p className="text-sm text-gray-500">Loading pending payment proofs...</p>
                  ) : filteredPendingAppointmentPayments.length === 0 ? (
                    <p className="text-sm text-gray-500">No pending appointment payments.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredPendingAppointmentPayments.map((appointment) => (
                        <div key={appointment._id} className="rounded-lg border border-gray-200 p-3">
                          <p className="text-sm font-semibold text-gray-800">{appointment.patient?.name} → Dr. {appointment.doctor?.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(appointment.appointmentDate).toLocaleString()}</p>
                          <p className="text-xs text-gray-600 mt-1">Amount: ₹{appointment.paymentAmount || 500}</p>
                          <p className="text-xs text-gray-600 mt-1">Reference: {appointment.paymentReference || "N/A"}</p>
                          {appointment.doctor?.specialization && (
                            <p className="text-xs text-gray-500 mt-1">Specialization: {appointment.doctor.specialization}</p>
                          )}
                          {appointment.paymentProofUrl && (
                            <div className="mt-2 flex gap-3">
                              <button
                                type="button"
                                onClick={() => openProofPreview(appointment)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                              >
                                <Eye size={13} /> Preview Proof
                              </button>
                              <a
                                href={`${API_BASE}${appointment.paymentProofUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                              >
                                Open Full Proof
                              </a>
                            </div>
                          )}

                          <textarea
                            value={reviewNotesByAppointment[appointment._id] || ""}
                            onChange={(e) =>
                              setReviewNotesByAppointment((prev) => ({
                                ...prev,
                                [appointment._id]: e.target.value,
                              }))
                            }
                            placeholder="Optional review note (shown in appointment notes)"
                            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleReviewAppointmentPayment(appointment._id, "approve")}
                              disabled={reviewingAppointmentId === `${appointment._id}-approve`}
                              className="flex-1 rounded-lg bg-green-600 text-white text-xs font-semibold px-3 py-2 hover:bg-green-700 transition disabled:opacity-60"
                            >
                              {reviewingAppointmentId === `${appointment._id}-approve` ? "Approving..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleReviewAppointmentPayment(appointment._id, "reject")}
                              disabled={reviewingAppointmentId === `${appointment._id}-reject`}
                              className="flex-1 rounded-lg bg-red-600 text-white text-xs font-semibold px-3 py-2 hover:bg-red-700 transition disabled:opacity-60"
                            >
                              {reviewingAppointmentId === `${appointment._id}-reject` ? "Rejecting..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-bold text-gray-900">Webhook Event Logs (Admin)</h3>
                    <button
                      onClick={fetchWebhookEvents}
                      disabled={webhookLoading}
                      className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition disabled:opacity-60"
                    >
                      {webhookLoading ? "Refreshing..." : "Refresh Logs"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <select
                      value={webhookEventFilter}
                      onChange={(e) => setWebhookEventFilter(e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
                    >
                      {webhookEventOptions.map((eventType) => (
                        <option key={eventType} value={eventType}>
                          {eventType === "all" ? "All Events" : eventType}
                        </option>
                      ))}
                    </select>

                    <select
                      value={webhookStatusFilter}
                      onChange={(e) => setWebhookStatusFilter(e.target.value)}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
                    >
                      {webhookStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status === "all" ? "All Statuses" : status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredWebhookEvents.length === 0 ? (
                    <p className="text-sm text-gray-500">No webhook events yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {filteredWebhookEvents.map((event) => (
                        <div key={event._id} className="rounded-lg border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800">{event.event}</p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                event.status === "processed"
                                  ? "bg-green-100 text-green-700"
                                  : event.status === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : event.status === "ignored"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {event.status}
                            </span>
                          </div>
                          {event.entityId && <p className="text-xs text-gray-500 mt-1">Entity: {event.entityId}</p>}
                          <p className="text-xs text-gray-500 mt-1">{new Date(event.createdAt).toLocaleString()}</p>
                          {event.message && <p className="text-xs text-gray-600 mt-1">{event.message}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Doctor Payout Accounts (Admin)</h3>

                  {doctorPayoutLoading ? (
                    <p className="text-sm text-gray-500">Loading doctor payout settings...</p>
                  ) : doctorPayouts.length === 0 ? (
                    <p className="text-sm text-gray-500">No doctors found.</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {doctorPayouts.map((doctor) => (
                        <div key={doctor.id} className="rounded-lg border border-gray-200 p-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">Dr. {doctor.name}</p>
                            {doctor.payoutConfigured && (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  doctor.razorpayRouteAccountId && doctor.doctorUpiId
                                    ? "bg-emerald-100 text-emerald-700"
                                    : doctor.razorpayRouteAccountId
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-violet-100 text-violet-700"
                                }`}
                              >
                                {doctor.razorpayRouteAccountId && doctor.doctorUpiId
                                  ? "Route + UPI"
                                  : doctor.razorpayRouteAccountId
                                    ? "Route payout"
                                    : "UPI payout"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{doctor.email}</p>
                          {doctor.specialization && (
                            <p className="text-xs text-gray-500">{doctor.specialization}</p>
                          )}

                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              placeholder="acc_xxxxxxxxxxxx"
                              value={doctorPayoutDrafts[doctor.id] || ""}
                              onChange={(e) =>
                                setDoctorPayoutDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: e.target.value,
                                }))
                              }
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="doctor@bank"
                              value={doctorUpiDrafts[doctor.id] || ""}
                              onChange={(e) =>
                                setDoctorUpiDrafts((prev) => ({
                                  ...prev,
                                  [doctor.id]: e.target.value,
                                }))
                              }
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleSaveDoctorPayout(doctor.id)}
                              disabled={savingDoctorPayoutId === doctor.id}
                              className="rounded-lg bg-blue-600 text-white text-xs font-semibold px-3 py-2 hover:bg-blue-700 transition disabled:opacity-60"
                            >
                              {savingDoctorPayoutId === doctor.id ? "Saving..." : "Save"}
                            </button>
                          </div>

                          <p className="mt-2 text-[11px] text-gray-500">
                            Add either Razorpay account ID, doctor UPI ID, or both.
                          </p>

                          <p className={`mt-2 text-xs font-medium ${doctor.payoutConfigured ? "text-emerald-700" : "text-amber-700"}`}>
                            {doctor.payoutConfigured ? "Payout configured" : "Payout not configured"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {proofPreview.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-gray-900">Payment Proof Preview</h4>
                <p className="text-xs text-gray-500">{proofPreview.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setProofPreview({ open: false, url: "", title: "" })}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="h-[70vh] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {proofPreview.url.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                <img src={proofPreview.url} alt="Payment proof" className="h-full w-full object-contain" />
              ) : (
                <iframe
                  src={proofPreview.url}
                  title="Payment proof preview"
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default PaymentOptions;
