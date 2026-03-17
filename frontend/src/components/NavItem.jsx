import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * NavItem — a single navigation link used in the desktop Navbar.
 *
 * Props:
 *  - to       : route path
 *  - icon     : Lucide icon component
 *  - label    : link text
 *  - badge    : optional notification number
 *  - onClick  : optional click handler
 */
const NavItem = ({ to, icon: Icon, label, badge, onClick }) => {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className="group relative"
        >
            {({ isActive }) => (
                <>
                    <motion.div
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200 relative z-10
              ${isActive
                                ? "text-emerald-600 bg-emerald-50/80"
                                : "text-gray-600 hover:text-emerald-600 hover:bg-gray-50 bg-transparent"
                            }`}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {/* Active background pill */}
                        {isActive && (
                            <motion.span
                                layoutId="activeNavPill"
                                className="absolute inset-0 rounded-xl border border-emerald-500/20"
                                style={{
                                    boxShadow: "0 0 16px 2px rgba(16,185,129,0.05)",
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                            />
                        )}

                        {/* Icon */}
                        <span className={`relative z-10 transition-colors ${isActive ? "text-emerald-500" : "text-gray-400 group-hover:text-emerald-500"}`}>
                            {Icon && <Icon size={16} strokeWidth={1.8} />}
                        </span>

                        {/* Label + badge */}
                        <span className="relative z-10 whitespace-nowrap">{label}</span>
                        {badge > 0 && (
                            <span className="relative z-10 ml-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                                {badge > 99 ? "99+" : badge}
                            </span>
                        )}

                        {/* Animated underline on hover */}
                        <span className="absolute bottom-0.5 left-3 right-3 block h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-transform duration-300 group-hover:scale-x-100" />
                    </motion.div>
                </>
            )}
        </NavLink>
    );
};

export default NavItem;
