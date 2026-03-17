import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";import { API_BASE } from '../config';


function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/users/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      // Store token for next step (in production, token would be sent via email)
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setSuccess("Reset link sent! Proceed to reset your password.");
        setEmail("");
      } else {
        setSuccess(data.message);
      }
    } catch (err) {
      console.error("Forgot password error:", err);
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
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-lg bg-white/0">
              <img src="/images/logo.png.png" alt="HealthPro logo" className="w-10 h-10 object-contain rounded-full" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span>
            </h1>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-brand-body hover:text-brand-green font-semibold transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Login
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Info */}
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">Reset Your Password</h2>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Don't worry! We'll help you reset your password. Enter your email address and we'll send you a link to create a new password.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <Mail size={24} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Enter Your Email</h3>
                  <p className="text-gray-600 mt-1">We'll verify that the account exists in our system</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                    <CheckCircle size={24} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Reset Link</h3>
                  <p className="text-gray-600 mt-1">You'll receive a link to reset your password</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="bg-white rounded-2xl shadow-card p-5 sm:p-6 md:p-8 border border-brand-border">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Forgot Password</h3>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-semibold">✓ {success}</p>
                <p className="text-sm mt-1">
                  {resetToken && (
                    <>
                      Your reset token: <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">{resetToken}</code>
                    </>
                  )}
                </p>
              </div>
            )}

            {resetToken ? (
              <button
                onClick={() => navigate(`/reset-password?token=${resetToken}`)}
                className="w-full bg-brand-gradient text-white font-semibold py-3 rounded-lg shadow-button hover:bg-brand-gradient-hover hover:shadow-button-hover transition-all"
              >
                Proceed to Reset Password
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-gradient text-white font-semibold py-3 rounded-lg shadow-button hover:bg-brand-gradient-hover hover:shadow-button-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-brand-blue hover:text-brand-green font-semibold text-sm"
                  >
                    Remember your password? Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
