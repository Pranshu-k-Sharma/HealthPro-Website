import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE } from '../config';
import {
    Camera,
    Save,
    LogOut,
    User,
    Mail,
    Phone,
    Briefcase,
    Award,
    FileText,
    Clock3,
    Bell,
    CheckCircle,
    AlertCircle,
    Loader,
    Edit3,
    ArrowLeft,
} from "lucide-react";

/* ─── Avatar initials helper ─── */
const initials = (name) =>
    name
        ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : "U";

/* ─── Small Field component ─── */
const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            <Icon size={14} className="text-cyan-500" />
            {label}
        </label>
        {children}
    </div>
);

const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all text-sm";

const WEEKDAY_OPTIONS = [
    { key: "sun", label: "Sun" },
    { key: "mon", label: "Mon" },
    { key: "tue", label: "Tue" },
    { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" },
    { key: "fri", label: "Fri" },
    { key: "sat", label: "Sat" },
];

/* ══════════════════════════════════════════════════════ */
export default function Profile() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const fileRef = useRef(null);

    /* ── state ── */
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    /* ── editable form fields ── */
    const [form, setForm] = useState({
        name: "",
        phone: "",
        bio: "",
        specialization: "",
        qualifications: "",  // comma-separated string → array on save
        profilePicture: "",
        workingStart: "09:00",
        workingEnd: "17:30",
        slotIntervalMinutes: 30,
        bufferMinutes: 0,
        workingDays: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
        unavailableDates: [],
        unavailableDateDraft: "",
        notificationPreferences: {
            inApp: true,
            email: false,
            sms: false,
            reminder24h: true,
            reminder1h: true,
        },
    });

    /* ── fetch profile on mount ── */
    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        fetch(`${API_BASE}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data) => {
                setUser(data);
                setForm({
                    name: data.name || "",
                    phone: data.phone || "",
                    bio: data.bio || "",
                    specialization: data.specialization || "",
                    qualifications: Array.isArray(data.qualifications)
                        ? data.qualifications.join(", ")
                        : data.qualifications || "",
                    profilePicture: data.profilePicture || "",
                    workingStart: data.workingHours?.start || "09:00",
                    workingEnd: data.workingHours?.end || "17:30",
                    slotIntervalMinutes: Number(data.slotIntervalMinutes) || 30,
                    bufferMinutes: Number(data.bufferMinutes ?? 0),
                    workingDays: Array.isArray(data.workingDays) && data.workingDays.length
                        ? data.workingDays
                        : ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                    unavailableDates: Array.isArray(data.unavailableDates) ? data.unavailableDates : [],
                    unavailableDateDraft: "",
                    notificationPreferences: {
                        inApp: data.notificationPreferences?.inApp ?? true,
                        email: data.notificationPreferences?.email ?? false,
                        sms: data.notificationPreferences?.sms ?? false,
                        reminder24h: data.notificationPreferences?.reminder24h ?? true,
                        reminder1h: data.notificationPreferences?.reminder1h ?? true,
                    },
                });
            })
            .catch(() => setError("Failed to load profile."))
            .finally(() => setLoading(false));
    }, [token]);

    /* ── photo upload → base64 ── */
    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError("Image must be under 5 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setForm((f) => ({ ...f, profilePicture: reader.result }));
        reader.readAsDataURL(file);
    };

    /* ── save profile ── */
    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError("Name cannot be empty."); return; }
        if (isDoctor && !form.workingDays.length) { setError("Select at least one working day."); return; }
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const body = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                bio: form.bio.trim(),
                specialization: form.specialization.trim(),
                qualifications: form.qualifications
                    .split(",")
                    .map((q) => q.trim())
                    .filter(Boolean),
                profilePicture: form.profilePicture,
                notificationPreferences: form.notificationPreferences,
            };
            if (isDoctor) {
                body.workingHours = {
                    start: form.workingStart,
                    end: form.workingEnd,
                };
                body.slotIntervalMinutes = Number(form.slotIntervalMinutes) || 30;
                body.bufferMinutes = Number(form.bufferMinutes) || 0;
                body.workingDays = form.workingDays;
                body.unavailableDates = form.unavailableDates;
            }
            const res = await fetch(`${API_BASE}/api/users/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Update failed");
            setUser(data.user);
            setSuccess("Profile updated successfully!");
            setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    /* ── logout ── */
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/login");
    };

    const isDoctor = user?.role === "doctor";
    const displayName = isDoctor && !/^dr\.?/i.test(form.name)
        ? `Dr. ${form.name}`
        : form.name;

    const toggleWorkingDay = (dayKey) => {
        setForm((prev) => {
            const exists = prev.workingDays.includes(dayKey);
            const nextDays = exists
                ? prev.workingDays.filter((day) => day !== dayKey)
                : [...prev.workingDays, dayKey];
            return {
                ...prev,
                workingDays: nextDays,
            };
        });
    };

    const addBlockedDate = () => {
        const nextDate = String(form.unavailableDateDraft || "").trim();
        if (!nextDate) return;
        setForm((prev) => {
            if (prev.unavailableDates.includes(nextDate)) {
                return { ...prev, unavailableDateDraft: "" };
            }
            const nextDates = [...prev.unavailableDates, nextDate].sort();
            return {
                ...prev,
                unavailableDates: nextDates,
                unavailableDateDraft: "",
            };
        });
    };

    const removeBlockedDate = (targetDate) => {
        setForm((prev) => ({
            ...prev,
            unavailableDates: prev.unavailableDates.filter((dateKey) => dateKey !== targetDate),
        }));
    };

    const toggleReminderPreference = (key) => {
        setForm((prev) => ({
            ...prev,
            notificationPreferences: {
                ...prev.notificationPreferences,
                [key]: !prev.notificationPreferences[key],
            },
        }));
    };

    /* ──────────────── LOADING SKELETON ──────────────── */
    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                        <Loader size={32} className="animate-spin text-cyan-500" />
                        <p className="text-sm">Loading profile…</p>
                    </div>
                </div>
            </Layout>
        );
    }

    /* ──────────────── RENDER ──────────────── */
    return (
        <Layout>
            <div className="max-w-3xl mx-auto px-0 sm:px-4 py-6 sm:py-8">

                {/* ── Back Button ── */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 transition-colors mb-4 sm:mb-6 text-sm sm:text-base font-medium"
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>

                {/* ── Page header ── */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        My Profile
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage your personal information
                    </p>
                </div>

                {/* ── Alerts ── */}
                {success && (
                    <div className="mb-5 flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 text-sm">
                        <CheckCircle size={18} className="shrink-0 mt-0.5" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">

                    {/* ── Avatar card ── */}
                    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <div
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-cyan-500/30 shadow-lg"
                                    style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
                                >
                                    {form.profilePicture ? (
                                        <img
                                            src={form.profilePicture}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                                            {initials(form.name)}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg flex items-center justify-center transition-colors"
                                    aria-label="Change photo"
                                >
                                    <Camera size={14} />
                                </button>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Name + role badge */}
                            <div className="text-center sm:text-left">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                    {displayName || "Your Name"}
                                </h2>
                                <span
                                    className="mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-semibold capitalize"
                                    style={{
                                        background: isDoctor ? "rgba(6,182,212,0.12)" : "rgba(99,102,241,0.12)",
                                        color: isDoctor ? "#06b6d4" : "#6366f1",
                                        border: isDoctor ? "1px solid rgba(6,182,212,0.3)" : "1px solid rgba(99,102,241,0.3)",
                                    }}
                                >
                                    {user?.role}
                                </span>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                                    <Mail size={13} />
                                    {user?.email}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                                >
                                    <Edit3 size={12} /> Change photo
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Personal info card ── */}
                    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                            <User size={16} className="text-cyan-500" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

                            {/* Name */}
                            <Field label="Full Name" icon={User}>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Your full name"
                                    className={inputCls}
                                    required
                                />
                            </Field>

                            {/* Email — read-only */}
                            <Field label="Email Address" icon={Mail}>
                                <input
                                    type="email"
                                    value={user?.email || ""}
                                    readOnly
                                    className={`${inputCls} opacity-60 cursor-not-allowed select-all`}
                                    title="Email cannot be changed"
                                />
                            </Field>

                            {/* Phone */}
                            <Field label="Phone Number" icon={Phone}>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    placeholder="+91 98765 43210"
                                    className={inputCls}
                                />
                            </Field>

                            {/* Doctor-only: Specialization */}
                            {isDoctor && (
                                <Field label="Specialization" icon={Briefcase}>
                                    <input
                                        type="text"
                                        value={form.specialization}
                                        onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                                        placeholder="e.g. Cardiologist"
                                        className={inputCls}
                                    />
                                </Field>
                            )}

                            {/* Doctor-only: Qualifications */}
                            {isDoctor && (
                                <Field label="Qualifications (comma-separated)" icon={Award}>
                                    <input
                                        type="text"
                                        value={form.qualifications}
                                        onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))}
                                        placeholder="MBBS, MD, FRCS"
                                        className={inputCls}
                                    />
                                </Field>
                            )}

                            {isDoctor && (
                                <Field label="Working Hours Start" icon={Clock3}>
                                    <input
                                        type="time"
                                        value={form.workingStart}
                                        onChange={(e) => setForm((f) => ({ ...f, workingStart: e.target.value }))}
                                        className={inputCls}
                                    />
                                </Field>
                            )}

                            {isDoctor && (
                                <Field label="Working Hours End" icon={Clock3}>
                                    <input
                                        type="time"
                                        value={form.workingEnd}
                                        onChange={(e) => setForm((f) => ({ ...f, workingEnd: e.target.value }))}
                                        className={inputCls}
                                    />
                                </Field>
                            )}

                            {isDoctor && (
                                <Field label="Slot Duration" icon={Clock3}>
                                    <select
                                        value={String(form.slotIntervalMinutes)}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                slotIntervalMinutes: Number(e.target.value),
                                            }))
                                        }
                                        className={inputCls}
                                    >
                                        <option value="15">15 minutes</option>
                                        <option value="20">20 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="60">60 minutes</option>
                                    </select>
                                </Field>
                            )}

                            {isDoctor && (
                                <Field label="Buffer Between Appointments" icon={Clock3}>
                                    <select
                                        value={String(form.bufferMinutes)}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                bufferMinutes: Number(e.target.value),
                                            }))
                                        }
                                        className={inputCls}
                                    >
                                        <option value="0">No buffer</option>
                                        <option value="5">5 minutes</option>
                                        <option value="10">10 minutes</option>
                                        <option value="15">15 minutes</option>
                                        <option value="20">20 minutes</option>
                                        <option value="30">30 minutes</option>
                                    </select>
                                </Field>
                            )}

                            {isDoctor && (
                                <div className="sm:col-span-2">
                                    <Field label="Working Days" icon={Clock3}>
                                        <div className="flex flex-wrap gap-2">
                                            {WEEKDAY_OPTIONS.map((day) => {
                                                const isSelected = form.workingDays.includes(day.key);
                                                return (
                                                    <button
                                                        key={day.key}
                                                        type="button"
                                                        onClick={() => toggleWorkingDay(day.key)}
                                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                            isSelected
                                                                ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                                                                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                                        }`}
                                                    >
                                                        {day.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500">Patients can only book on selected weekdays.</p>
                                    </Field>
                                </div>
                            )}

                            {isDoctor && (
                                <div className="sm:col-span-2">
                                    <Field label="Blocked Dates" icon={Clock3}>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <input
                                                type="date"
                                                value={form.unavailableDateDraft}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        unavailableDateDraft: e.target.value,
                                                    }))
                                                }
                                                min={new Date().toISOString().slice(0, 10)}
                                                className={inputCls}
                                            />
                                            <button
                                                type="button"
                                                onClick={addBlockedDate}
                                                className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"
                                            >
                                                Add Date
                                            </button>
                                        </div>

                                        {form.unavailableDates.length > 0 ? (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {form.unavailableDates.map((dateKey) => (
                                                    <button
                                                        key={dateKey}
                                                        type="button"
                                                        onClick={() => removeBlockedDate(dateKey)}
                                                        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                                        title="Click to remove"
                                                    >
                                                        {dateKey} x
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-xs text-slate-500">No blocked dates added.</p>
                                        )}
                                    </Field>
                                </div>
                            )}
                        </div>

                        {/* Bio — full width */}
                        <div className="mt-4 sm:mt-5">
                            <Field label="Bio / About" icon={FileText}>
                                <textarea
                                    value={form.bio}
                                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                                    placeholder={isDoctor ? "Brief professional summary…" : "Tell us a bit about yourself…"}
                                    rows={3}
                                    className={`${inputCls} resize-none`}
                                />
                            </Field>
                        </div>
                    </div>

                    {/* ── Notification Preferences ── */}
                    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
                        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                            <Bell size={16} className="text-cyan-500" /> Reminder Preferences
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { key: "inApp", label: "In-app notifications" },
                                { key: "email", label: "Email reminders" },
                                { key: "sms", label: "SMS reminders" },
                                { key: "reminder24h", label: "24-hour reminder" },
                                { key: "reminder1h", label: "1-hour reminder" },
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => toggleReminderPreference(item.key)}
                                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                        form.notificationPreferences[item.key]
                                            ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            SMS and email reminders require backend provider configuration.
                        </p>
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Save */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            style={{
                                background: saving
                                    ? "#64748b"
                                    : "linear-gradient(135deg, #06b6d4, #3b82f6)",
                                boxShadow: saving ? "none" : "0 4px 20px rgba(6,182,212,0.35)",
                            }}
                        >
                            {saving ? (
                                <><Loader size={16} className="animate-spin" /> Saving…</>
                            ) : (
                                <><Save size={16} /> Save Changes</>
                            )}
                        </button>

                        {/* Logout */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-white dark:bg-slate-800 text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
