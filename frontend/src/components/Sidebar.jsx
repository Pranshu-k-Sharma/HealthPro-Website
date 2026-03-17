import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, FileText, Pill, X } from "lucide-react";

const Sidebar = ({ open = false, onClose }) => {
  const role = localStorage.getItem("role");
  const linkBase =
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300";

  return (
    <>
      {/* Desktop: always visible. Mobile: drawer */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 min-h-screen bg-white lg:bg-white/90 backdrop-blur-lg shadow-card p-6 border-r border-brand-border transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png.png" alt="HealthPro logo" className="w-8 h-8 object-contain rounded-full shrink-0" />
            <div className="text-xl sm:text-2xl font-bold tracking-wide" style={{ fontFamily: "Poppins, sans-serif" }}>
              <span style={{ color: "#1E3A8A", fontWeight: 600 }}>Health</span>
              <span style={{ color: "#10B981", fontWeight: 700 }}>Pro</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-brand-alt text-brand-body"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 sm:gap-4">
          <NavLink
            to={role === "doctor" ? "/doctor" : "/dashboard"}
            onClick={onClose}
            className={({ isActive }) =>
              `${linkBase} ${isActive
                ? "bg-brand-alt text-brand-blue border border-brand-border"
                : "text-[#1F2937] hover:bg-[#E6F9F4] hover:text-brand-green"
              }`
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
          {role === "doctor" && (
            <NavLink
              to="/patients"
              onClick={onClose}
              className={({ isActive }) =>
                `${linkBase} ${isActive
                  ? "bg-brand-alt text-brand-blue border border-brand-border"
                  : "text-[#1F2937] hover:bg-[#E6F9F4] hover:text-brand-green"
                }`
              }
            >
              <Users size={18} />
              Patients
            </NavLink>
          )}
          <NavLink
            to="/appointments"
            onClick={onClose}
            className={({ isActive }) =>
              `${linkBase} ${isActive
                ? "bg-brand-alt text-brand-blue border border-brand-border"
                : "text-[#1F2937] hover:bg-[#E6F9F4] hover:text-brand-green"
              }`
            }
          >
            <Calendar size={18} />
            Appointments
          </NavLink>
          <NavLink
            to="/reports"
            onClick={onClose}
            className={({ isActive }) =>
              `${linkBase} ${isActive
                ? "bg-brand-alt text-brand-blue border border-brand-border"
                : "text-[#1F2937] hover:bg-[#E6F9F4] hover:text-brand-green"
              }`
            }
          >
            <FileText size={18} />
            Reports
          </NavLink>
          <NavLink
            to="/prescriptions"
            onClick={onClose}
            className={({ isActive }) =>
              `${linkBase} ${isActive
                ? "bg-brand-alt text-brand-blue border border-brand-border"
                : "text-[#1F2937] hover:bg-[#E6F9F4] hover:text-brand-green"
              }`
            }
          >
            <Pill size={18} />
            Prescriptions
          </NavLink>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
