import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ArrowLeft, Headphones, MessageSquare, Ticket, BookOpen, Search, ChevronDown, Phone, Loader } from "lucide-react";import { API_BASE } from '../config';


function CustomerCare() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isDoctorUser = role === "doctor";
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [faqCategories, setFaqCategories] = useState([]);
  const [supportChannels, setSupportChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFAQsAndChannels();
  }, []);

  const fetchFAQsAndChannels = async () => {
    try {
      setLoading(true);

      // Doctors get curated doctor-specific support content.
      if (isDoctorUser) {
        setDefaultData();
        return;
      }
      
      // Fetch FAQs
      const faqResponse = await fetch(`${API_BASE}/api/faqs`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // Fetch Support Channels
      const channelResponse = await fetch(`${API_BASE}/api/support-channels`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // If both endpoints are available, use them
      if (faqResponse.ok && channelResponse.ok) {
        const faqData = await faqResponse.json();
        const channelData = await channelResponse.json();
        setFaqCategories(faqData);
        setSupportChannels(channelData);
      } else {
        // Fallback to default data
        setDefaultData();
      }
    } catch (err) {
      console.error("Error fetching FAQs and channels:", err);
      // Fallback to default data
      setDefaultData();
    } finally {
      setLoading(false);
    }
  };

  const setDefaultData = () => {
    const defaultFaqCategories = isDoctorUser
      ? [
          {
            title: "Practice Workflow",
            icon: "🩺",
            faqs: [
              {
                q: "How do I manage my appointment queue?",
                a: "Open the Doctor Dashboard and use the Appointments section to confirm, reschedule, or complete patient visits.",
              },
              {
                q: "How do I update my consultation availability?",
                a: "Go to your profile settings and update working hours so patients can only book within your available slots.",
              },
              {
                q: "Can I view today's patient summary quickly?",
                a: "Yes, the Doctor Dashboard highlights upcoming appointments, pending follow-ups, and recent activity.",
              },
            ],
          },
          {
            title: "Patients & Records",
            icon: "📁",
            faqs: [
              {
                q: "How do I open a patient profile?",
                a: "Use the global search bar to find a patient and open their profile with medical history, reports, and prescriptions.",
              },
              {
                q: "How do I upload reports for a patient?",
                a: "Inside the patient or reports view, upload files and add notes so the patient can access them immediately.",
              },
              {
                q: "Can I edit a report after uploading?",
                a: "You can update report metadata and notes. If a file is incorrect, replace it with the corrected report version.",
              },
            ],
          },
          {
            title: "Prescriptions",
            icon: "💊",
            faqs: [
              {
                q: "How do I issue a new prescription?",
                a: "Go to Prescriptions, select the patient, add dosage and duration, then submit to publish it to the patient portal.",
              },
              {
                q: "Can I renew an existing prescription?",
                a: "Yes, open the existing prescription and choose renew or duplicate to create an updated version quickly.",
              },
              {
                q: "How do I prevent medication errors?",
                a: "Review allergies and recent medications on the patient profile before finalizing any prescription.",
              },
            ],
          },
          {
            title: "Technical Support",
            icon: "🛠️",
            faqs: [
              {
                q: "What should I do if dashboard data looks outdated?",
                a: "Refresh the page first. If data still lags, sign out and back in to re-sync your account session.",
              },
              {
                q: "How can I report a clinical workflow bug?",
                a: "Submit a support ticket with steps to reproduce, patient-safe screenshots, and the time of occurrence.",
              },
              {
                q: "Is doctor data secure on this platform?",
                a: "Yes, platform access is role-based and all sensitive data is transmitted using encrypted channels.",
              },
            ],
          },
        ]
      : [
          {
            title: "Account & Billing",
            icon: "💳",
            faqs: [
              {
                q: "How do I reset my password?",
                a: "Click 'Forgot Password' on the login page, enter your email, and follow the reset link sent to your inbox.",
              },
              {
                q: "Can I update my billing information?",
                a: "Yes, go to Settings or Payment Options in your profile menu to update billing details.",
              },
              {
                q: "How do I view my billing history?",
                a: "Visit the Payment Options page to see all past transactions and invoices.",
              },
            ],
          },
          {
            title: "Appointments",
            icon: "📅",
            faqs: [
              {
                q: "How do I book an appointment?",
                a: "From the Dashboard, click 'Book Appointment', select a doctor, date, and time, then confirm.",
              },
              {
                q: "Can I reschedule an appointment?",
                a: "Yes, if the appointment is still pending. Go to Appointments tab and look for reschedule option.",
              },
              {
                q: "What if I need to cancel an appointment?",
                a: "You can cancel pending appointments from the Appointments section. Note: Some cancellations may have fees.",
              },
            ],
          },
          {
            title: "Medical Records",
            icon: "📋",
            faqs: [
              {
                q: "How do I access my prescriptions?",
                a: "Go to the Prescriptions tab in Dashboard to see all active and past prescriptions.",
              },
              {
                q: "Can I download my medical reports?",
                a: "Yes, visit the Medical Records tab and click the download button next to any report.",
              },
              {
                q: "Are my records secure?",
                a: "We use end-to-end encryption and comply with HIPAA regulations to protect your data.",
              },
            ],
          },
          {
            title: "Technical Support",
            icon: "🛠️",
            faqs: [
              {
                q: "Is the app compatible with mobile devices?",
                a: "Yes, our app is fully responsive and works on all modern browsers and devices.",
              },
              {
                q: "What should I do if I encounter a bug?",
                a: "Report it through the Contact Us page with details, and our team will investigate.",
              },
              {
                q: "How often is the platform maintained?",
                a: "We perform regular maintenance (usually weekdays 2-3 AM) to ensure optimal performance.",
              },
            ],
          },
        ];

    const defaultSupportChannels = isDoctorUser
      ? [
          {
            icon: Phone,
            title: "Doctor Helpline",
            description: "Direct assistance for clinicians",
            contact: "+1 (555) 123-4567",
            hours: "Priority hours: 7 AM - 9 PM EST",
          },
          {
            icon: MessageSquare,
            title: "Live Operations Chat",
            description: "Real-time workflow help",
            contact: "Start doctor support chat",
            hours: "Available during clinic hours",
          },
          {
            icon: Ticket,
            title: "Clinical Support Tickets",
            description: "Track technical and workflow issues",
            contact: "Create a doctor ticket",
            hours: "Response within 12-24 hours",
          },
          {
            icon: Headphones,
            title: "Email Support",
            description: "Detailed assistance from specialist team",
            contact: "support@healthpro.com",
            hours: "Response within 24 hours",
          },
        ]
      : [
          {
            icon: Phone,
            title: "Phone Support",
            description: "Call us directly",
            contact: "+1 (555) 123-4567",
            hours: "9 AM - 6 PM EST",
          },
          {
            icon: MessageSquare,
            title: "Live Chat",
            description: "Instant messaging",
            contact: "Chat with us now",
            hours: "Available during business hours",
          },
          {
            icon: Ticket,
            title: "Support Tickets",
            description: "Track your issues",
            contact: "Create a ticket",
            hours: "Response within 24 hours",
          },
          {
            icon: Headphones,
            title: "Email Support",
            description: "Detailed assistance",
            contact: "support@healthpro.com",
            hours: "Response within 24 hours",
          },
        ];

    setFaqCategories(defaultFaqCategories);
    setSupportChannels(defaultSupportChannels);
  };

  const filteredFAQs = faqCategories.map((category) => ({
    ...category,
    faqs: category.faqs.filter(
      (faq) =>
        faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  }));

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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {isDoctorUser ? "Support" : "Customer Care & Support"}
          </h1>
          <p className="text-blue-100 mt-2">
            {isDoctorUser
              ? "Doctor support for workflows, patients, and prescriptions"
              : "We're here to help with any questions"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-brand-blue" size={40} />
          </div>
        ) : (
          <>
            {/* Support Channels */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {isDoctorUser ? "Doctor Support Channels" : "Support Channels"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {supportChannels.map((channel, idx) => {
                  const Icon = channel.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl hover:border-brand-blue transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-brand-gradient rounded-lg">
                          <Icon className="text-white" size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900">{channel.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{channel.description}</p>
                      <p className="font-semibold text-brand-blue text-sm mb-1">{channel.contact}</p>
                      <p className="text-xs text-gray-500">{channel.hours}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Search & FAQ */}
            <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isDoctorUser ? "Doctor Help & Documentation" : "Help & Documentation"}
          </h2>

          {/* Search */}
          <div className="mb-8 relative">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={isDoctorUser ? "Search doctor FAQs..." : "Search FAQs..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
            />
          </div>

          {/* FAQ Categories */}
          <div className="space-y-6">
            {filteredFAQs.map((category, catIdx) => (
              <div key={catIdx} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <h3 className="font-bold text-lg text-gray-900">{category.title}</h3>
                </div>

                <div className="divide-y divide-gray-100">
                  {category.faqs.length > 0 ? (
                    category.faqs.map((faq, faqIdx) => {
                      const faqId = `${catIdx}-${faqIdx}`;
                      return (
                        <button
                          key={faqIdx}
                          onClick={() =>
                            setExpandedFAQ(expandedFAQ === faqId ? null : faqId)
                          }
                          className="w-full text-left px-6 py-4 hover:bg-gray-50 transition flex justify-between items-start gap-4"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{faq.q}</p>
                            {expandedFAQ === faqId && (
                              <p className="mt-2 text-gray-700 text-sm">{faq.a}</p>
                            )}
                          </div>
                          <ChevronDown
                            size={20}
                            className={`text-gray-400 shrink-0 transition ${
                              expandedFAQ === faqId ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-6 py-4 text-center text-gray-500">
                      No results found in {category.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {filteredFAQs.every((cat) => cat.faqs.length === 0) && (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">No FAQ found matching "{searchTerm}"</p>
              <p className="text-gray-500 mt-2">
                {isDoctorUser
                  ? "Try different clinical workflow keywords or contact doctor support"
                  : "Try searching with different keywords or contact support"}
              </p>
            </div>
          )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default CustomerCare;
