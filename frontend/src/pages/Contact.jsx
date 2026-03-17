import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Mail, Phone, MapPin, Clock, Send, ArrowLeft, CheckCircle, AlertCircle, Loader } from "lucide-react";import { API_BASE } from '../config';


function Contact() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    category: "general",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [contactInfo, setContactInfo] = useState([]);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const getIconComponent = (iconName) => {
    const iconMap = {
      mail: Mail,
      phone: Phone,
      "map-pin": MapPin,
      clock: Clock,
    };
    return iconMap[iconName] || Mail;
  };

  const fetchContactInfo = async () => {
    try {
      setLoadingInfo(true);
      const response = await fetch(`${API_BASE}/api/contact/info`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContactInfo(data);
      } else {
        // Fallback to default contact info if endpoint not available
        setContactInfo([
          {
            iconName: "mail",
            title: "Email",
            value: "sharmapranshu136@gmail.com",
            description: "We'll respond within 24 hours",
          },
          {
            iconName: "phone",
            title: "Phone",
            value: "+1 (800) 555-CARE",
            description: "Monday - Friday, 8 AM - 8 PM EST",
          },
          {
            iconName: "map-pin",
            title: "Headquarters",
            value: "456 Healthcare Blvd, Boston, MA 02101",
            description: "Visit us for consultations",
          },
          {
            iconName: "clock",
            title: "Emergency Support",
            value: "+1 (800) 555-9999",
            description: "24/7 Available",
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching contact info:", err);
      // Fallback to default contact info
      setContactInfo([
        {
          iconName: "mail",
          title: "Email",
          value: "sharmapranshu136@gmail.com",
          description: "We'll respond within 24 hours",
        },
        {
          iconName: "phone",
          title: "Phone",
          value: "+1 (800) 555-CARE",
          description: "Monday - Friday, 8 AM - 8 PM EST",
        },
        {
          iconName: "map-pin",
          title: "Headquarters",
          value: "456 Healthcare Blvd, Boston, MA 02101",
          description: "Visit us for consultations",
        },
        {
          iconName: "clock",
          title: "Emergency Support",
          value: "+1 (800) 555-9999",
          description: "24/7 Available",
        },
      ]);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Send to backend
      const response = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setSuccess(true);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "", category: "general" });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to send message. Please try again or contact us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-brand-gradient text-white shadow-button mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Contact Us</h1>
          <p className="text-blue-100 mt-2">Get in touch with our support team</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {loadingInfo ? (
            <div className="col-span-1 lg:col-span-3 flex items-center justify-center py-8">
              <Loader className="animate-spin text-brand-blue" size={32} />
            </div>
          ) : (
            contactInfo.map((info, idx) => {
              const IconComponent = getIconComponent(info.iconName);
              return (
                <div key={idx} className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-200 hover:shadow-xl transition">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-brand-gradient rounded-lg">
                      <IconComponent className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{info.title}</h3>
                      <p className="text-blue-600 font-semibold text-sm">{info.value}</p>
                      <p className="text-gray-700 text-xs mt-1">{info.description}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-green-700 font-medium">Message sent successfully! We'll respond soon.</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number (Optional)"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition"
                />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition bg-white"
                >
                  <option value="general">General Inquiry</option>
                  <option value="appointment">Appointment Issue</option>
                  <option value="billing">Billing & Payment</option>
                  <option value="technical">Technical Support</option>
                  <option value="feedback">Feedback</option>
                  <option value="complaint">Complaint</option>
                </select>
              </div>

              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition"
              />

              <textarea
                name="message"
                placeholder="Describe your issue or inquiry in detail..."
                rows="5"
                value={formData.message}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition resize-none"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-gradient text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          {/* FAQ Section */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>

              <div className="space-y-4">
                {[
                  {
                    q: "What is your typical response time?",
                    a: "For general inquiries, we respond within 24 hours. For urgent issues, please call our emergency line at +1 (800) 555-9999.",
                  },
                  {
                    q: "Can I schedule a virtual consultation?",
                    a: "Yes! Use the 'Book Appointment' feature in your Dashboard to schedule with any available doctor. Virtual consultations are available for most specialties.",
                  },
                  {
                    q: "How do I reset my account or delete it?",
                    a: "Contact our support team with proof of identity. Account deletion is permanent and will erase all medical records.",
                  },
                  {
                    q: "What payment methods do you accept?",
                    a: "We accept all major credit cards (Visa, Mastercard, Amex), digital wallets (Apple Pay, Google Pay), and bank transfers.",
                  },
                  {
                    q: "Are my medical records HIPAA compliant?",
                    a: "Absolutely. We comply with HIPAA regulations and use enterprise-grade encryption to protect all patient data.",
                  },
                  {
                    q: "Can I get a refund for my subscription?",
                    a: "Yes, we offer a 30-day money-back guarantee if you're not satisfied with our service.",
                  },
                ].map((faq, idx) => (
                  <details
                    key={idx}
                    className="group bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition border border-gray-200"
                  >
                    <summary className="font-semibold text-gray-900 flex justify-between items-center">
                      {faq.q}
                      <span className="text-gray-400 group-open:rotate-180 transition">▼</span>
                    </summary>
                    <p className="text-gray-700 text-sm mt-2">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Contact;
