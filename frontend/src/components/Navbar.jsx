import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io as ioClient } from "socket.io-client";
import NavItem from "./NavItem";
import MobileMenu from "./MobileMenu";
import { useTheme } from "../context/ThemeContext";
import { API_BASE } from '../config';
import {
  Bell,
  Search,
  Loader,
  LogOut,
  UserCircle,
  ChevronDown,
  Menu,
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Mail,
  Headphones,
  CreditCard,
} from "lucide-react";

/* ─────────────────────── helpers ─────────────────────── */
const initials = (name) =>
  name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

const getNotificationReadStorageKey = (userId) =>
  userId ? `healthpro-read-notifications:${userId}` : "healthpro-read-notifications:anonymous";

const getStoredReadNotificationIds = (userId) => {
  try {
    const raw = localStorage.getItem(getNotificationReadStorageKey(userId));
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const storeReadNotificationIds = (userId, ids) => {
  try {
    const unique = Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)));
    localStorage.setItem(getNotificationReadStorageKey(userId), JSON.stringify(unique.slice(-2000)));
  } catch {
    // ignore storage errors
  }
};

/* ─────────────────────── nav links ─────────────────────── */
const patientLinks = [
  /* All primary navigation moved to dashboard tabs */
];

const doctorLinks = [
  /* Doctor links intentionally shown on dashboard quick actions */
];

const getPageLabel = (pathname, patientName, doctorName, loggedInDoctorName, role) => {
  const doctorSuffix = role === "doctor" && loggedInDoctorName ? ` - Dr. ${loggedInDoctorName}` : "";

  if (pathname === "/" || pathname === "/login") return "Login";
  if (pathname === "/register") return "Register";
  if (pathname === "/forgot-password") return "Forgot Password";
  if (pathname === "/reset-password") return "Reset Password";
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/doctor") return `Doctor Dashboard${doctorSuffix}`;
  if (pathname === "/book-appointment") {
    return doctorName ? `Doctor: ${doctorName}` : "Book Appointment";
  }
  if (pathname === "/patients") return `Patients${doctorSuffix}`;
  if (pathname === "/appointments") return `Appointments${doctorSuffix}`;
  if (pathname === "/reports") return `Reports${doctorSuffix}`;
  if (pathname === "/prescriptions") return `Prescriptions${doctorSuffix}`;
  if (pathname === "/health-score") return "Health Score";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/contact") return "Contact";
  if (pathname === "/customer-care") return "Customer Care";
  if (pathname === "/payment-options") return "Payment Options";
  if (pathname === "/consultations") return `Consultations${doctorSuffix}`;
  if (pathname.startsWith("/consultation/")) return `Doctor Consultation${doctorSuffix}`;
  if (pathname.startsWith("/patient/")) {
    return patientName ? `Patient: ${patientName}` : "Patient Profile";
  }
  return "Home";
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  NAVBAR COMPONENT                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveTheme, toggleTheme } = useTheme();

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  /* ── state ── */
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activePatientName, setActivePatientName] = useState(
    sessionStorage.getItem("activePatientName") || ""
  );
  const [activeDoctorName, setActiveDoctorName] = useState(
    sessionStorage.getItem("activeDoctorName") || ""
  );
  const [loggedInDoctorName, setLoggedInDoctorName] = useState(
    sessionStorage.getItem("loggedInDoctorName") || ""
  );
  const [consultationUnread, setConsultationUnread] = useState(0);

  const notifRef = useRef(null);
  const searchRef = useRef(null);
  const profileRef = useRef(null);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    sessionStorage.setItem("loggedInDoctorName", "");
    window.dispatchEvent(new Event("logged-in-doctor-name-updated"));
    setUser(null);
    setNotifications([]);
    if (location.pathname !== "/login" && location.pathname !== "/register") {
      navigate("/login");
    }
  }, [location.pathname, navigate]);

  /* ── scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── fetch profile ── */
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          handleUnauthorized();
          return Promise.reject();
        }
        return r.ok ? r.json() : Promise.reject();
      })
      .then((data) => {
        setUser(data);
        localStorage.setItem("role", data.role);
        if (data.role === "doctor") {
          sessionStorage.setItem("loggedInDoctorName", data.name || "");
        } else {
          sessionStorage.setItem("loggedInDoctorName", "");
        }
        window.dispatchEvent(new Event("logged-in-doctor-name-updated"));
      })
      .catch(() => setUser(null));
  }, [token, handleUnauthorized]);

    const getLocalReadNotificationSet = () => new Set(getStoredReadNotificationIds(user?._id));

  /* ── notifications polling ── */
  useEffect(() => {
    let mounted = true;
    let timer = null;
    const fetchNotif = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (mounted) {
          setNotifications((prev) => {
            const byId = new Map(prev.map((n) => [n.id, n]));

            const merged = data.map((n) => {
              const existing = byId.get(n.id);
                return {
                  ...n,
                  read: Boolean(n.read || getLocalReadNotificationSet().has(n.id) || (existing && existing.read)),
                };
            });

            // Keep socket-only notifications that are not present in polling results.
            prev.forEach((item) => {
              if (!merged.some((n) => n.id === item.id)) {
                merged.push(item);
              }
            });

            return merged
              .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
              .slice(0, 50);
          });
        }
      } catch { }
    };
    fetchNotif();
    timer = setInterval(fetchNotif, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [token, handleUnauthorized]);

  /* ── socket.io ── */
  useEffect(() => {
    if (!token) return;
    const socket = ioClient(
      import.meta.env.VITE_SOCKET_URL || `${API_BASE}`,
      { auth: { token }, transports: ["websocket"] }
    );
    socket.on("notification", (payload) => {
      setNotifications((prev) => {
        if (prev.find((p) => p.id === payload.id)) return prev;
          return [{ ...payload, read: getLocalReadNotificationSet().has(payload.id) }, ...prev].slice(0, 50);
      });
      setShowNotif(true);
    });
    return () => socket.disconnect();
  }, [token]);

  /* ── consultation unread count ── */
  useEffect(() => {
    const fetchConsultationUnread = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/consultations/unread`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConsultationUnread(data.total || 0);
        }
      } catch { }
    };
    fetchConsultationUnread();
    window.addEventListener("consultation-unread-updated", fetchConsultationUnread);
    return () => window.removeEventListener("consultation-unread-updated", fetchConsultationUnread);
  }, [token]);

  /* ── click outside: notifications ── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    if (showNotif) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif]);

  /* ── click outside: search ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    if (showSearch) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSearch]);

  /* ── click outside: profile ── */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  /* ── debounced search ── */
  useEffect(() => {
    if (!token) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    if (!searchTerm.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const id = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/users/search?q=${encodeURIComponent(searchTerm)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (res.ok) { setSearchResults(await res.json()); setShowSearch(true); }
      } catch { }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [searchTerm, token, handleUnauthorized]);

  useEffect(() => {
    const handleActivePatientNameUpdated = () => {
      setActivePatientName(sessionStorage.getItem("activePatientName") || "");
    };
    const handleActiveDoctorNameUpdated = () => {
      setActiveDoctorName(sessionStorage.getItem("activeDoctorName") || "");
    };
    const handleLoggedInDoctorNameUpdated = () => {
      setLoggedInDoctorName(sessionStorage.getItem("loggedInDoctorName") || "");
    };

    window.addEventListener("active-patient-name-updated", handleActivePatientNameUpdated);
    window.addEventListener("active-doctor-name-updated", handleActiveDoctorNameUpdated);
    window.addEventListener("logged-in-doctor-name-updated", handleLoggedInDoctorNameUpdated);
    return () => {
      window.removeEventListener("active-patient-name-updated", handleActivePatientNameUpdated);
      window.removeEventListener("active-doctor-name-updated", handleActiveDoctorNameUpdated);
      window.removeEventListener("logged-in-doctor-name-updated", handleLoggedInDoctorNameUpdated);
    };
  }, []);

  /* ── handlers ── */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    sessionStorage.setItem("loggedInDoctorName", "");
    window.dispatchEvent(new Event("logged-in-doctor-name-updated"));
    navigate("/login");
  };

  const handleSearchResult = (r) => {
    setSearchTerm(""); setShowSearch(false);
    navigate(userRole === "doctor" ? `/patient/${r._id}` : `/book-appointment?doctor=${r._id}`);
  };

  const markNotificationAsRead = async (notificationId) => {
    if (!token || !notificationId) return;
    storeReadNotificationIds(user?._id, [...getStoredReadNotificationIds(user?._id), notificationId]);
    try {
      await fetch(`${API_BASE}/api/notifications/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId }),
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!token) return;
    storeReadNotificationIds(
      user?._id,
      [...getStoredReadNotificationIds(user?._id), ...notifications.map((n) => n.id)]
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getNotifPath = (url) => {
    if (!url) return null;
    const m = url.match(/^\/(appointments|reports|prescriptions)\/([a-f0-9]+)$/i);
    if (m) {
      const [, page, id] = m;
      return `/${page}?highlight=${id}`;
    }
    return url;
  };

  const handleNotifClick = async (n) => {
    setNotifications((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
    setShowNotif(false);
    await markNotificationAsRead(n.id);
    const p = getNotifPath(n.targetUrl);
    if (p) navigate(p);
  };

  /* ── computed ── */
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isDoctorUser = userRole === "doctor";
  const isDark = effectiveTheme === "dark";
  const currentPage = getPageLabel(
    location.pathname,
    activePatientName,
    activeDoctorName,
    loggedInDoctorName,
    userRole
  );
  // Pick link set by role; notifications live in the bell icon only
  const navLinks = isDoctorUser ? doctorLinks : patientLinks;

  /* ─────────────────────────── JSX ─────────────────────────── */
  return (
    <>
      {/* ── Animated background gradient bar (shifts slowly) ── */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <motion.div
          className="h-full w-[200%]"
          style={{
            background:
              "linear-gradient(90deg, #10b981, #1e3a8a, #059669, #2563eb, #10b981)",
          }}
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* ══ MAIN NAVBAR ══════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? "shadow-md shadow-gray-200/50" : ""
          }`}
        style={{
          background: isDark ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: isDark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(0,0,0,0.05)",
        }}
      >
        {/* Subtle gradient glow behind the bar */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          aria-hidden="true"
          style={{
            background:
              isDark
                ? "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(16,185,129,0.14) 0%, transparent 70%)"
                : "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 flex items-center h-16 gap-4">
          {/* ── Logo ── */}
          <div className="flex items-center gap-2.5 shrink-0 mr-2 lg:mr-6">
            <img src="/images/logo.png.png" alt="HealthPro logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full shrink-0" />
            <span
              className="text-lg sm:text-2xl font-bold hidden sm:block tracking-wide truncate"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span><span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span>
              <span className="text-gray-500 text-base font-medium ml-2">| {currentPage}</span>
            </span>
          </div>

          {/* ── Desktop nav links ── */}
          <nav
            className="hidden lg:flex items-center gap-0.5 flex-1"
            aria-label="Main navigation"
          >
            {navLinks.map(({ to, icon, label, badge }) => (
              <NavItem key={to} to={to} icon={icon} label={label} badge={badge} />
            ))}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 border border-gray-200 hover:border-emerald-300 hover:bg-gray-50 cursor-text bg-gray-50/50"
                onClick={() => document.getElementById("navbar-search-input")?.focus()}
              >
                {searchLoading ? (
                  <Loader size={15} className="text-emerald-500 animate-spin shrink-0" />
                ) : (
                  <Search size={15} className="shrink-0 text-gray-400" />
                )}
                <input
                  id="navbar-search-input"
                  type="text"
                  placeholder={userRole === "doctor" ? "Search patients…" : "Search doctors…"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchResults.length && setShowSearch(true)}
                  className="bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm w-32 sm:w-44 transition-all focus:w-52"
                  autoComplete="off"
                  aria-label="Search"
                />
              </div>

              {/* Search results dropdown */}
              <AnimatePresence>
                {showSearch && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full right-0 sm:left-0 mt-2 w-72 rounded-2xl overflow-hidden shadow-xl z-50 bg-white border border-gray-100"
                  >
                    <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
                      {searchResults.map((r) => (
                        <button
                          key={r._id}
                          onClick={() => handleSearchResult(r)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden bg-brand-gradient"
                          >
                            {r.profilePicture ? (
                              <img src={r.profilePicture} alt={r.name} className="w-full h-full object-cover" />
                            ) : (
                              initials(r.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {r.role === "doctor" && !/^dr\.?/i.test(r.name) ? `Dr. ${r.name}` : r.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{r.specialization || r.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                {showSearch && !searchLoading && !searchResults.length && searchTerm && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full right-0 sm:left-0 mt-2 w-56 rounded-2xl p-4 text-center shadow-xl z-50 bg-white border border-gray-100"
                  >
                    <p className="text-sm text-gray-500">No results found</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dark mode toggle */}
            <motion.button
              id="navbar-dark-toggle"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              onClick={toggleTheme}
              className="hidden sm:flex p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-gray-50 transition-colors border border-gray-100"
              aria-label="Toggle dark mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.svg
                    key="sun"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18" height="18"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="moon"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18" height="18"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <motion.button
                id="navbar-notifications"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setShowNotif((s) => !s)}
                className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-gray-50 transition-colors relative border border-gray-100 bg-white"
                aria-label="Notifications"
              >
                <Bell size={18} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {showNotif && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden shadow-xl z-50 bg-white border border-gray-100"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Notifications</p>
                        <p className="text-xs text-gray-500">{unreadCount} unread</p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center bg-white">
                          <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">All caught up!</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${n.read ? "opacity-60 bg-transparent" : "bg-emerald-50/30"
                              }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 mt-0.5 ${n.read ? "bg-gray-300" : "bg-emerald-500 shadow-sm"}`}
                            >
                              {n.title ? n.title.charAt(0) : "N"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${n.read ? "text-gray-600 font-medium" : "text-gray-900 font-semibold"}`}>{n.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                              {n.time && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {new Date(n.time).toLocaleString()}
                                </p>
                              )}
                            </div>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2 shadow-sm" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile menu */}
            <div className="relative" ref={profileRef}>
              <motion.button
                id="navbar-profile"
                onClick={() => setProfileOpen((s) => !s)}
                className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-full transition-all duration-200 hover:bg-gray-50 border border-transparent hover:border-gray-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Profile menu"
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 overflow-hidden bg-emerald-500 shadow-sm"
                >
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    initials(user?.name)
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-gray-800 leading-tight truncate max-w-[120px]">
                    {user
                      ? user.role === "doctor" && !/^dr\.?/i.test(user.name)
                        ? `Dr. ${user.name}`
                        : user.name
                      : "Guest"}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 hidden md:block transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                />
              </motion.button>

              {/* Profile dropdown */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden shadow-xl z-50 bg-white border border-gray-100"
                  >
                    {/* Profile info header */}
                    <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50/50">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user
                          ? user.role === "doctor" && !/^dr\.?/i.test(user.name)
                            ? `Dr. ${user.name}`
                            : user.name
                          : "Guest"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => { navigate(user?.role === "doctor" ? "/doctor" : "/dashboard"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors text-left"
                      >
                        <Home size={16} strokeWidth={1.8} className="text-gray-400" />
                        Home
                      </button>

                      <button
                        onClick={() => { navigate("/profile"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
                      >
                        <UserCircle size={16} strokeWidth={1.8} className="text-gray-400 group-hover:text-emerald-500" />
                        My Profile
                      </button>

                      {!isDoctorUser && (
                        <button
                          onClick={() => { navigate("/contact"); setProfileOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors text-left"
                        >
                          <Mail size={16} strokeWidth={1.8} className="text-gray-400" />
                          Contact Us
                        </button>
                      )}

                      <button
                        onClick={() => { navigate("/customer-care"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:text-purple-700 hover:bg-purple-50 transition-colors text-left"
                      >
                        <Headphones size={16} strokeWidth={1.8} className="text-gray-400" />
                        {isDoctorUser ? "Support" : "Customer Care"}
                      </button>

                      <button
                        onClick={() => { navigate("/consultations"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors text-left"
                      >
                        <Calendar size={16} strokeWidth={1.8} className="text-gray-400" />
                        <span className="flex-1">Consultations</span>
                        {consultationUnread > 0 && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {consultationUnread > 9 ? "9+" : consultationUnread}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => { navigate("/payment-options"); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:text-green-700 hover:bg-green-50 transition-colors text-left"
                      >
                        <CreditCard size={16} strokeWidth={1.8} className="text-gray-400" />
                        Payment Options
                      </button>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        id="navbar-logout"
                        onClick={() => { handleLogout(); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left font-medium"
                      >
                        <LogOut size={16} strokeWidth={1.8} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ══ MOBILE MENU DRAWER ══ */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navLinks={navLinks}
        user={user}
        onLogout={handleLogout}
        darkMode={isDark}
        onToggleDark={toggleTheme}
        notifCount={unreadCount}
      />
    </>
  );
};

export default Navbar;
