import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import BackgroundSlideshow from "../components/BackgroundSlideshow";import { API_BASE } from '../config';


function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Decode JWT to get role
  const getRoleFromToken = (token) => {
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.role;
    } catch {
      return null;
    }
  };



  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid server response");
      }

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save token
      localStorage.setItem("token", data.token);

      // Extract role from JWT token
      const role = getRoleFromToken(data.token);
      if (!role) {
        throw new Error("Invalid token - no role found");
      }

      localStorage.setItem("role", role);

      // Role-based navigation
      if (role === "doctor") {
        navigate("/doctor");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
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
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src="/images/logo.png.png" alt="HealthPro logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold tracking-wide truncate" style={{ fontFamily: 'Poppins, sans-serif' }}><span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span><span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span></h1>
          </div>
          <button
            onClick={() => navigate("/register")}
            className="text-brand-body hover:text-brand-green font-semibold transition-colors text-sm sm:text-base shrink-0"
          >
            Create Account
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start lg:items-center">
          {/* Left Side - Background slideshow */}
          <div className="lg:col-span-2">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Welcome to <span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span><span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span>
              </h2>
              <p className="text-gray-600 text-lg">
                Connect with experienced healthcare professionals and manage your health journey with ease.
              </p>
            </div>

            <BackgroundSlideshow />
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-card p-5 sm:p-6 md:p-8 border border-brand-border">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Login</h2>
              <p className="text-gray-600 mb-8">
                Sign in to your account to continue
              </p>

              {/* Error Alert */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-semibold text-red-900">Login Error</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
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
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
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

                {/* Remember & Forgot Password */}
                <div className="flex justify-between items-center text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-brand-blue hover:text-brand-green font-semibold transition"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-gradient text-white font-semibold py-3 rounded-lg shadow-button hover:bg-brand-gradient-hover hover:shadow-button-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <LogIn size={20} />
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-600">
                    Don't have an account?
                  </span>
                </div>
              </div>

              {/* Sign Up Link */}
              <button
                onClick={() => navigate("/register")}
                className="w-full bg-white border-2 border-brand-blue text-brand-blue font-semibold py-3 rounded-lg hover:bg-brand-gradient hover:text-white transition-all"
              >
                Create New Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

