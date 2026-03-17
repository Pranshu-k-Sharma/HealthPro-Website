import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { ArrowRight, FileText, MessageCircle, Phone, Pill, Stethoscope, Video } from "lucide-react";
import CalendarIcon from "../components/icons/CalendarIcon";
import PeopleIcon from "../components/icons/PeopleIcon";import { API_BASE } from '../config';


const CONSULTATION_VALIDITY_DAYS = 14;

function DoctorDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [doctorInfo, setDoctorInfo] = useState(null);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultationUnread, setConsultationUnread] = useState(0);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch unread consultation count
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

  useEffect(() => {
    fetchConsultationUnread();
    window.addEventListener("consultation-unread-updated", fetchConsultationUnread);
    return () => window.removeEventListener("consultation-unread-updated", fetchConsultationUnread);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch doctor profile info
      const profileRes = await fetch(
        `${API_BASE}/api/users/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (profileRes.ok) {
        const doctorData = await profileRes.json();
        setDoctorInfo(doctorData);
      }

      // Fetch doctor dashboard stats
      const statsRes = await fetch(
        `${API_BASE}/api/appointments/stats/doctor`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setAppointmentCount(stats.totalAppointments);
        setPatientCount(stats.totalPatients);
        setUpcomingCount(stats.upcomingCount);
        setCompletedCount(stats.completedCount);
        setRecentAppointments(stats.upcomingAppointments || []);
      }

      const appointmentsRes = await fetch(
        `${API_BASE}/api/appointments/doctor`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setDoctorAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  // Stat card component with navigation
  const StatCard = ({ icon: Icon, title, count, color, onClick }) => {
    const iconColor = color.replace("bg-", "text-").replace("100", "600");

    return (
      <div
        onClick={onClick}
        className={`cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl`}
      >
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 ${color} rounded-xl`}>
                <Icon className={iconColor} size={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                <p className="text-gray-600 font-bold text-xl">
                  {loading ? "..." : count}
                </p>
              </div>
            </div>
            <ArrowRight
              size={20}
              className="text-gray-400 group-hover:text-gray-600 transition"
            />
          </div>
        </GlassCard>
      </div>
    );
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-50";
      case "completed":
        return "text-blue-600 bg-blue-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const activeConsultationsCount = doctorAppointments.filter((apt) => {
    if (!["approved", "completed"].includes(apt?.status)) {
      return false;
    }

    const appointmentDate = new Date(apt?.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) {
      return false;
    }

    const validUntil = new Date(
      appointmentDate.getTime() + CONSULTATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    );
    return new Date() <= validUntil;
  }).length;

  return (
    <Layout>
      {/* Header with gradient to match patient dashboard */}
      <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-brand-gradient text-white shadow-button mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold truncate text-white">
              Welcome, Dr. {doctorInfo?.name || "Doctor"}
            </h1>
            <p className="text-blue-100 mt-1 text-base sm:text-lg">
              {doctorInfo?.specialization ? `${doctorInfo.specialization} Specialist` : "Here's your overview"}
            </p>
            {doctorInfo?.qualifications && (
              <p className="text-blue-200 text-xs sm:text-sm mt-2">
                <span className="font-semibold text-white">Qualifications:</span> {doctorInfo.qualifications}
              </p>
            )}
            {doctorInfo?.phone && (
              <p className="text-blue-200 text-xs sm:text-sm">
                <span className="font-semibold text-white">Phone:</span> {doctorInfo.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10">
        <StatCard
          icon={CalendarIcon}
          title="Total Appointments"
          count={appointmentCount}
          color="bg-blue-100"
          onClick={() => navigate("/appointments")}
        />
        <StatCard
          icon={CalendarIcon}
          title="Upcoming"
          count={upcomingCount}
          color="bg-green-100"
          onClick={() => navigate("/appointments")}
        />
        <StatCard
          icon={PeopleIcon}
          title="Patients"
          count={patientCount}
          color="bg-emerald-100"
          onClick={() => navigate("/patients")}
        />
      </div>

      {/* Quick Actions for frequently used doctor workflows */}
      <div className="mb-6 sm:mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div
            onClick={() => navigate("/prescriptions")}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-md hover:shadow-lg hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100">
                  <Pill size={22} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-gray-800">Prescriptions</p>
                  <p className="text-sm text-gray-600">Create and manage patient prescriptions</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-400" />
            </div>
          </div>

          <div
            onClick={() => navigate("/reports")}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-md hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100">
                  <FileText size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-gray-800">Reports</p>
                  <p className="text-sm text-gray-600">Upload and review patient medical reports</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-400" />
            </div>
          </div>

          <div
            onClick={() => navigate("/consultations?filter=active&mode=chat")}
            className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-md hover:shadow-lg hover:border-cyan-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-100">
                  <Stethoscope size={22} className="text-cyan-700" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-gray-800">Consultations</p>
                  <p className="text-sm text-gray-600">Start secure chat, voice, and video follow-ups</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {consultationUnread > 0 && (
                  <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                    {consultationUnread} unread
                  </span>
                )}
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {loading ? "..." : `${activeConsultationsCount} active`}
                </span>
                <ArrowRight size={18} className="text-gray-400" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  navigate("/consultations?filter=active&mode=chat");
                }}
                title="Available only after appointment acceptance and for 14 days after appointment date"
                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <MessageCircle size={14} /> Chat
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  navigate("/consultations?filter=active&mode=voice");
                }}
                title="Available only after appointment acceptance and for 14 days after appointment date"
                className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
              >
                <Phone size={14} /> Voice
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  navigate("/consultations?filter=active&mode=video");
                }}
                title="Available only after appointment acceptance and for 14 days after appointment date"
                className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-100"
              >
                <Video size={14} /> Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments Section */}
      <div className="bg-white shadow rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold">Recent Appointments</h2>
          <button
            onClick={() => navigate("/appointments")}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
          >
            View All <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : recentAppointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No appointments yet
          </div>
        ) : (
          <>
            {/* Desktop view - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 font-semibold text-gray-700">
                      Patient
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.map((appt) => (
                    <tr
                      key={appt._id}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => navigate(`/patient/${appt.patient?._id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-semibold transition cursor-pointer"
                          title="View patient profile"
                        >
                          {appt.patient?.name || "N/A"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(appt.appointmentDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            appt.status
                          )}`}
                        >
                          {appt.status.charAt(0).toUpperCase() +
                            appt.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view - Cards */}
            <div className="md:hidden space-y-3">
              {recentAppointments.map((appt) => (
                <div
                  key={appt._id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <button
                      onClick={() => navigate(`/patient/${appt.patient?._id}`)}
                      className="flex-1 text-left font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
                      title="View patient profile"
                    >
                      {appt.patient?.name || "N/A"}
                    </button>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        appt.status
                      )}`}
                    >
                      {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDate(appt.appointmentDate)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default DoctorDashboard;
