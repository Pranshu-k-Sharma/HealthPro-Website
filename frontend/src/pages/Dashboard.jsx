import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  Pill,
  FileText,
  Heart,
  AlertCircle,
  CheckCircle,
  LogOut,
  Plus,
  Bell,
  Stethoscope,
  Activity,
  TrendingUp,
  ChevronRight,
  Download,
  Eye,
  MapPin,
} from "lucide-react";
import HealthChatbot from "../components/HealthChatbot";
import Layout from "../components/Layout";import { API_BASE } from '../config';


function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const highlightId = searchParams.get("highlight");
  const prescriptionsHighlightRef = useRef(null);
  const reportsHighlightRef = useRef(null);

  const [patientInfo, setPatientInfo] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const token = localStorage.getItem("token");
  const savedHealthScore = localStorage.getItem("localHealthScore");

  // Fetch user data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle tab/highlight from notification URL
  useEffect(() => {
    if (tabParam && ["appointments", "prescriptions", "reports"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!loading && highlightId) {
      const timer = setTimeout(() => {
        const ref = activeTab === "prescriptions" ? prescriptionsHighlightRef : activeTab === "reports" ? reportsHighlightRef : null;
        if (ref?.current) {
          ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setSearchParams({}, { replace: true });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightId, loading, activeTab]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [profileRes, statsRes, appointmentsRes, prescriptionsRes, reportsRes] = await Promise.all([
        fetch(`${API_BASE}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/appointments/stats/patient`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/prescriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ ok: false })),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setPatientInfo(profileData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        // Use stats data
      }

      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      }

      if (prescriptionsRes.ok) {
        const prescriptionsData = await prescriptionsRes.json();
        setPrescriptions(Array.isArray(prescriptionsData) ? prescriptionsData : []);
      }

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(Array.isArray(reportsData) ? reportsData : []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load some data");
    } finally {
      setLoading(false);
    }
  };


  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.appointmentDate) > new Date() && apt.status !== "cancelled"
  );

  const completedAppointments = appointments.filter(
    (apt) => apt.status === "completed"
  );

  const pendingAppointments = appointments.filter(
    (apt) => apt.status === "pending"
  );

  const activeAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return { bg: "bg-green-100", text: "text-green-700", badge: "bg-green-500" };
      case "pending":
        return { bg: "bg-yellow-100", text: "text-yellow-700", badge: "bg-yellow-500" };
      case "completed":
        return { bg: "bg-blue-100", text: "text-blue-700", badge: "bg-blue-500" };
      case "cancelled":
        return { bg: "bg-red-100", text: "text-red-700", badge: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", badge: "bg-gray-500" };
    }
  };

  const healthTips = [
    {
      icon: Heart,
      title: "Stay Hydrated",
      description: "Drink at least 8 glasses of water daily for optimal health",
      color: "text-red-500",
    },
    {
      icon: Activity,
      title: "Exercise Regularly",
      description: "30 minutes of daily exercise can improve your health significantly",
      color: "text-blue-500",
    },
    {
      icon: Pill,
      title: "Take Medicines On Time",
      description: "Never miss your prescribed medications for better health outcomes",
      color: "text-brand-green",
    },
    {
      icon: TrendingUp,
      title: "Sleep Well",
      description: "Get 7-8 hours of quality sleep every night",
      color: "text-indigo-500",
    },
  ];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout>
      {/* Header with gradient */}
      <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-brand-gradient text-white shadow-button mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 truncate text-blue-50">Welcome Back, {patientInfo?.name || "Patient"}!</h1>
              <p className="text-blue-100 text-base sm:text-lg">Manage your health journey with ease</p>
              {patientInfo?.email && (
                <p className="text-blue-200 text-xs sm:text-sm mt-1 sm:mt-2 truncate">Email: {patientInfo.email}</p>
              )}
              {patientInfo?.phone && (
                <p className="text-blue-200 text-xs sm:text-sm truncate">Phone: {patientInfo.phone}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 shrink-0">
              <button
                onClick={() => navigate("/book-appointment")}
                className="w-full sm:w-auto bg-white text-brand-blue px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-brand-alt transition-all font-semibold flex items-center justify-center gap-2 shadow-card"
              >
                <Plus size={20} />
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Quick Stats - 4 Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Upcoming Appointments */}
          <div
            className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 border-blue-500"
            onClick={() => navigate("/appointments")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm font-medium">Upcoming Appointments</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">{upcomingAppointments.length}</p>
                <p className="text-gray-600 text-xs mt-1">Scheduled for you</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Active Prescriptions */}
          <div
            className="bg-white rounded-2xl p-6 shadow-card hover:shadow-lg transition-all cursor-pointer border border-brand-border border-l-4 border-brand-green"
            onClick={() => navigate("/prescriptions")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm font-medium">Active Medicines</p>
                <p className="text-4xl font-bold text-brand-green mt-2">{prescriptions.length}</p>
                <p className="text-gray-600 text-xs mt-1">Currently taking</p>
              </div>
              <div className="bg-[#E6F9F4] p-3 rounded-lg border border-brand-border">
                <Pill className="text-brand-green" size={24} />
              </div>
            </div>
          </div>

          {/* Medical Reports */}
          <div
            className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 border-green-500"
            onClick={() => navigate("/reports")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm font-medium">Medical Reports</p>
                <p className="text-4xl font-bold text-green-600 mt-2">{reports.length}</p>
                <p className="text-gray-600 text-xs mt-1">Your records</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FileText className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          {/* Health Score */}
          <div
            className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all border-l-4 border-orange-500 cursor-pointer"
            onClick={() => navigate("/health-score")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm font-medium">Health Score</p>
                <p className="text-4xl font-bold text-orange-600 mt-2">
                  {savedHealthScore ? `${savedHealthScore}/100` : "Not Tested"}
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  {savedHealthScore ? "Keep it up! 💪" : "Take the test"}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Heart className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Next Appointment Alert - Hero Card */}
        {activeAppointment && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-white mb-6 sm:mb-8 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="min-w-0">
                <p className="text-blue-200 text-xs sm:text-sm font-semibold uppercase">Next Appointment</p>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2">
                  {activeAppointment.doctor ? `Dr. ${activeAppointment.doctor.name}` : "Doctor"}
                </h2>
                <p className="text-blue-100 mt-1">
                  {formatDate(activeAppointment.appointmentDate)}
                </p>
                <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-4">
                  {activeAppointment.status === "pending" && (
                    <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                      Awaiting Approval
                    </span>
                  )}
                  {activeAppointment.status === "approved" && (
                    <span className="bg-green-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                      Approved ✓
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <Stethoscope size={48} className="sm:w-16 sm:h-16 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs Navigation removed as we now route directly to dedicated pages */}

        {/* Tab Content */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading your health data...</p>
          </div>
        )}

        {!loading && activeTab === "overview" && (
          <div className="space-y-8">
            {/* Health Tips Section */}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Health & Wellness Tips</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {healthTips.map((tip, idx) => {
                  const IconComponent = tip.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all group cursor-pointer"
                    >
                      <div className={`${tip.color} mb-4 group-hover:scale-110 transition-transform`}>
                        <IconComponent size={32} />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-2">{tip.title}</h4>
                      <p className="text-gray-600 text-sm">{tip.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Appointment History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md">
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">Pending Approvals</h3>
                {pendingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {pendingAppointments.slice(0, 5).map((apt) => (
                      <div
                        key={apt._id}
                        className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {apt.doctor ? `Dr. ${apt.doctor.name}` : "Doctor"}
                            </p>
                            {apt.doctor?.specialization && (
                              <p className="text-xs text-gray-600">{apt.doctor.specialization}</p>
                            )}
                            <p className="text-sm text-gray-600 mt-1">
                              {formatDate(apt.appointmentDate)}
                            </p>
                          </div>
                          <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No pending appointments</p>
                )}
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md">
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800">Completed Appointments</h3>
                {completedAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {completedAppointments.slice(0, 5).map((apt) => (
                      <div
                        key={apt._id}
                        className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {apt.doctor ? `Dr. ${apt.doctor.name}` : "Doctor"}
                            </p>
                            {apt.doctor?.specialization && (
                              <p className="text-xs text-gray-600">{apt.doctor.specialization}</p>
                            )}
                            <p className="text-sm text-gray-600 mt-1">
                              {formatDate(apt.appointmentDate)}
                            </p>
                          </div>
                          <CheckCircle className="text-blue-500" size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No completed appointments</p>
                )}
              </div>
            </div>
          </div>
        )}

        {false && activeTab === "appointments" && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming */}
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={24} />
                  Upcoming ({upcomingAppointments.length})
                </h3>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt) => {
                      const colors = getStatusColor(apt.status);
                      return (
                        <div key={apt._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-800">
                                {apt.doctor ? `Dr. ${apt.doctor.name}` : "Doctor"}
                              </p>
                              {apt.doctor?.specialization && (
                                <p className="text-xs text-gray-600">{apt.doctor.specialization}</p>
                              )}
                            </div>
                            <span className={`${colors.text} ${colors.bg} px-3 py-1 rounded-full text-xs font-semibold`}>
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock size={16} />
                            {formatDate(apt.appointmentDate)}
                          </p>
                          {apt.notes && (
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                              {apt.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No upcoming appointments. <a href="/book-appointment" className="text-blue-600 hover:underline">Book one now!</a>
                  </p>
                )}
              </div>

              {/* All Appointments */}
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold mb-4 text-gray-800">All Appointments ({appointments.length})</h3>
                {appointments.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {appointments.map((apt) => {
                      const colors = getStatusColor(apt.status);
                      return (
                        <div key={apt._id} className={`${colors.bg} ${colors.text} p-3 rounded-lg text-sm`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold">
                              {apt.doctor ? `Dr. ${apt.doctor.name}` : "Doctor"}
                            </span>
                            <span className="text-xs">{new Date(apt.appointmentDate).toLocaleDateString()}</span>
                          </div>
                          {apt.doctor?.specialization && (
                            <p className="text-xs opacity-80">{apt.doctor.specialization}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No appointments yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {false && activeTab === "prescriptions" && (
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <Pill className="text-brand-green" size={28} />
              Your Prescriptions ({prescriptions.length})
            </h3>
            {prescriptions.length > 0 ? (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div
                    key={prescription._id}
                    ref={highlightId === prescription._id ? prescriptionsHighlightRef : null}
                    className={`border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all ${highlightId === prescription._id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-lg font-bold text-gray-800">
                          Dr. {prescription.doctor?.name || "Doctor"}
                        </p>
                        {prescription.doctor?.specialization && (
                          <p className="text-sm text-gray-600">{prescription.doctor.specialization}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          Issued: {new Date(prescription.issuedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="bg-[#E6F9F4] text-brand-green px-4 py-2 rounded-full font-semibold border border-brand-border">
                        Active
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-bold text-gray-800 mb-3">Medicines:</h4>
                      <div className="space-y-2">
                        {prescription.medicines && prescription.medicines.map((med, idx) => (
                          <div key={idx} className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{med.name}</p>
                              <p className="text-gray-600">
                                {med.dosage} • {med.frequency} • {med.duration}
                              </p>
                              {med.instructions && (
                                <p className="text-gray-600 text-xs mt-1">📝 {med.instructions}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {prescription.notes && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-800">
                        <p className="font-semibold">Doctor's Notes:</p>
                        <p>{prescription.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">
                No prescriptions yet. Complete an appointment with a doctor to receive prescriptions.
              </p>
            )}
          </div>
        )}

        {false && activeTab === "reports" && (
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <FileText className="text-green-600" size={28} />
              Medical Records ({reports.length})
            </h3>
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report._id}
                    ref={highlightId === report._id ? reportsHighlightRef : null}
                    className={`border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all ${highlightId === report._id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-lg font-bold text-gray-800">
                          Dr. {report.doctor?.name || "Doctor"}
                        </p>
                        {report.doctor?.specialization && (
                          <p className="text-sm text-gray-600">{report.doctor.specialization}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          Report Date: {new Date(report.reportDate || report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-all">
                        <Download size={20} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold text-gray-800 text-sm">Diagnosis:</p>
                        <p className="text-gray-700 text-sm mt-2">{report.diagnosis}</p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold text-gray-800 text-sm">Findings:</p>
                        <p className="text-gray-700 text-sm mt-2">{report.findings}</p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-semibold text-gray-800 text-sm">Treatment Plan:</p>
                        <p className="text-gray-700 text-sm mt-2">{report.treatment}</p>
                      </div>

                      {report.notes && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm">
                          <p className="font-semibold text-blue-900">Additional Notes:</p>
                          <p className="text-blue-800 mt-1">{report.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">
                No medical reports yet. Your doctor will share reports after appointments.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mt-6">
            {error}
          </div>
        )}
      </div>

      {/* AI Health Assistant - Patients only */}
      {token && <HealthChatbot />}
    </Layout>
  );
}

export default Dashboard;
