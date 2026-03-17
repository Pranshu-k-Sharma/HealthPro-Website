import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Calendar, Pill, FileText, Loader, Download } from "lucide-react";
import Layout from "../components/Layout";import { API_BASE } from '../config';


function ViewPatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [patientInfo, setPatientInfo] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchPatientData();
  }, [patientId, token]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch patient profile
      const profileRes = await fetch(`${API_BASE}/api/users/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!profileRes.ok) {
        throw new Error("Failed to fetch patient profile");
      }

      const patientData = await profileRes.json();
      setPatientInfo(patientData);
      sessionStorage.setItem("activePatientName", patientData?.name || "");
      window.dispatchEvent(new Event("active-patient-name-updated"));

      // Fetch patient appointments
      const appointmentsRes = await fetch(
        `${API_BASE}/api/appointments?patient=${patientId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData);
      }

      // Fetch patient prescriptions
      const prescriptionsRes = await fetch(
        `${API_BASE}/api/prescriptions?patient=${patientId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (prescriptionsRes.ok) {
        const prescriptionsData = await prescriptionsRes.json();
        setPrescriptions(prescriptionsData);
      }
    } catch (err) {
      console.error("Error fetching patient data:", err);
      setError(err.message || "Failed to load patient information");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadPrescription = async (prescriptionId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/prescriptions/${prescriptionId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prescription_${prescriptionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download prescription PDF error:", err);
    }
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <Loader className="animate-spin text-blue-600" size={40} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-center">
          <p className="text-red-800 text-lg">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  if (!patientInfo) {
    return (
      <Layout>
        <div className="text-center text-gray-600">
          <p>Patient not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 font-semibold transition text-sm sm:text-base"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Patient Header */}
        <div className="bg-brand-gradient text-white rounded-lg p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 shadow-button">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {patientInfo.profilePicture ? (
              <img
                src={patientInfo.profilePicture}
                alt={patientInfo.name}
                className="w-24 h-24 min-w-[96px] min-h-[96px] rounded-full object-cover object-center border-4 border-white shadow-lg flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center text-4xl font-bold">
                {patientInfo.name?.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 truncate text-white">{patientInfo.name}</h1>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Mail size={18} />
                  <span>{patientInfo.email}</span>
                </div>
                {patientInfo.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} />
                    <span>{patientInfo.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left - Appointments */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <Calendar className="text-blue-600" size={24} />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Appointments</h2>
              </div>

              {appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((apt) => {
                    const statusColor = getStatusColor(apt.status);
                    return (
                      <div
                        key={apt._id}
                        className={`p-4 rounded-lg border-2 ${statusColor.bg} ${statusColor.text}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-lg">
                            Appointment with {apt.doctor?.name || "Doctor"}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusColor.badge}`}
                          >
                            {apt.status?.charAt(0).toUpperCase() + apt.status?.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p>
                            <strong>Date & Time:</strong> {formatDate(apt.appointmentDate)}
                          </p>
                          {apt.doctor?.specialization && (
                            <p>
                              <strong>Specialization:</strong> {apt.doctor.specialization}
                            </p>
                          )}
                          {apt.notes && (
                            <p>
                              <strong>Appointment Notes:</strong> {apt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No appointments found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right - Prescriptions */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <Pill className="text-brand-green" size={24} />
                <h2 className="text-2xl font-bold text-gray-800">Prescriptions</h2>
              </div>

              {prescriptions.length > 0 ? (
                <div className="space-y-5">
                  {prescriptions.map((prescription) => (
                    <div
                      key={prescription._id}
                      className="p-4 bg-brand-alt rounded-lg border border-brand-border"
                    >
                      {/* Header */}
                      <div className="mb-3 pb-3 border-b border-brand-border">
                        <p className="text-xs text-gray-600 mb-1">
                          <strong>Doctor:</strong> {prescription.doctor?.name || "Doctor"}
                        </p>
                        <p className="text-xs text-gray-600">
                          <strong>Issued:</strong> {formatDate(prescription.issuedDate)}
                        </p>
                        {prescription.expiryDate && (
                          <p className="text-xs text-gray-600">
                            <strong>Expires:</strong> {formatDate(prescription.expiryDate)}
                          </p>
                        )}
                      </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadPrescription(prescription._id)}
                            className="text-brand-green hover:text-emerald-700 p-2 hover:bg-[#E6F9F4] rounded"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                        </div>

                      {/* Medicines */}
                      <div className="mb-3">
                        <h4 className="font-semibold text-sm text-gray-800 mb-2">Medicines:</h4>
                        {prescription.medicines && prescription.medicines.length > 0 ? (
                          <div className="space-y-2">
                            {prescription.medicines.map((medicine, idx) => (
                              <div key={idx} className="bg-white p-3 rounded border border-brand-border">
                                <p className="font-semibold text-sm text-gray-800">{medicine.name}</p>
                                <p className="text-xs text-gray-600">
                                  <strong>Dosage:</strong> {medicine.dosage}
                                </p>
                                <p className="text-xs text-gray-600">
                                  <strong>Frequency:</strong> {medicine.frequency}
                                </p>
                                <p className="text-xs text-gray-600">
                                  <strong>Duration:</strong> {medicine.duration}
                                </p>
                                {medicine.instructions && (
                                  <p className="text-xs text-gray-700 mt-2 italic">
                                    <strong>Instructions:</strong> {medicine.instructions}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">No medicines listed</p>
                        )}
                      </div>

                      {/* Doctor's Notes */}
                      {prescription.notes && (
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                          <p className="text-xs font-semibold text-yellow-900 mb-1">Doctor's Notes:</p>
                          <p className="text-xs text-yellow-800">{prescription.notes}</p>
                        </div>
                      )}

                      {/* Renewal Info */}
                      {prescription.renewalCount > 0 && (
                        <p className="text-xs text-gray-600 mt-2">
                          <strong>Renewals:</strong> {prescription.renewalCount}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No prescriptions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ViewPatientProfile;
