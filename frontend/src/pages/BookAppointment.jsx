import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar, Clock, Stethoscope, ArrowLeft, Sparkles, ShieldCheck, IndianRupee } from "lucide-react";import { API_BASE } from '../config';


const APPOINTMENT_FEE_INR = 500;
const HEALTHPRO_UPI_ID = import.meta.env.VITE_HEALTHPRO_UPI_ID || "healthpro@upi";
const HEALTHPRO_UPI_QR_PATH = import.meta.env.VITE_HEALTHPRO_UPI_QR_PATH || "";

function BookAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get("doctor") || "";
  const [doctor, setDoctor] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [fetchingDoctors, setFetchingDoctors] = useState(true);
  const [paymentReference, setPaymentReference] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [reservingSlot, setReservingSlot] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState("");
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [slotHoldId, setSlotHoldId] = useState("");
  const [slotHoldExpiresAt, setSlotHoldExpiresAt] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const token = localStorage.getItem("token");
  const selectedDoctor = doctors.find((doc) => doc._id === doctor) || null;

  // Track mobile/desktop
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Fetch available doctors
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setFetchingDoctors(true);
      // Try fetching all users (requires auth). If that fails, fetch public featured doctors.
      let doctorsList = [];
      try {
        if (token) {
          const resp = await fetch(`${API_BASE}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const users = await resp.json();
            doctorsList = users.filter((user) => user.role === "doctor");
          }
        }
      } catch (err) {
        // ignore and fallback
      }

      if (!doctorsList || doctorsList.length === 0) {
        // Public featured endpoint (now returns all seeded doctors)
        try {
          const featuredResp = await fetch(`${API_BASE}/api/users/featured`);
          if (featuredResp.ok) {
            doctorsList = await featuredResp.json();
          }
        } catch (err) {
          console.error("Error fetching featured doctors:", err);
        }
      }

      if (!doctorsList || doctorsList.length === 0) {
        // Final fallback
        doctorsList = [
          {
            _id: "698b674c96ea44c0a4da834e",
            name: "Smith",
            email: "doctor@example.com",
          },
        ];
      }

      setDoctors(doctorsList);

      if (preselectedDoctorId) {
        const matchedDoctor = doctorsList.find((doc) => doc._id === preselectedDoctorId);
        if (matchedDoctor) {
          setDoctor(preselectedDoctorId);
          sessionStorage.setItem("activeDoctorName", matchedDoctor.name || "");
          window.dispatchEvent(new Event("active-doctor-name-updated"));
        }
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([
        {
          _id: "698b674c96ea44c0a4da834e",
          name: "Smith",
          email: "doctor@example.com",
        },
      ]);
    } finally {
      setFetchingDoctors(false);
    }
  };

  useEffect(() => {
    if (!doctor) {
      sessionStorage.setItem("activeDoctorName", "");
      window.dispatchEvent(new Event("active-doctor-name-updated"));
      return;
    }

    const selectedDoctor = doctors.find((doc) => doc._id === doctor);
    sessionStorage.setItem("activeDoctorName", selectedDoctor?.name || "");
    window.dispatchEvent(new Event("active-doctor-name-updated"));
  }, [doctor, doctors]);

  useEffect(() => {
    const releaseOnUnmount = async () => {
      if (!slotHoldId || !token) return;
      try {
        await fetch(`${API_BASE}/api/appointments/holds/${slotHoldId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        // no-op
      }
    };

    return () => {
      releaseOnUnmount();
    };
  }, [slotHoldId, token]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!doctor || !date || !token) {
        setAvailableSlots([]);
        setSlot("");
        setSlotHoldId("");
        setSlotHoldExpiresAt("");
        setAvailabilityInfo("");
        setSlotIntervalMinutes(30);
        setBufferMinutes(0);
        return;
      }

      try {
        setFetchingSlots(true);
        const response = await fetch(
          `${API_BASE}/api/appointments/availability?doctorId=${doctor}&date=${date}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Failed to load slot availability");
        }

        const now = new Date();
        const filteredSlots = (payload.availableSlots || []).filter((slotValue) => {
          const slotDate = new Date(`${date}T${slotValue}:00`);
          return slotDate > now;
        });

        setAvailableSlots(filteredSlots);
        setSlot((current) => {
          const shouldKeepCurrent = filteredSlots.includes(current);
          if (!shouldKeepCurrent) {
            setSlotHoldId("");
            setSlotHoldExpiresAt("");
          }
          return shouldKeepCurrent ? current : "";
        });
        setAvailabilityInfo(payload.isDoctorOff ? payload.message || "Doctor is unavailable on selected date" : "");
        setSlotIntervalMinutes(Number(payload.slotIntervalMinutes) || 30);
        setBufferMinutes(Number(payload.bufferMinutes) || 0);
      } catch (error) {
        console.error("Slot availability error:", error);
        setAvailableSlots([]);
        setSlot("");
        setSlotHoldId("");
        setSlotHoldExpiresAt("");
        setAvailabilityInfo("");
        setSlotIntervalMinutes(30);
        setBufferMinutes(0);
      } finally {
        setFetchingSlots(false);
      }
    };

    fetchAvailability();
  }, [doctor, date, token]);

  const releaseCurrentHold = async () => {
    if (!slotHoldId || !token) return;
    try {
      await fetch(`${API_BASE}/api/appointments/holds/${slotHoldId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Release slot hold error:", error);
    } finally {
      setSlotHoldId("");
      setSlotHoldExpiresAt("");
    }
  };

  const reserveSlot = async (slotValue) => {
    if (!doctor || !date || !slotValue || !token) return;
    try {
      setReservingSlot(true);
      const appointmentDate = new Date(`${date}T${slotValue}:00`).toISOString();
      const response = await fetch(`${API_BASE}/api/appointments/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor,
          appointmentDate,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to reserve this slot");
      }

      setSlotHoldId(payload.holdId || "");
      setSlotHoldExpiresAt(payload.expiresAt || "");
      setMessage("");
    } catch (error) {
      console.error("Slot hold error:", error);
      setSlot("");
      setSlotHoldId("");
      setSlotHoldExpiresAt("");
      setMessageType("error");
      setMessage(error.message || "This slot is no longer available. Please choose another.");
    } finally {
      setReservingSlot(false);
    }
  };

  const handleSlotChange = async (event) => {
    const nextSlot = event.target.value;
    if (!nextSlot) {
      await releaseCurrentHold();
      setSlot("");
      return;
    }

    if (slotHoldId) {
      await releaseCurrentHold();
    }

    setSlot(nextSlot);
    await reserveSlot(nextSlot);
  };

  const handleDoctorChange = async (event) => {
    await releaseCurrentHold();
    setDoctor(event.target.value);
    setSlot("");
  };

  const handleDateChange = async (event) => {
    await releaseCurrentHold();
    setDate(event.target.value);
    setSlot("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!doctor || !date || !slot) {
      setMessage("Please select doctor, date, and slot");
      setMessageType("error");
      return;
    }

    if (!paymentReference.trim()) {
      setMessage("Please enter your UPI payment reference");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const appointmentDate = new Date(`${date}T${slot}:00`).toISOString();

      const res = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor,
          appointmentDate,
          holdId: slotHoldId,
          paymentReference: paymentReference.trim(),
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || responseData.message || "Failed to book appointment");
      }

      setMessageType("success");
      setMessage(`✓ Payment submitted. Appointment will be confirmed after verification.`);
      setDoctor("");
      setDate("");
      setSlot("");
      setSlotHoldId("");
      setSlotHoldExpiresAt("");
      setPaymentReference("");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Booking error:", error);
      setMessageType("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40">
      {/* Header */}
      <div className="relative overflow-hidden bg-brand-gradient text-white shadow-button">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-blue-100 hover:text-white transition-colors mb-4 text-sm"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
              <Sparkles size={13} />
              Fast Booking
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
              <ShieldCheck size={13} />
              Verified Payments
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">Book an Appointment</h1>
          <p className="text-blue-100 mt-2 text-sm sm:text-base max-w-2xl">Choose your doctor, pick a time slot, pay via UPI, and submit the reference for admin verification.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Form Section */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <Stethoscope className="text-emerald-700" size={26} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Appointment Details</h2>
                <p className="text-xs text-slate-500 mt-1">Complete the details below to reserve your consultation.</p>
              </div>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  messageType === "success"
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-red-100 text-red-700 border border-red-300"
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Doctor Select */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  1. Select Doctor *
                </label>
                {fetchingDoctors ? (
                  <div className="w-full border border-slate-300 rounded-xl p-3 bg-slate-50 text-slate-600">
                    Loading doctors...
                  </div>
                ) : (
                  <div>
                    <select
                      value={doctor}
                      onChange={handleDoctorChange}
                      required
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    >
                      <option value="">-- Choose a doctor --</option>
                      {doctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          Dr. {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="text-xs text-slate-600 mt-1">Select a qualified doctor</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Consultation Fee</p>
                  <p className="mt-2 text-2xl font-extrabold inline-flex items-center gap-1">
                    <IndianRupee size={18} /> {APPOINTMENT_FEE_INR}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Selected Doctor</p>
                  <p className="mt-2 font-bold">{selectedDoctor ? `Dr. ${selectedDoctor.name}` : "Not selected"}</p>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                Pay to UPI ID <span className="font-semibold">{HEALTHPRO_UPI_ID}</span> and submit the reference below.
                <div className="mt-3 rounded-lg bg-emerald-100 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                  One payment reference can be used for only one appointment.
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  2. UPI Payment Reference *
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter UTR / transaction reference"
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                />
                <p className="text-xs text-slate-600 mt-1">Example: 324567891234</p>
              </div>

              {/* Date & Time Select */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  3. Select Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 text-slate-500" size={20} />
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={handleDateChange}
                    required
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pl-10 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">Choose a future date</p>
                {availabilityInfo && (
                  <p className="text-xs text-amber-700 mt-1">{availabilityInfo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  4. Select Time Slot *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 text-slate-500" size={20} />
                  <select
                    value={slot}
                    onChange={handleSlotChange}
                    required
                    disabled={!doctor || !date || fetchingSlots || reservingSlot}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pl-10 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all disabled:bg-slate-100"
                  >
                    <option value="">
                      {fetchingSlots
                        ? "Loading slots..."
                        : reservingSlot
                          ? "Reserving selected slot..."
                        : !doctor || !date
                          ? "Select doctor and date first"
                          : availableSlots.length
                            ? "-- Choose a slot --"
                            : "No slots available"}
                    </option>
                    {availableSlots.map((slotValue) => (
                      <option key={slotValue} value={slotValue}>
                        {slotValue}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {availabilityInfo
                    ? "Select another date based on doctor availability."
                    : bufferMinutes > 0
                      ? `Each slot is ${slotIntervalMinutes} minutes with ${bufferMinutes} minutes buffer.`
                      : `Each slot is ${slotIntervalMinutes} minutes.`}
                </p>
                {slotHoldExpiresAt && slot && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Slot reserved for you until {new Date(slotHoldExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || fetchingDoctors || fetchingSlots || reservingSlot || !slot || !slotHoldId}
                className="w-full bg-brand-gradient text-white font-semibold py-3 rounded-xl shadow-button hover:bg-brand-gradient-hover hover:shadow-button-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Calendar size={20} />
                {loading
                  ? "Submitting payment details..."
                  : fetchingSlots
                    ? "Loading availability..."
                  : reservingSlot
                    ? "Reserving your slot..."
                  : `Submit INR ${APPOINTMENT_FEE_INR} Payment`}
              </button>
            </form>
          </div>

          {/* Info Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tips Card */}
            <div
              className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-lg"
              style={{ borderLeftColor: "#10B981" }}
            >
              {!isMobile && (
                HEALTHPRO_UPI_QR_PATH ? (
                  <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                    <img
                      src={HEALTHPRO_UPI_QR_PATH}
                      alt="HealthPro UPI QR"
                      className="mx-auto h-48 w-48 rounded-lg border border-emerald-200 bg-white object-contain p-2"
                    />
                    <p className="mt-2 text-xs text-emerald-700">Scan to pay INR {APPOINTMENT_FEE_INR} · UPI: <span className="font-semibold">{HEALTHPRO_UPI_ID}</span></p>
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    Add a QR image path in <span className="font-semibold">VITE_HEALTHPRO_UPI_QR_PATH</span> to show scan-and-pay here.
                  </div>
                )
              )}

              <h3 className="text-lg font-bold text-slate-900 mb-3">Before Your Appointment</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  Arrive 10 minutes early
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  Bring any medical documents
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  List any current medicines
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  Note down your symptoms
                </li>
              </ul>
            </div>

            {/* Appointment Status Card */}
            <div
              className="bg-white border border-blue-100 rounded-2xl p-6 shadow-lg"
              style={{ borderLeftColor: "#1E3A8A" }}
            >
              <h3 className="text-lg font-bold text-slate-900 mb-3">After Booking</h3>
              <p className="text-sm text-slate-700 mb-3">
                Your appointment stays pending until an admin verifies your payment proof.
              </p>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Payment submitted - Awaiting verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Approved - Appointment confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Completed - Appointment finished</span>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div
              className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-lg"
              style={{ borderLeftColor: "#10B981" }}
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">Need Help?</h3>
              <p className="text-sm text-slate-700">
                Contact our support team if you have any questions about booking your appointment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;
