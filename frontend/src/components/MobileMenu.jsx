import React from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut } from "lucide-react";

/**
 * MobileMenu — fullscreen slide-in drawer for mobile navigation.
 *
 * Props:
 *  - isOpen       : boolean
 *  - onClose      : function to close the menu
 *  - navLinks     : array of { to, icon, label, badge }
 *  - user         : user object { name, email, role, profilePicture }
 *  - onLogout     : function
 *  - darkMode     : boolean
 *  - onToggleDark : function
 *  - notifCount   : number
 */
const MobileMenu = ({
    isOpen,
    onClose,
    navLinks = [],
    user,
    onLogout,
    darkMode,
    onToggleDark,
    notifCount = 0,
}) => {
    const initials = (name) =>
        name
            ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
            : "U";

    const containerVariants = {
        hidden: { x: "-100%", opacity: 0 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 300, damping: 35, staggerChildren: 0.07 },
        },
        exit: { x: "-100%", opacity: 0, transition: { duration: 0.25, ease: "easeInOut" } },
    };

    const itemVariants = {
        hidden: { x: -24, opacity: 0 },
        visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 24 } },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer */}
                    <motion.aside
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col overflow-hidden bg-white"
                        style={{
                            borderRight: "1px solid rgba(0,0,0,0.05)",
                            boxShadow: "8px 0 40px rgba(0,0,0,0.1)",
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                            {/* Logo */}
                            <div className="flex items-center gap-2.5">
                                <img src="/images/logo.png.png" alt="HealthPro logo" className="w-8 h-8 object-contain rounded-full shrink-0" />
                                <span
                                    className="text-xl font-bold tracking-wide"
                                    style={{ fontFamily: 'Poppins, sans-serif' }}
                                >
                                    <span style={{ color: '#1E3A8A', fontWeight: 600 }}>Health</span><span style={{ color: '#10B981', fontWeight: 700 }}>Pro</span>
                                </span>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-gray-100 transition-colors"
                                aria-label="Close menu"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* User card */}
                        <motion.div
                            variants={itemVariants}
                            className="mx-4 mt-4 mb-2 rounded-xl p-4 flex items-center gap-3 bg-gray-50 border border-gray-100"
                        >
                            <div
                                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden bg-brand-gradient"
                            >
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    initials(user?.name)
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                    {user
                                        ? user.role === "doctor" && !/^dr\.?/i.test(user.name)
                                            ? `Dr. ${user.name}`
                                            : user.name
                                        : "Guest"}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user?.email || "Not signed in"}</p>
                            </div>
                        </motion.div>

                        {/* Nav links */}
                        <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                            {navLinks.map(({ to, icon: Icon, label, badge }) => (
                                <motion.div key={to} variants={itemVariants}>
                                    <NavLink
                                        to={to}
                                        onClick={onClose}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                      ${isActive
                                                ? "text-emerald-700 bg-emerald-50 border border-emerald-100/50"
                                                : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50"
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <span className={`transition-colors ${isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-emerald-500"}`}>
                                                    {Icon && <Icon size={18} strokeWidth={1.8} />}
                                                </span>
                                                <span>{label}</span>
                                                {badge > 0 && (
                                                    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                                                        {badge > 99 ? "99+" : badge}
                                                    </span>
                                                )}
                                                {isActive && (
                                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                </motion.div>
                            ))}
                        </nav>

                        {/* Footer: logout */}
                        <div className="px-4 py-4 border-t border-gray-100 space-y-2">
                            {/* Logout */}
                            <motion.button
                                variants={itemVariants}
                                onClick={() => { onLogout(); onClose(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all duration-200"
                                aria-label="Logout"
                            >
                                <LogOut size={18} strokeWidth={1.8} />
                                Logout
                            </motion.button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileMenu;
