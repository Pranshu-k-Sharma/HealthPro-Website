import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const ViewPatientProfile = lazy(() => import("./pages/ViewPatientProfile"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const Patients = lazy(() => import("./pages/Patients"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Reports = lazy(() => import("./pages/Reports"));
const Prescriptions = lazy(() => import("./pages/Prescriptions"));
const HealthScoreTest = lazy(() => import("./pages/HealthScoreTest"));
const Profile = lazy(() => import("./pages/Profile"));
const Contact = lazy(() => import("./pages/Contact"));
const CustomerCare = lazy(() => import("./pages/CustomerCare"));
const PaymentOptions = lazy(() => import("./pages/PaymentOptions"));
const ConsultationRoom = lazy(() => import("./pages/ConsultationRoom"));
const Consultations = lazy(() => import("./pages/Consultations"));

const getPageTitle = (pathname, patientName, doctorName, loggedInDoctorName, role) => {
  const doctorSuffix = role === "doctor" && loggedInDoctorName ? ` | Dr. ${loggedInDoctorName}` : "";

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

function RouteTitleManager() {
  const location = useLocation();
  const [activePatientName, setActivePatientName] = useState(
    sessionStorage.getItem("activePatientName") || ""
  );
  const [activeDoctorName, setActiveDoctorName] = useState(
    sessionStorage.getItem("activeDoctorName") || ""
  );
  const [loggedInDoctorName, setLoggedInDoctorName] = useState(
    sessionStorage.getItem("loggedInDoctorName") || ""
  );

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

  useEffect(() => {
    const role = localStorage.getItem("role");
    document.title = `HealthPro | ${getPageTitle(
      location.pathname,
      activePatientName,
      activeDoctorName,
      loggedInDoctorName,
      role
    )}`;
  }, [location.pathname, activePatientName, activeDoctorName, loggedInDoctorName]);

  return null;
}

function App() {
  const routeFallback = (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm text-slate-700 text-sm font-medium">
        Loading page...
      </div>
    </div>
  );

  return (
    <Router>
      <RouteTitleManager />
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route
            path="/book-appointment"
            element={
              <ProtectedRoute allowedRole="patient">
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="patient">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients"
            element={
              <ProtectedRoute allowedRole="doctor">
                <Patients />
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/prescriptions"
            element={
              <ProtectedRoute>
                <Prescriptions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient/:patientId"
            element={
              <ProtectedRoute allowedRole="doctor">
                <ViewPatientProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/health-score"
            element={
              <ProtectedRoute allowedRole="patient">
                <HealthScoreTest />
              </ProtectedRoute>
            }
          />

          {/* Profile — accessible by both roles */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Contact Us — accessible by both roles */}
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <Contact />
              </ProtectedRoute>
            }
          />

          {/* Customer Care — accessible by both roles */}
          <Route
            path="/customer-care"
            element={
              <ProtectedRoute>
                <CustomerCare />
              </ProtectedRoute>
            }
          />

          {/* Payment Options — accessible by both roles */}
          <Route
            path="/payment-options"
            element={
              <ProtectedRoute>
                <PaymentOptions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/consultations"
            element={
              <ProtectedRoute>
                <Consultations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/consultation/:appointmentId"
            element={
              <ProtectedRoute>
                <ConsultationRoom />
              </ProtectedRoute>
            }
          />

        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
