import React, { useState, useEffect } from "react";
import { Search, Mail, Phone, Edit2, Trash2, Eye, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { API_BASE } from '../config';

function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPatient, setEditingPatient] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      // Fetch all appointments for THE CURRENT DOCTOR (not all)
      const response = await fetch(`${API_BASE}/api/appointments/doctor`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch appointments");

      const appointments = await response.json();

      // Extract unique patients from appointments of THIS DOCTOR
      const patientMap = new Map();
      appointments.forEach((apt) => {
        if (apt.patient && !patientMap.has(apt.patient._id)) {
          patientMap.set(apt.patient._id, {
            _id: apt.patient._id,
            name: apt.patient.name,
            email: apt.patient.email,
            phone: apt.patient.phone || "N/A",
            appointmentCount: 0,
            lastAppointment: apt.appointmentDate,
          });
        }
      });

      // Count appointments per patient for THIS DOCTOR only
      appointments.forEach((apt) => {
        const patient = patientMap.get(apt.patient._id);
        if (patient) {
          patient.appointmentCount += 1;
          if (new Date(apt.appointmentDate) > new Date(patient.lastAppointment)) {
            patient.lastAppointment = apt.appointmentDate;
          }
        }
      });

      setPatients(Array.from(patientMap.values()));
      setError("");
    } catch (err) {
      console.error("Error fetching patients:", err);
      setError("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (patient) => {
    setEditingPatient(patient._id);
    setEditForm({ name: patient.name, email: patient.email, phone: patient.phone });
  };

  const handleSaveEdit = async (patientId) => {
    // In a real app, this would call an API to update patient info
    const updatedPatients = patients.map((p) =>
      p._id === patientId
        ? { ...p, name: editForm.name, email: editForm.email, phone: editForm.phone }
        : p
    );
    setPatients(updatedPatients);
    setEditingPatient(null);
    setEditForm({ name: "", email: "", phone: "" });
  };

  const handleDeletePatient = (patientId) => {
    if (window.confirm("Are you sure you want to remove this patient?")) {
      setPatients(patients.filter((p) => p._id !== patientId));
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 truncate text-blue-50">My Patients</h1>
            <p className="text-blue-100 text-base sm:text-lg">Manage and view your patient list</p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">

        {/* Search and Filter */}
        <div className="mb-4 sm:mb-6 flex gap-3 sm:gap-4 flex-wrap">
          <div className="flex-1 min-w-xs relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-6 shadow-card border border-brand-border border-l-4 border-brand-blue">
            <p className="text-gray-600 text-sm font-semibold">Total Patients</p>
            <p className="text-3xl font-bold text-brand-blue">{patients.length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-card border border-brand-border border-l-4 border-brand-green">
            <p className="text-gray-600 text-sm font-semibold">Filtered Results</p>
            <p className="text-3xl font-bold text-brand-green">{filteredPatients.length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-card border border-brand-border border-l-4 border-brand-blue">
            <p className="text-gray-600 text-sm font-semibold">Total Appointments</p>
            <p className="text-3xl font-bold text-brand-blue">
              {patients.reduce((sum, p) => sum + p.appointmentCount, 0)}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading patients...</div>
          </div>
        )}

        {/* Patients Table */}
        {!loading && filteredPatients.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-brand-gradient text-white">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Phone</th>
                  <th className="px-6 py-3 text-left font-semibold">Appointments</th>
                  <th className="px-6 py-3 text-left font-semibold">Last Appointment</th>
                  <th className="px-6 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient._id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      {editingPatient === patient._id ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="border px-2 py-1 rounded w-full"
                        />
                      ) : (
                        <button
                          onClick={() => navigate(`/patient/${patient._id}`)}
                          className="font-semibold text-brand-blue hover:text-brand-green hover:underline cursor-pointer transition"
                        >
                          {patient.name}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingPatient === patient._id ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          className="border px-2 py-1 rounded w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={16} />
                          {patient.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingPatient === patient._id ? (
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm({ ...editForm, phone: e.target.value })
                          }
                          className="border px-2 py-1 rounded w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={16} />
                          {patient.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {patient.appointmentCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(patient.lastAppointment).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {editingPatient === patient._id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(patient._id)}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPatient(null)}
                              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`/patient/${patient._id}`)}
                              className="text-green-500 hover:text-green-700 transition"
                              title="View patient details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEditClick(patient)}
                              className="text-blue-500 hover:text-blue-700 transition"
                              title="Edit patient"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeletePatient(patient._id)}
                              className="text-red-500 hover:text-red-700 transition"
                              title="Remove patient"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPatients.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg">
              {searchTerm ? "No patients found matching your search" : "No patients yet"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Patients;
