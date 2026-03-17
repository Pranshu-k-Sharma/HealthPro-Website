import React, { useEffect, useRef, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone, PhoneMissed, Send, Video, VideoOff } from "lucide-react";
import { io as ioClient } from "socket.io-client";
import Layout from "../components/Layout";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/consultations`;

function ConsultationRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const callParam = searchParams.get("call");
  const returnToParam = searchParams.get("returnTo");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessData, setAccessData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [openingCall, setOpeningCall] = useState(false);
  const [autoCallTriggered, setAutoCallTriggered] = useState(false);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const currentUserId = useMemo(() => {
    if (!token) return "";
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return String(decoded.id || decoded._id || "");
    } catch {
      return "";
    }
  }, [token]);

  const partnerName = useMemo(() => {
    if (!accessData?.appointment) return "Doctor";
    if (role === "doctor") return accessData.appointment?.patient?.name || "Patient";
    return accessData.appointment?.doctor?.name || "Doctor";
  }, [accessData, role]);

  const backTarget = useMemo(() => {
    const stateFrom = typeof location.state?.from === "string" ? location.state.from : "";
    const candidate = returnToParam || stateFrom;
    return candidate.startsWith("/") ? candidate : "/consultations";
  }, [location.state, returnToParam]);

  const upsertMessage = (incomingMessage) => {
    if (!incomingMessage?._id) return;
    setMessages((prev) => {
      const exists = prev.some((item) => String(item._id) === String(incomingMessage._id));
      return exists ? prev : [...prev, incomingMessage];
    });
  };

  const fetchAccessAndMessages = async () => {
    if (!token || !appointmentId) return;

    try {
      setLoading(true);
      setError("");

      const [accessRes, messagesRes] = await Promise.all([
        fetch(`${API_BASE}/appointment/${appointmentId}/access`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/appointment/${appointmentId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const accessPayload = await accessRes.json().catch(() => ({}));
      const messagesPayload = await messagesRes.json().catch(() => ({}));

      if (!accessRes.ok) {
        throw new Error(accessPayload.reason || accessPayload.message || "Unable to access consultation");
      }

      if (!messagesRes.ok) {
        throw new Error(messagesPayload.message || "Unable to load messages");
      }

      setAccessData(accessPayload);
      setMessages(Array.isArray(messagesPayload.messages) ? messagesPayload.messages : []);

      // Mark all messages as read whenever the room is opened
      fetch(`${API_BASE}/appointment/${appointmentId}/messages/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      // Notify other parts of the app that consultation unread count changed
      window.dispatchEvent(new Event("consultation-unread-updated"));
    } catch (err) {
      setError(err.message || "Failed to load consultation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessAndMessages();
  }, [appointmentId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token || !appointmentId) return;

    const socket = ioClient(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
    });

    const handleIncomingMessage = (payload) => {
      if (!payload || String(payload.appointmentId) !== String(appointmentId)) return;
      upsertMessage(payload.message);
      // Mark as read immediately since the room is open
      fetch(`${API_BASE}/appointment/${appointmentId}/messages/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      window.dispatchEvent(new Event("consultation-unread-updated"));
    };

    const handleReadEvent = (payload) => {
      if (!payload || String(payload.appointmentId) !== String(appointmentId)) return;
      // Mark all messages as read in local state so read receipts update
      setMessages((prev) =>
        prev.map((msg) => {
          const alreadyHas = (msg.readBy || []).some((id) => String(id) === String(payload.readBy));
          if (alreadyHas) return msg;
          return { ...msg, readBy: [...(msg.readBy || []), payload.readBy] };
        })
      );
    };

    socket.on("consultation:message", handleIncomingMessage);
    socket.on("consultation:read", handleReadEvent);

    return () => {
      socket.off("consultation:message", handleIncomingMessage);
      socket.off("consultation:read", handleReadEvent);
      socket.disconnect();
    };
  }, [token, appointmentId]);

  const startCall = async (type) => {
    if (!token || !appointmentId) return;

    try {
      setOpeningCall(true);
      const response = await fetch(`${API_BASE}/appointment/${appointmentId}/call?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to start call");
      }

      if (payload.meetingUrl) {
        window.open(payload.meetingUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err.message || "Unable to start call");
    } finally {
      setOpeningCall(false);
    }
  };

  useEffect(() => {
    if (loading || !accessData?.canAccess || autoCallTriggered) return;
    if (callParam !== "voice" && callParam !== "video") return;

    setAutoCallTriggered(true);
    startCall(callParam);
  }, [loading, accessData, callParam, autoCallTriggered]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !token || !appointmentId) return;

    try {
      setSending(true);
      const response = await fetch(`${API_BASE}/appointment/${appointmentId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to send message");
      }

      upsertMessage(payload.message);
      setDraft("");
    } catch (err) {
      setError(err.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-2 sm:px-0">
        <div className="mb-4">
          <button
            onClick={() => navigate(backTarget)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Consultation with {partnerName}</h1>
              {accessData?.validUntil && (
                <p className="text-sm text-slate-500">
                  Available until {new Date(accessData.validUntil).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => startCall("voice")}
                disabled={loading || openingCall || Boolean(error)}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                <Phone size={16} />
                Voice Call
              </button>
              <button
                onClick={() => startCall("video")}
                disabled={loading || openingCall || Boolean(error)}
                className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-60"
              >
                <Video size={16} />
                Video Call
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Loading consultation...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
              <MessageCircle size={18} />
              <p className="font-semibold">Doctor Chat</p>
            </div>

            <div className="mb-4 max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((message) => {
                  const isOwn = String(message.sender?._id) === currentUserId;
                  const isRead = (message.readBy || []).some((id) => String(id) !== currentUserId);

                  if (message.messageType === "call") {
                    const isVoice = message.callType === "voice";
                    const Icon = isVoice ? Phone : Video;
                    return (
                      <div key={message._id} className="flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
                          <Icon size={13} className={isVoice ? "text-teal-500" : "text-fuchsia-500"} />
                          <span>
                            {isOwn
                              ? `You ${isVoice ? "started a voice call" : "started a video call"}`
                              : `${message.sender?.name || "Doctor"} ${isVoice ? "started a voice call" : "started a video call"}`}
                          </span>
                          <span className="text-[10px] opacity-60">{new Date(message.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message._id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        isOwn ? "ml-auto bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      <p className="font-semibold text-xs opacity-80 mb-1">{message.sender?.name || "User"}</p>
                      <p>{message.message}</p>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span className="text-[11px] opacity-70">{new Date(message.createdAt).toLocaleString()}</span>
                        {isOwn && (
                          <span className={`text-[10px] font-medium ${isRead ? "text-blue-300" : "opacity-50"}`}>
                            {isRead ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !draft.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ConsultationRoom;
