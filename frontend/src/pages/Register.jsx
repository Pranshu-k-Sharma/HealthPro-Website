import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, Stethoscope, AlertCircle, Eye, EyeOff, ArrowRight, Camera } from "lucide-react";
import BackgroundSlideshow from "../components/BackgroundSlideshow";import { API_BASE } from '../config';


function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // Step 1: Role, Step 2: Details
  const [role, setRole] = useState("patient"); // "patient" or "doctor"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const specializations = [
    "Cardiologist",
    "Dentist",
    "Dermatologist",
    "Endocrinologist",
    "Gastroenterologist",
    "General Practitioner",
    "Nephrologist",
    "Neurologist",
    "Oncologist",
    "Ophthalmologist",
    "Orthopedist",
    "Pediatrician",
    "Psychiatrist",
    "Pulmonologist",
    "Rheumatologist",
  ];

  const handleRoleSelection = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
    setError("");
    // Reset profile picture when changing roles
    setProfilePicture(null);
    setProfilePicturePreview(null);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      // Read file and convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
        setProfilePicturePreview(reader.result);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (role === "doctor" && !specialization) {
      setError("Specialization is required for doctors");
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        email,
        password,
        role,
      };

      // Add specialization and profile picture for doctors
      if (role === "doctor") {
        payload.specialization = specialization;
        if (profilePicture) {
          payload.profilePicture = profilePicture;
        }
      }

      const response = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Success - redirect to login
      navigate("/login", {
        state: { message: "Registration successful! Please login." },
      });
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-soft-highlight">
      {/* Navigation */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="p-1 rounded-lg bg-white/0">
              <img src="/images/logo.png.png" alt="HealthPro logo" className="w-10 h-10 object-contain rounded-full" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}><span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span><span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span></h1>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="text-brand-body hover:text-brand-green font-semibold transition-colors"
          >
            Already have an account?
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
          {/* Left Side - Background slideshow */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Create Your <span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span><span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span> Account</h2>
              <p className="text-gray-600 text-lg">Choose your role to get started with <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#1E3A8A' }}>Health</span><span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#10B981' }}>Pro</span></p>
            </div>
            <BackgroundSlideshow />
          </div>

          {/* Right Side - Steps/Form */}
          <div className="lg:col-span-3">
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Create Your <span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span><span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span> Account
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Choose your role to get started with <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: '#1E3A8A' }}>Health</span><span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#10B981' }}>Pro</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">









                  {/* Patient Card */}
                  <button
                    onClick={() => handleRoleSelection("patient")}
                    className="group relative bg-white rounded-3xl p-8 shadow-card hover:shadow-lg transition-all border-2 border-brand-border hover:border-brand-blue text-left"
                  >
                    <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-25 transition-opacity">
                      <UserCheck size={80} className="text-blue-600" />
                    </div>

                    <div className="relative z-10">
                      <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                        <UserCheck size={32} className="text-brand-blue" />
                      </div>

                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Patient</h3>
                      <p className="text-gray-600 mb-6">Book appointments, track prescriptions, and manage your health records</p>

                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          Book appointments easily
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          Access medical records
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          Manage prescriptions
                        </li>
                      </ul>

                      <div className="mt-6 inline-flex items-center gap-2 text-brand-blue font-semibold group-hover:gap-3 transition-all">
                        Continue as Patient
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </button>

                  {/* Doctor Card */}
                  <button
                    onClick={() => handleRoleSelection("doctor")}
                    className="group relative bg-white rounded-3xl p-8 shadow-card hover:shadow-lg transition-all border-2 border-brand-border hover:border-brand-green text-left"
                  >
                    <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-25 transition-opacity">
                      <Stethoscope size={80} className="text-brand-green" />
                    </div>

                    <div className="relative z-10">
                      <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                        <Stethoscope size={32} className="text-brand-green" />
                      </div>

                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Doctor</h3>
                      <p className="text-gray-600 mb-6">Manage patients, prescriptions, and medical records efficiently</p>

                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                          Manage appointments
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                          Create prescriptions
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                          Write medical reports
                        </li>
                      </ul>

                      <div className="mt-6 inline-flex items-center gap-2 text-brand-green font-semibold group-hover:gap-3 transition-all">
                        Continue as Doctor
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Registration Form */}
            {step === 2 && (
              <div className="max-w-2xl mx-auto">
            {/* Progress Indicator */}
            <div className="mb-8 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div className="w-8 h-8 border-2 border-blue-600 text-blue-600 flex items-center justify-center font-semibold text-sm rounded-full">
                  2
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-3xl shadow-card p-8 border border-brand-border">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  {role === "patient" ? (
                    <UserCheck className="text-blue-600" size={28} />
                  ) : (
                    <Stethoscope className="text-brand-green" size={28} />
                  )}
                  <h2 className="text-3xl font-bold text-gray-800">
                    {role === "patient" ? "Patient" : "Doctor"} Registration
                  </h2>
                </div>
                <p className="text-gray-600">
                  Fill in your details to create your account
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-semibold text-red-900">Registration Error</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Doctor-specific Field */}
                {role === "doctor" && (
                  <div className="space-y-6">
                    {/* Specialization */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Specialization *
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                      >
                        <option value="">Select your specialization</option>
                        {specializations.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Profile Picture Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Profile Picture (Optional)
                      </label>
                      <div className="space-y-4">
                        {/* Picture Preview */}
                        {profilePicturePreview && (
                          <div className="relative w-24 h-24 mx-auto">
                            <img
                              src={profilePicturePreview}
                              alt="Profile preview"
                              className="w-full h-full rounded-full object-cover object-center border-4 border-blue-200 shadow-lg"
                            />
                            <button
                              type="button"
                              onClick={removeProfilePicture}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* File Input */}
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                          />
                          <div className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-8 text-center cursor-pointer hover:border-brand-green hover:bg-[#E6F9F4] transition-all">
                            <Camera className="text-gray-400 mx-auto mb-2" size={32} />
                            <div className="text-gray-600">
                              <p className="font-semibold mb-1">
                                {profilePicture ? "Change Photo" : "Upload Photo"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Click or drag PNG, JPG (max 5MB)
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="mt-1 rounded"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-gradient text-white font-semibold py-3 rounded-lg shadow-button hover:bg-brand-gradient-hover hover:shadow-button-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              {/* Login Link */}
              <p className="text-center text-gray-600 mt-6">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-brand-blue hover:text-brand-green font-semibold"
                >
                  Login here
                </button>
              </p>
            </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

