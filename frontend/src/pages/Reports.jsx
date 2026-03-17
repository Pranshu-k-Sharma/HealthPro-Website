import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, Plus, Download, Loader2, Eye, Trash2, Edit2, ArrowLeft } from "lucide-react";
import Layout from "../components/Layout";
import { API_BASE } from '../config';

function Reports() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const highlightRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [downloadingReportId, setDownloadingReportId] = useState("");
  const [downloadingReportAction, setDownloadingReportAction] = useState("");

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [formData, setFormData] = useState({
    appointmentId: "",
    patientId: "",
    diagnosis: "",
    findings: "",
    treatment: "",
    notes: "",
  });

  useEffect(() => {
    fetchReports();
    if (role === "doctor") {
      fetchAppointments();
    }
  }, [role]);

  useEffect(() => {
    if (highlightId && highlightRef.current && !loading) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setSearchParams({}, { replace: true });
    }
  }, [highlightId, loading]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = role === "doctor"
        ? `${API_BASE}/api/reports/doctor`
        : `${API_BASE}/api/reports`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch reports");

      const data = await response.json();
      setReports(data);
      setError("");
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/appointments/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch appointments");

      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();

    if (!formData.appointmentId || !formData.patientId || !formData.diagnosis) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("appointmentId", formData.appointmentId);
      fd.append("patientId", formData.patientId);
      fd.append("diagnosis", formData.diagnosis);
      fd.append("findings", formData.findings);
      fd.append("treatment", formData.treatment);
      fd.append("notes", formData.notes || "");
      // if current user isn't a doctor, front-end should include doctorId
      if (formData.doctorId) fd.append("doctorId", formData.doctorId);
      if (attachmentFile) fd.append("attachment", attachmentFile);

      const response = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create report");
      }

      const newReport = await response.json();
      setReports([newReport.report, ...reports]);
      setShowCreateForm(false);
      setFormData({
        appointmentId: "",
        patientId: "",
        diagnosis: "",
        findings: "",
        treatment: "",
        notes: "",
      });
      setAttachmentFile(null);
      setError("");
    } catch (err) {
      console.error("Error creating report:", err);
      setError("Failed to create report");
    }
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${API_BASE}/api/reports/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            diagnosis: formData.diagnosis,
            findings: formData.findings,
            treatment: formData.treatment,
            notes: formData.notes,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update report");

      const updatedReport = await response.json();
      setReports(
        reports.map((r) =>
          r._id === editingId ? updatedReport.report : r
        )
      );
      setEditingId(null);
      setFormData({
        appointmentId: "",
        patientId: "",
        diagnosis: "",
        findings: "",
        treatment: "",
        notes: "",
      });
      setError("");
    } catch (err) {
      console.error("Error updating report:", err);
      setError("Failed to update report");
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/reports/${reportId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to delete report");

      setReports(reports.filter((r) => r._id !== reportId));
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report");
    }
  };

  const handleEditClick = (report) => {
    setEditingId(report._id);
    setFormData({
      appointmentId: report.appointment._id,
      patientId: report.patient._id,
      diagnosis: report.diagnosis,
      findings: report.findings,
      treatment: report.treatment,
      notes: report.notes || "",
    });
  };

  const downloadBlobFromResponse = async (response, fallbackName) => {
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const derivedName = decodeURIComponent(filenameMatch?.[1] || filenameMatch?.[2] || fallbackName);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = derivedName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async (report) => {
    try {
      setDownloadingReportId(report._id);
      setDownloadingReportAction("pdf");
      const response = await fetch(`${API_BASE}/api/reports/${report._id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      await downloadBlobFromResponse(response, `report_${report._id}.pdf`);
    } catch (err) {
      console.error("Download PDF error:", err);
      setError("Failed to download PDF");
    } finally {
      setDownloadingReportId("");
      setDownloadingReportAction("");
    }
  };

  const handleDownloadAttachment = async (report) => {
    try {
      setDownloadingReportId(report._id);
      setDownloadingReportAction("attachment");
      const response = await fetch(`${API_BASE}/api/reports/${report._id}/attachment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to download attachment");
      await downloadBlobFromResponse(response, report.attachment?.originalName || `attachment_${report._id}`);
    } catch (err) {
      console.error("Download attachment error:", err);
      setError("Failed to download attachment");
    } finally {
      setDownloadingReportId("");
      setDownloadingReportAction("");
    }
  };

  const handleAppointmentSelect = (appointmentId) => {
    const apt = appointments.find((a) => a._id === appointmentId);
    if (apt) {
      setFormData({
        ...formData,
        appointmentId,
        patientId: apt.patient._id,
      });
    }
  };

  return (
    <Layout>
      <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-brand-gradient text-white shadow-button mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors mb-3 sm:mb-4 text-sm sm:text-base font-medium"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 truncate text-white">Medical Reports</h1>
              <p className="text-blue-100 text-base sm:text-lg">
                {role === "doctor" ? "Create and manage patient medical records" : "View your medical reports and records"}
              </p>
            </div>
            {role === "doctor" && (
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  setEditingId(null);
                  setFormData({
                    appointmentId: "",
                    patientId: "",
                    diagnosis: "",
                    findings: "",
                    treatment: "",
                    notes: "",
                  });
                }}
                className="bg-white text-brand-blue border-2 border-brand-blue px-6 py-3 rounded-lg shadow-button hover:bg-brand-alt transition-colors flex items-center gap-2 font-semibold flex-shrink-0"
              >
                <Plus size={20} />
                New Report
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {(showCreateForm || editingId) && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingId ? "Edit Report" : "Create New Report"}
            </h2>

            <form onSubmit={editingId ? handleUpdateReport : handleCreateReport}>
              {!editingId && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Appointment *
                    </label>
                    <select
                      value={formData.appointmentId}
                      onChange={(e) => handleAppointmentSelect(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                      required
                    >
                      <option value="">Select an appointment</option>
                      {appointments.map((apt) => (
                        <option key={apt._id} value={apt._id}>
                          {apt.patient.name} - {new Date(apt.appointmentDate).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Patient
                    </label>
                    <input
                      type="text"
                      value={
                        appointments.find((a) => a._id === formData.appointmentId)
                          ?.patient?.name || "Select appointment first"
                      }
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100"
                    />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diagnosis *
                </label>
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) =>
                    setFormData({ ...formData, diagnosis: e.target.value })
                  }
                  placeholder="Enter diagnosis..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                  rows="3"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Findings *
                </label>
                <textarea
                  value={formData.findings}
                  onChange={(e) =>
                    setFormData({ ...formData, findings: e.target.value })
                  }
                  placeholder="Enter clinical findings..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Treatment *
                </label>
                <textarea
                  value={formData.treatment}
                  onChange={(e) =>
                    setFormData({ ...formData, treatment: e.target.value })
                  }
                  placeholder="Enter treatment plan..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Enter any additional notes..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment (optional)</label>
                <input type="file" onChange={(e) => setAttachmentFile(e.target.files[0] || null)} />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {editingId ? "Update Report" : "Create Report"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingId(null);
                    setFormData({
                      appointmentId: "",
                      patientId: "",
                      diagnosis: "",
                      findings: "",
                      treatment: "",
                      notes: "",
                    });
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Card */}
        <div className="mb-8 bg-white rounded-lg p-6 shadow-md border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm font-semibold">Total Reports</p>
          <p className="text-3xl font-bold text-blue-600">{reports.length}</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading reports...</div>
          </div>
        )}

        {/* Reports List */}
        {!loading && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report._id}
                ref={highlightId === report._id ? highlightRef : null}
                className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${highlightId === report._id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                  }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 flex-1">
                    <FileText className="text-blue-600 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {role === "doctor" ? report.patient?.name : `Dr. ${report.doctor?.name}`}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {new Date(report.reportDate).toLocaleDateString()}
                        {role !== "doctor" && report.doctor?.specialization && ` - ${report.doctor.specialization}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportPDF(report)}
                      disabled={downloadingReportId === report._id}
                      className="text-green-600 hover:text-green-800 px-2 py-2 hover:bg-green-50 rounded disabled:opacity-60 text-sm font-semibold"
                      title="Download PDF"
                    >
                      {downloadingReportId === report._id && downloadingReportAction === "pdf" ? (
                        <span className="flex items-center gap-1">
                          <Loader2 size={16} className="animate-spin" /> Downloading...
                        </span>
                      ) : (
                        <Download size={20} />
                      )}
                    </button>
                    {report.attachment?.filename && (
                      <button
                        onClick={() => handleDownloadAttachment(report)}
                        disabled={downloadingReportId === report._id}
                        className="text-indigo-600 hover:text-indigo-800 px-2 py-2 hover:bg-indigo-50 rounded disabled:opacity-60 text-sm font-semibold"
                        title="Download original attachment"
                      >
                        {downloadingReportId === report._id && downloadingReportAction === "attachment" ? (
                          <span className="flex items-center gap-1">
                            <Loader2 size={16} className="animate-spin" /> Downloading...
                          </span>
                        ) : (
                          <Download size={20} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedReport(selectedReport === report._id ? null : report._id)}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                      title="View details"
                    >
                      <Eye size={20} />
                    </button>
                    {role === "doctor" && (
                      <>
                        <button
                          onClick={() => handleEditClick(report)}
                          className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-100 rounded"
                          title="Edit report"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report._id)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                          title="Delete report"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {selectedReport === report._id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 bg-gray-50 p-4 rounded-lg space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Diagnosis:</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{report.diagnosis}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Findings:</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{report.findings}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Treatment:</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{report.treatment}</p>
                    </div>
                    {report.notes && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Notes:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{report.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && !showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No reports available</p>
            {role === "doctor" && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Report
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Reports;
