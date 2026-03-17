import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone, Video, ShieldCheck, Clock3 } from "lucide-react";
import { io as ioClient } from "socket.io-client";
import Layout from "../components/Layout";import { API_BASE } from '../config';


const VALIDITY_DAYS = 14;

const getConsultationMeta = (appointment) => {
  const appointmentDate = new Date(appointment?.appointmentDate);
  if (Number.isNaN(appointmentDate.getTime())) {
    return { canAccess: false, reason: "Invalid appointment date", validUntil: null };
  }

  if (!["approved", "completed"].includes(appointment?.status)) {
    return { canAccess: false, reason: "Available after appointment acceptance", validUntil: null };
  }

  const validUntil = new Date(appointmentDate.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() > validUntil) {
    return { canAccess: false, reason: "Expired", validUntil };
  }

  return { canAccess: true, reason: "Active", validUntil };
};

function Consultations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [unreadByAppointment, setUnreadByAppointment] = useState({});

  const fetchUnread = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/consultations/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadByAppointment(data.byAppointment || {});
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    const loadAppointments = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");

        const endpoint = role === "doctor"
          ? `${API_BASE}/api/appointments/doctor`
          : `${API_BASE}/api/appointments`;

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => ([]));

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load consultations");
        }

        setAppointments(Array.isArray(payload) ? payload : []);
      } catch (err) {
        setError(err.message || "Failed to load consultations");
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
    fetchUnread();
  }, [role, token]);

  // Re-fetch unread counts when a room marks messages as read
  useEffect(() => {
    const handler = () => fetchUnread();
    window.addEventListener("consultation-unread-updated", handler);
    return () => window.removeEventListener("consultation-unread-updated", handler);
  }, [token]);

  // Listen for realtime new messages to bump unread counts
  useEffect(() => {
    if (!token) return;
    const socket = ioClient(`${API_BASE}`, {
      auth: { token },
      transports: ["websocket"],
    });
    socket.on("consultation:message", () => fetchUnread());
    socket.on("consultation:read", () => fetchUnread());
    return () => socket.disconnect();
  }, [token]);

  const decorated = useMemo(() => {
    return appointments
      .map((appointment) => ({
        appointment,
        access: getConsultationMeta(appointment),
      }))
      .sort((a, b) => new Date(b.appointment.appointmentDate) - new Date(a.appointment.appointmentDate));
  }, [appointments]);

  const activeConsultations = decorated.filter((item) => item.access.canAccess);
  const filter = searchParams.get("filter") === "active" ? "active" : "all";
  const preferredMode = ["chat", "voice", "video"].includes(searchParams.get("mode"))
    ? searchParams.get("mode")
    : "chat";
  const visibleConsultations = filter === "active" ? activeConsultations : decorated;
  const returnTo = `/consultations${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const goToRoom = (appointmentId, callType) => {
    const roomParams = new URLSearchParams();
    if (callType) {
      roomParams.set("call", callType);
    }
    roomParams.set("returnTo", returnTo);
    navigate(`/consultation/${appointmentId}?${roomParams.toString()}`);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Consultations</h1>
              <p className="text-sm text-slate-500">
                Chat, voice, and video are available only after appointment acceptance and expire 14 days after appointment date.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={14} />
                Active consultations: {activeConsultations.length}
              </div>
              <div className="inline-flex rounded-full border border-slate-300 bg-white p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    const next = new URLSearchParams();
                    if (preferredMode !== "chat") next.set("mode", preferredMode);
                    setSearchParams(next, { replace: true });
                  }}
                  className={`rounded-full px-3 py-1 ${filter === "all" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    const next = new URLSearchParams({ filter: "active" });
                    if (preferredMode !== "chat") next.set("mode", preferredMode);
                    setSearchParams(next, { replace: true });
                  }}
                  className={`rounded-full px-3 py-1 ${filter === "active" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                >
                  Active
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Loading consultations...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {!loading && !error && visibleConsultations.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            {filter === "active"
              ? "No active consultations right now."
              : "No appointments found for consultations."}
          </div>
        )}

        {!loading && !error && visibleConsultations.length > 0 && (
          <div className="space-y-4">
            {visibleConsultations.map(({ appointment, access }) => {
              const personName = role === "doctor"
                ? appointment?.patient?.name || "Patient"
                : `Dr. ${appointment?.doctor?.name || "Doctor"}`;

              return (
                <div key={appointment._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">{personName}</h2>
                      <p className="text-sm text-slate-500">
                        Appointment: {new Date(appointment.appointmentDate).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Unread badge */}
                      {unreadByAppointment[appointment._id] > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                          {unreadByAppointment[appointment._id]} unread
                        </span>
                      )}
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${access.canAccess ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {access.canAccess ? "Active" : access.reason}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 size={14} />
                    {access.validUntil
                      ? `Valid until ${new Date(access.validUntil).toLocaleString()}`
                      : "Consultation window starts after appointment acceptance"}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => goToRoom(appointment._id)}
                      disabled={!access.canAccess}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                        preferredMode === "chat" ? "bg-indigo-700 ring-2 ring-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      <MessageCircle size={16} />
                      Chat
                    </button>
                    <button
                      onClick={() => goToRoom(appointment._id, "voice")}
                      disabled={!access.canAccess}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                        preferredMode === "voice" ? "bg-teal-700 ring-2 ring-teal-300" : "bg-teal-600 hover:bg-teal-700"
                      }`}
                    >
                      <Phone size={16} />
                      Voice Call
                    </button>
                    <button
                      onClick={() => goToRoom(appointment._id, "video")}
                      disabled={!access.canAccess}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                        preferredMode === "video" ? "bg-fuchsia-700 ring-2 ring-fuchsia-300" : "bg-fuchsia-600 hover:bg-fuchsia-700"
                      }`}
                    >
                      <Video size={16} />
                      Video Call
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Consultations;
