import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Pill, Download, Edit2, Trash2, RefreshCw, Printer, ArrowLeft } from "lucide-react";
import Layout from "../components/Layout";
import { API_BASE } from '../config';

function Prescriptions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const highlightRef = useRef(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [formData, setFormData] = useState({
    appointmentId: "",
    patientId: "",
    medicines: [{ name: "", dosage: "", frequency: "Once daily", duration: "", instructions: "" }],
    notes: "",
    expiryDate: "",
  });

  useEffect(() => {
    fetchPrescriptions();
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

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const url = role === "doctor"
        ? `${API_BASE}/api/prescriptions/doctor`
        : `${API_BASE}/api/prescriptions`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch prescriptions");

      const data = await response.json();
      setPrescriptions(data);
      setError("");
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      setError("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/appointments/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch appointments");

      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  const handleAddMedicine = () => {
    setFormData({
      ...formData,
      medicines: [
        ...formData.medicines,
        { name: "", dosage: "", frequency: "Once daily", duration: "", instructions: "" },
      ],
    });
  };

  const handleRemoveMedicine = (index) => {
    setFormData({
      ...formData,
      medicines: formData.medicines.filter((_, i) => i !== index),
    });
  };

  const handleMedicineChange = (index, field, value) => {
    const updatedMedicines = [...formData.medicines];
    updatedMedicines[index][field] = value;
    setFormData({ ...formData, medicines: updatedMedicines });
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();

    if (!formData.appointmentId || !formData.patientId || formData.medicines.length === 0) {
      setError("Please fill in all required fields");
      return;
    }

    // Check if all medicines have required fields
    if (formData.medicines.some((m) => !m.name || !m.dosage || !m.duration)) {
      setError("Please fill in all medicine details");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/prescriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error("Failed to create prescription");

      const newPrescription = await response.json();
      setPrescriptions([newPrescription.prescription, ...prescriptions]);
      setShowCreateForm(false);
      setFormData({
        appointmentId: "",
        patientId: "",
        medicines: [{ name: "", dosage: "", frequency: "Once daily", duration: "", instructions: "" }],
        notes: "",
        expiryDate: "",
      });
      setError("");
    } catch (err) {
      console.error("Error creating prescription:", err);
      setError("Failed to create prescription");
    }
  };

  const handleUpdatePrescription = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${API_BASE}/api/prescriptions/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            medicines: formData.medicines,
            notes: formData.notes,
            expiryDate: formData.expiryDate,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update prescription");

      const updatedPrescription = await response.json();
      setPrescriptions(
        prescriptions.map((p) =>
          p._id === editingId ? updatedPrescription.prescription : p
        )
      );
      setEditingId(null);
      setFormData({
        appointmentId: "",
        patientId: "",
        medicines: [{ name: "", dosage: "", frequency: "Once daily", duration: "", instructions: "" }],
        notes: "",
        expiryDate: "",
      });
      setError("");
    } catch (err) {
      console.error("Error updating prescription:", err);
      setError("Failed to update prescription");
    }
  };

  const handleRenewPrescription = async (prescriptionId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/prescriptions/${prescriptionId}/renew`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }),
        }
      );

      if (!response.ok) throw new Error("Failed to renew prescription");

      const renewedPrescription = await response.json();
      setPrescriptions(
        prescriptions.map((p) =>
          p._id === prescriptionId ? renewedPrescription.prescription : p
        )
      );
    } catch (err) {
      console.error("Error renewing prescription:", err);
      setError("Failed to renew prescription");
    }
  };

  const handleDeletePrescription = async (prescriptionId) => {
    if (!window.confirm("Are you sure you want to delete this prescription?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/prescriptions/${prescriptionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to delete prescription");

      setPrescriptions(
        prescriptions.filter((p) => p._id !== prescriptionId)
      );
    } catch (err) {
      console.error("Error deleting prescription:", err);
      setError("Failed to delete prescription");
    }
  };

  const handleEditClick = (prescription) => {
    setEditingId(prescription._id);
    setFormData({
      appointmentId: prescription.appointment._id,
      patientId: prescription.patient._id,
      medicines: prescription.medicines,
      notes: prescription.notes || "",
      expiryDate: prescription.expiryDate ? prescription.expiryDate.split("T")[0] : "",
    });
  };

  const handlePrintPrescription = (prescription) => {
    const printWindow = window.open("", "", "height=600,width=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; }
            .patient-info { margin-bottom: 20px; }
            .medicines { margin-top: 20px; }
            .medicine { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; }
            .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PRESCRIPTION</h1>
          </div>
          <div class="patient-info">
            <p><strong>Patient Name:</strong> ${prescription.patient.name}</p>
            <p><strong>Patient Email:</strong> ${prescription.patient.email}</p>
            <p><strong>Issue Date:</strong> ${new Date(prescription.issuedDate).toLocaleDateString()}</p>
          </div>
          <div class="medicines">
            <h2>Medicines</h2>
            ${prescription.medicines
        .map(
          (med) => `
              <div class="medicine">
                <p><strong>Medicine:</strong> ${med.name}</p>
                <p><strong>Dosage:</strong> ${med.dosage}</p>
                <p><strong>Frequency:</strong> ${med.frequency}</p>
                <p><strong>Duration:</strong> ${med.duration}</p>
                ${med.instructions ? `<p><strong>Instructions:</strong> ${med.instructions}</p>` : ""}
              </div>
            `
        )
        .join("")}
          </div>
          ${prescription.notes ? `<div><h3>Notes:</h3><p>${prescription.notes}</p></div>` : ""}
          <div class="footer">
            <p>Printed on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 truncate text-white">Prescriptions</h1>
              <p className="text-blue-100 text-base sm:text-lg">
                {role === "doctor" ? "Manage patient prescriptions and medicines" : "View your active and past prescriptions"}
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
                    medicines: [{ name: "", dosage: "", frequency: "Once daily", duration: "", instructions: "" }],
                    notes: "",
                    expiryDate: "",
                  });
                }}
                className="bg-white text-brand-blue border-2 border-brand-blue px-6 py-3 rounded-lg shadow-button hover:bg-brand-alt transition-colors flex items-center gap-2 font-semibold flex-shrink-0"
              >
                <Plus size={20} />
                New Prescription
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
              {editingId ? "Edit Prescription" : "Create New Prescription"}
            </h2>

            <form onSubmit={editingId ? handleUpdatePrescription : handleCreatePrescription}>
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

              {/* Medicines */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Medicines *</h3>
                {formData.medicines.map((medicine, index) => (
                  <div
                    key={index}
                    className="mb-6 p-6 border border-gray-300 rounded-lg bg-gray-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Medicine Name *
                        </label>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) =>
                            handleMedicineChange(index, "name", e.target.value)
                          }
                          placeholder="e.g., Aspirin, Paracetamol"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) =>
                            handleMedicineChange(index, "dosage", e.target.value)
                          }
                          placeholder="e.g., 500mg, 2 tablets"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Frequency *
                        </label>
                        <select
                          value={medicine.frequency}
                          onChange={(e) =>
                            handleMedicineChange(index, "frequency", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
                          required
                        >
                          <option>Once daily</option>
                          <option>Twice daily</option>
                          <option>Thrice daily</option>
                          <option>Every 4 hours</option>
                          <option>Every 6 hours</option>
                          <option>Every 8 hours</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Duration *
                        </label>
                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(e) =>
                            handleMedicineChange(index, "duration", e.target.value)
                          }
                          placeholder="e.g., 7 days, 2 weeks"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Instructions
                      </label>
                      <input
                        type="text"
                        value={medicine.instructions}
                        onChange={(e) =>
                          handleMedicineChange(index, "instructions", e.target.value)
                        }
                        placeholder="e.g., Take with food, avoid dairy"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {formData.medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(index)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm"
                      >
                        Remove Medicine
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Another Medicine
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
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

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {editingId ? "Update Prescription" : "Create Prescription"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingId(null);
                    setFormData({
                      appointmentId: "",
                      patientId: "",
                      medicines: [{ name: "", dosage: "", frequency: "Once daily", duration: "", instructions: "" }],
                      notes: "",
                      expiryDate: "",
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
          <p className="text-gray-600 text-sm font-semibold">Total Prescriptions</p>
          <p className="text-3xl font-bold text-blue-600">{prescriptions.length}</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading prescriptions...</div>
          </div>
        )}

        {/* Prescriptions List */}
        {!loading && prescriptions.length > 0 && (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <div
                key={prescription._id}
                ref={highlightId === prescription._id ? highlightRef : null}
                className={`bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow ${highlightId === prescription._id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                  }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 flex-1">
                    <Pill className="text-blue-600 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {role === "doctor" ? prescription.patient?.name : `Dr. ${prescription.doctor?.name}`}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {role === "doctor"
                          ? `Issued: ${new Date(prescription.issuedDate).toLocaleDateString()}`
                          : `${prescription.doctor?.specialization || "Doctor"} - Issued: ${new Date(prescription.issuedDate).toLocaleDateString()}`}
                      </p>
                      {prescription.renewalCount > 0 && (
                        <p className="text-sm text-gray-500">
                          Renewable: {prescription.renewalCount} time(s)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedPrescription(
                          selectedPrescription === prescription._id
                            ? null
                            : prescription._id
                        )
                      }
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                      title="View details"
                    >
                      <Download size={20} />
                    </button>
                    {role === "doctor" && (
                      <>
                        <button
                          onClick={() => handleEditClick(prescription)}
                          className="text-gray-600 hover:text-gray-800 p-2 hover:bg-gray-100 rounded"
                          title="Edit prescription"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleRenewPrescription(prescription._id)}
                          className="text-orange-600 hover:text-orange-800 p-2 hover:bg-orange-50 rounded"
                          title="Renew prescription"
                        >
                          <RefreshCw size={20} />
                        </button>
                        <button
                          onClick={() => handleDeletePrescription(prescription._id)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                          title="Delete prescription"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {selectedPrescription === prescription._id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-4">Medicines:</h4>
                    <div className="space-y-3">
                      {prescription.medicines.map((med, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-3 rounded border border-gray-200"
                        >
                          <p className="font-semibold text-gray-800">{med.name}</p>
                          <p className="text-sm text-gray-600">
                            Dosage: {med.dosage}
                          </p>
                          <p className="text-sm text-gray-600">
                            Frequency: {med.frequency}
                          </p>
                          <p className="text-sm text-gray-600">
                            Duration: {med.duration}
                          </p>
                          {med.instructions && (
                            <p className="text-sm text-gray-600">
                              Instructions: {med.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {prescription.notes && (
                      <div className="mt-4">
                        <p className="font-semibold text-gray-800">Notes:</p>
                        <p className="text-gray-700">{prescription.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && prescriptions.length === 0 && !showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Pill className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No prescriptions created yet</p>
            {role === "doctor" && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Prescription
              </button>
            )}
          </div>
        )}
      </div>
    </Layout >
  );
}

export default Prescriptions;
