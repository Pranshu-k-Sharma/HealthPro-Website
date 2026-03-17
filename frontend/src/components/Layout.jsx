import React from "react";
import Navbar from "./Navbar";

/**
 * Layout — wraps authenticated pages.
 * Desktop: Navbar across the top with all nav links.
 * Mobile:  Navbar hamburger opens the MobileMenu slide-in drawer.
 * Sidebar has been removed — the Navbar is the single source of navigation.
 */
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-soft-highlight flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
};

export default Layout;
