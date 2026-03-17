import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, Filter, ArrowLeft, Sparkles, ShieldCheck, MessageCircle, Phone, Video } from "lucide-react";
import Layout from "../components/Layout";
import { API_BASE } from '../config';

const PATIENT_ACTION_CUTOFF_HOURS = 12;
const CONSULTATION_VALIDITY_DAYS = 14;

const getPaymentStatusMeta = (paymentStatus) => {
  switch (paymentStatus) {
    case "paid":
      return {
        label: "Payment Verified",
        classes: "bg-emerald-100 text-emerald-700 border-emerald-300",
      };
    case "pending_verification":
      return {
        label: "Payment Verification Pending",
        classes: "bg-amber-100 text-amber-700 border-amber-300",
      };
    case "rejected":
      return {
        label: "Payment Rejected",
        classes: "bg-red-100 text-red-700 border-red-300",
      };
    case "failed":
      return {
        label: "Payment Failed",
        classes: "bg-red-100 text-red-700 border-red-300",
      };
    default:
      return {
        label: "Payment Pending",
        classes: "bg-slate-100 text-slate-700 border-slate-300",
      };
  }
};

const getConsultationState = (appointment) => {
  const appointmentDate = new Date(appointment?.appointmentDate);
  if (Number.isNaN(appointmentDate.getTime())) {
    return {
      canAccess: false,
      helperText: "Invalid appointment date",
    };
  }

  if (!["approved", "completed"].includes(appointment?.status)) {
    return {
      canAccess: false,
      helperText: "Available after doctor accepts your appointment",
    };
  }

  const validUntil = new Date(appointmentDate.getTime() + CONSULTATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() > validUntil) {
    return {
      canAccess: false,
      helperText: "Consultation window expired",
    };
  }

  return {
    canAccess: true,
    helperText: `Active until ${validUntil.toLocaleDateString()}`,
  };
};

function Appointments() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const highlightRef = useRef(null);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [rescheduleReservingSlot, setRescheduleReservingSlot] = useState(false);
  const [rescheduleHoldId, setRescheduleHoldId] = useState("");
  const [rescheduleHoldExpiresAt, setRescheduleHoldExpiresAt] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const releaseOnUnmount = async () => {
      if (!rescheduleHoldId || !token) return;
      try {
        await fetch(`${API_BASE}/api/appointments/holds/${rescheduleHoldId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_error) {
        // no-op
      }
    };

    return () => {
      releaseOnUnmount();
    };
  }, [rescheduleHoldId, token]);

  useEffect(() => {
    const fetchRescheduleAvailability = async () => {
      if (!rescheduleAppointmentId || !rescheduleDate || role !== "patient") {
        setRescheduleSlots([]);
        setRescheduleSlot("");
        setRescheduleHoldId("");
        setRescheduleHoldExpiresAt("");
        return;
      }

      const appointment = appointments.find((apt) => apt._id === rescheduleAppointmentId);
      const doctorId = appointment?.doctor?._id;
      if (!doctorId) {
        setRescheduleSlots([]);
        setRescheduleSlot("");
        setRescheduleHoldId("");
        setRescheduleHoldExpiresAt("");
        return;
      }

      try {
        setRescheduleLoadingSlots(true);
        const response = await fetch(
          `${API_BASE}/api/appointments/availability?doctorId=${doctorId}&date=${rescheduleDate}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Failed to load availability");
        }

        setRescheduleSlots(payload.availableSlots || []);
        setRescheduleSlot("");
        setRescheduleHoldId("");
        setRescheduleHoldExpiresAt("");
      } catch (err) {
        console.error("Error loading reschedule slots:", err);
        setError(err.message || "Failed to load slots");
      } finally {
        setRescheduleLoadingSlots(false);
      }
    };

    fetchRescheduleAvailability();
  }, [rescheduleAppointmentId, rescheduleDate, role, appointments, token]);

  const releaseRescheduleHold = async () => {
    if (!rescheduleHoldId || !token) return;
    try {
      await fetch(`${API_BASE}/api/appointments/holds/${rescheduleHoldId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Error releasing reschedule hold:", err);
    } finally {
      setRescheduleHoldId("");
      setRescheduleHoldExpiresAt("");
    }
  };

  const reserveRescheduleSlot = async (appointment, slotValue) => {
    const doctorId = appointment?.doctor?._id;
    if (!doctorId || !rescheduleDate || !slotValue || !token) return false;

    try {
      setRescheduleReservingSlot(true);
      const appointmentDate = new Date(`${rescheduleDate}T${slotValue}:00`).toISOString();
      const response = await fetch(`${API_BASE}/api/appointments/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ doctor: doctorId, appointmentDate }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to reserve selected slot");
      }

      setRescheduleHoldId(payload.holdId || "");
      setRescheduleHoldExpiresAt(payload.expiresAt || "");
      return true;
    } catch (err) {
      setError(err.message || "Unable to reserve selected slot");
      setRescheduleSlot("");
      setRescheduleHoldId("");
      setRescheduleHoldExpiresAt("");
      return false;
    } finally {
      setRescheduleReservingSlot(false);
    }
  };

  useEffect(() => {
    if (highlightId && highlightRef.current && !loading) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setSearchParams({}, { replace: true });
    }
  }, [highlightId, loading]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const url = role === "doctor"
        ? `${API_BASE}/api/appointments/doctor`
        : `${API_BASE}/api/appointments`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch appointments");

      const data = await response.json();
      setAppointments(data);
      setError("");
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/appointments/${appointmentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus, notes: statusNotes }),
        }
      );

      if (!response.ok) throw new Error("Failed to update appointment");

      // Update local state
      setAppointments(
        appointments.map((apt) =>
          apt._id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );

      setSelectedAppointment(null);
      setStatusNotes("");
    } catch (err) {
      console.error("Error updating appointment:", err);
      setError("Failed to update appointment");
    }
  };

  const formatDateForInput = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const getHoursUntilAppointment = (value) => {
    const appointmentDate = new Date(value);
    if (Number.isNaN(appointmentDate.getTime())) return -Infinity;
    return (appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60);
  };

  const canPatientManageAppointment = (appointment) =>
    getHoursUntilAppointment(appointment?.appointmentDate) >= PATIENT_ACTION_CUTOFF_HOURS;

  const getPatientActionLockMessage = (appointment) => {
    const hoursLeft = getHoursUntilAppointment(appointment?.appointmentDate);
    if (hoursLeft >= PATIENT_ACTION_CUTOFF_HOURS) return "";
    if (hoursLeft <= 0) return "Appointment time has passed";
    return `Action locked within ${PATIENT_ACTION_CUTOFF_HOURS} hours of appointment`;
  };

  const handlePatientCancel = async (appointment) => {
    if (!appointment?._id) return;
    if (!canPatientManageAppointment(appointment)) {
      setError(`You can only cancel at least ${PATIENT_ACTION_CUTOFF_HOURS} hours before appointment time.`);
      return;
    }

    const appointmentId = appointment._id;
    const proceed = window.confirm("Cancel this appointment? You can only cancel at least 12 hours before the slot.");
    if (!proceed) return;

    try {
      const response = await fetch(`${API_BASE}/api/appointments/${appointmentId}/patient-action`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "cancel" }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Failed to cancel appointment");

      setAppointments((prev) =>
        prev.map((apt) => (apt._id === appointmentId ? { ...apt, ...payload.appointment } : apt))
      );
      setError("");
    } catch (err) {
      setError(err.message || "Failed to cancel appointment");
    }
  };

  const openReschedule = (appointment) => {
    releaseRescheduleHold();
    setRescheduleAppointmentId(appointment._id);
    setRescheduleDate(formatDateForInput(appointment.appointmentDate));
    setRescheduleSlot("");
    setRescheduleNotes("");
    setRescheduleHoldId("");
    setRescheduleHoldExpiresAt("");
  };

  const handleRescheduleDateChange = async (event) => {
    await releaseRescheduleHold();
    setRescheduleDate(event.target.value);
    setRescheduleSlot("");
  };

  const handleRescheduleSlotChange = async (event, appointment) => {
    const nextSlot = event.target.value;
    if (!nextSlot) {
      await releaseRescheduleHold();
      setRescheduleSlot("");
      return;
    }

    if (rescheduleHoldId) {
      await releaseRescheduleHold();
    }

    setRescheduleSlot(nextSlot);
    const reserved = await reserveRescheduleSlot(appointment, nextSlot);
    if (!reserved) {
      setRescheduleSlot("");
    }
  };

  const handlePatientReschedule = async () => {
    if (!rescheduleAppointmentId || !rescheduleDate || !rescheduleSlot) {
      setError("Select a new date and slot before rescheduling");
      return;
    }

    try {
      setRescheduleSubmitting(true);
      const response = await fetch(`${API_BASE}/api/appointments/${rescheduleAppointmentId}/patient-action`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "reschedule",
          appointmentDate: new Date(`${rescheduleDate}T${rescheduleSlot}:00`).toISOString(),
          holdId: rescheduleHoldId,
          notes: rescheduleNotes,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Failed to reschedule appointment");

      setAppointments((prev) =>
        prev.map((apt) => (apt._id === rescheduleAppointmentId ? { ...apt, ...payload.appointment } : apt))
      );
      setRescheduleAppointmentId("");
      setRescheduleDate("");
      setRescheduleSlot("");
      setRescheduleNotes("");
      setRescheduleSlots([]);
      setRescheduleHoldId("");
      setRescheduleHoldExpiresAt("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to reschedule appointment");
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={18} className="text-green-600" />;
      case "pending":
        return <Clock size={18} className="text-yellow-600" />;
      case "completed":
        return <CheckCircle size={18} className="text-blue-600" />;
      case "cancelled":
        return <XCircle size={18} className="text-red-600" />;
      default:
        return null;
    }
  };

  const filteredAppointments =
    filter === "all"
      ? appointments
      : appointments.filter((apt) => apt.status === filter);

  const appointmentStats = {
    total: appointments.length,
    pending: appointments.filter((apt) => apt.status === "pending").length,
    approved: appointments.filter((apt) => apt.status === "approved").length,
    completed: appointments.filter((apt) => apt.status === "completed").length,
    cancelled: appointments.filter((apt) => apt.status === "cancelled").length,
  };

  return (
    <Layout>
      <div className="relative -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-brand-gradient text-white shadow-button mb-6 sm:mb-8 overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-blue-200 hover:text-white transition-colors mb-3 sm:mb-4 text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
              <Sparkles size={13} />
              Smart Timeline
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
              <ShieldCheck size={13} />
              Verified Status
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1 sm:mb-2 truncate text-white">Appointments</h1>
            <p className="text-blue-100 text-base sm:text-lg max-w-2xl">
              {role === "doctor" ? "Manage and review all patient appointments" : "View your upcoming and past appointments"}
            </p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-1 sm:px-0">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Total</p>
            <p className="text-3xl font-extrabold text-slate-700 mt-1">{appointmentStats.total}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-yellow-100">
            <p className="text-yellow-700 text-xs font-semibold uppercase tracking-wide">Pending</p>
            <p className="text-3xl font-extrabold text-yellow-600 mt-1">{appointmentStats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-green-100">
            <p className="text-green-700 text-xs font-semibold uppercase tracking-wide">Approved</p>
            <p className="text-3xl font-extrabold text-green-600 mt-1">{appointmentStats.approved}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-blue-100">
            <p className="text-blue-700 text-xs font-semibold uppercase tracking-wide">Completed</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{appointmentStats.completed}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-red-100">
            <p className="text-red-700 text-xs font-semibold uppercase tracking-wide">Cancelled</p>
            <p className="text-3xl font-extrabold text-red-600 mt-1">{appointmentStats.cancelled}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-4 sm:mb-6 flex items-center gap-2 flex-wrap rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <Filter size={18} className="text-gray-600 shrink-0" />
          {["all", "pending", "approved", "completed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold transition-all text-sm ${filter === status
                ? "bg-brand-gradient text-white shadow-button"
                : "bg-slate-50 text-gray-700 border border-gray-300 hover:border-blue-500"
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading appointments...</div>
          </div>
        )}

        {/* Appointments List */}
        {!loading && filteredAppointments.length > 0 && (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              (() => {
                const paymentMeta = getPaymentStatusMeta(appointment.paymentStatus);
                const canPatientManage = canPatientManageAppointment(appointment);
                const patientActionLockMessage = getPatientActionLockMessage(appointment);
                const consultationState = getConsultationState(appointment);
                return (
              <div
                key={appointment._id}
                ref={highlightId === appointment._id ? highlightRef : null}
                className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-shadow ${highlightId === appointment._id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                  }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {role === "doctor" ? appointment.patient?.name : `Dr. ${appointment.doctor?.name}`}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {role === "doctor" ? appointment.patient?.email : appointment.doctor?.specialization}
                    </p>
                    {appointment.paymentAmount ? (
                      <p className="text-xs text-gray-500 mt-1">Fee: ₹{appointment.paymentAmount}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      <span className="font-semibold">
                        {appointment.status.charAt(0).toUpperCase() +
                          appointment.status.slice(1)}
                      </span>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${paymentMeta.classes}`}>
                      {paymentMeta.label}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="text-gray-600 font-semibold">Date & Time</p>
                    <p className="text-gray-800">
                      {new Date(appointment.appointmentDate).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Notes</p>
                    <p className="text-gray-800">{appointment.notes || "No notes"}</p>
                  </div>
                </div>

                {(appointment.paymentReference || appointment.paymentProofUrl) && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-700 mb-1">Payment Details</p>
                    {appointment.paymentReference ? (
                      <p className="text-slate-600">Reference: {appointment.paymentReference}</p>
                    ) : null}
                    {appointment.paymentReviewedAt ? (
                      <p className="text-slate-600">Reviewed: {new Date(appointment.paymentReviewedAt).toLocaleString()}</p>
                    ) : null}
                    {appointment.paymentProofUrl ? (
                      <a
                        href={`${API_BASE}${appointment.paymentProofUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View Payment Proof
                      </a>
                    ) : null}
                  </div>
                )}

                {appointment.status === "pending" && role === "doctor" && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedAppointment(appointment._id)}
                      className="bg-brand-gradient text-white px-6 py-2 rounded-lg shadow-button hover:bg-brand-gradient-hover hover:shadow-button-hover transition-colors"
                    >
                      Update Status
                    </button>
                  </div>
                )}

                {role === "patient" && ["pending", "approved"].includes(appointment.status) && new Date(appointment.appointmentDate) > new Date() && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className={`mb-2 text-xs ${canPatientManage ? "text-gray-500" : "text-amber-700 font-semibold"}`}>
                      {canPatientManage
                        ? `You can cancel or reschedule at least ${PATIENT_ACTION_CUTOFF_HOURS} hours before appointment time.`
                        : patientActionLockMessage}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handlePatientCancel(appointment)}
                        disabled={!canPatientManage}
                        title={!canPatientManage ? patientActionLockMessage : ""}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel Appointment
                      </button>
                      <button
                        onClick={() => openReschedule(appointment)}
                        disabled={!canPatientManage}
                        title={!canPatientManage ? patientActionLockMessage : ""}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className={`mb-2 text-xs ${consultationState.canAccess ? "text-emerald-700" : "text-gray-500"}`}>
                    Doctor Consultation: {consultationState.helperText}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/consultation/${appointment._id}`)}
                      disabled={!consultationState.canAccess}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <MessageCircle size={16} />
                      Chat
                    </button>
                    <button
                      onClick={() => navigate(`/consultation/${appointment._id}?call=voice`)}
                      disabled={!consultationState.canAccess}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Phone size={16} />
                      Voice Call
                    </button>
                    <button
                      onClick={() => navigate(`/consultation/${appointment._id}?call=video`)}
                      disabled={!consultationState.canAccess}
                      className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Video size={16} />
                      Video Call
                    </button>
                  </div>
                </div>

                {/* Status Update Modal */}
                {selectedAppointment === appointment._id && (
                  <div className="mt-6 pt-4 border-t border-gray-200 bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status Notes (Optional)
                      </label>
                      <textarea
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        placeholder="Add any notes..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                        rows="3"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleUpdateStatus(appointment._id, "approved")
                        }
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateStatus(appointment._id, "cancelled")
                        }
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setSelectedAppointment(null)}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {role === "patient" && rescheduleAppointmentId === appointment._id && (
                  <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="font-semibold text-blue-900 mb-3">Reschedule Appointment</p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">New Date</label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={handleRescheduleDateChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">New Slot</label>
                        <select
                          value={rescheduleSlot}
                          onChange={(e) => handleRescheduleSlotChange(e, appointment)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          disabled={rescheduleLoadingSlots || rescheduleReservingSlot}
                        >
                          <option value="">{rescheduleLoadingSlots ? "Loading slots..." : rescheduleReservingSlot ? "Reserving slot..." : "Select slot"}</option>
                          {rescheduleSlots.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {rescheduleHoldExpiresAt && rescheduleSlot && (
                      <p className="mt-2 text-xs text-blue-700">
                        Reserved until {new Date(rescheduleHoldExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                      </p>
                    )}
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (optional)</label>
                      <textarea
                        value={rescheduleNotes}
                        onChange={(e) => setRescheduleNotes(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        rows={2}
                        placeholder="Reason for reschedule"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handlePatientReschedule}
                        disabled={rescheduleSubmitting || rescheduleReservingSlot || !rescheduleSlot || !rescheduleHoldId}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                      >
                        {rescheduleSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
                      </button>
                      <button
                        onClick={async () => {
                          await releaseRescheduleHold();
                          setRescheduleAppointmentId("");
                          setRescheduleDate("");
                          setRescheduleSlot("");
                          setRescheduleNotes("");
                          setRescheduleSlots([]);
                          setRescheduleHoldId("");
                          setRescheduleHoldExpiresAt("");
                        }}
                        className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
                );
              })()
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAppointments.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-700 text-lg font-semibold">No appointments found</p>
            <p className="text-gray-500 text-sm mt-2">Try another filter or book a new appointment.</p>
          </div>
        )}
      </div>
    </Layout >
  );
}

export default Appointments;
