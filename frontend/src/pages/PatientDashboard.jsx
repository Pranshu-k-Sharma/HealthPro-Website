import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

function PatientDashboard() {
  const navigate = useNavigate();

  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
  ];

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setError("Failed to load appointments");
        return;
      }

      const data = await response.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      setError("Server error");
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleBook = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctorName,
          date,
          timeSlot,   // ✅ fixed spelling
        }),
      });

      if (response.ok) {
        setDoctorName("");
        setDate("");
        setTimeSlot("");  // ✅ reset slot
        fetchAppointments();
      } else {
        const data = await response.json();
        alert(data.message || "Error booking appointment");
      }
    } catch (error) {
      alert("Server error");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getStatusColor = (status) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Patient Dashboard 🏥
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      {/* Booking Card */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Book Appointment</h2>

        <form onSubmit={handleBook} className="grid gap-4 md:grid-cols-4">
          <input
            type="text"
            placeholder="Doctor Name"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            required
            className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="border rounded-lg px-4 py-2"
          />

          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            required
            className="border rounded-lg px-4 py-2"
          >
            <option value="">Select Time Slot</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition"
          >
            Book
          </button>
        </form>
      </div>

      {/* Appointment List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Appointments</h2>

        {error && <p className="text-red-500">{error}</p>}

        {appointments.length === 0 ? (
          <p className="text-gray-500">No appointments yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {appointments.map((appt) => (
              <div
                key={appt._id}
                className="bg-white p-5 rounded-xl shadow-md"
              >
                <p className="font-semibold text-lg">
                  Dr. {appt.doctorName}
                </p>

                <p className="text-gray-600 mt-1">
                  {new Date(appt.date).toLocaleDateString()}
                </p>

                <p className="text-gray-600">
                  Time: {appt.timeSlot}
                </p>

                <span
                  className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    appt.status
                  )}`}
                >
                  {appt.status}
                </span>

                {appt.prescription && (
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                    <p className="font-semibold">Prescription:</p>
                    <p className="text-gray-700 mt-1">
                      {appt.prescription}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDashboard;
