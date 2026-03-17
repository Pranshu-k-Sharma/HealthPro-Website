import React from "react";
import { Link, useLocation } from "react-router-dom";

const getPageLabel = (pathname) => {
  if (pathname === "/") return "Home";
  if (pathname === "/about") return "About";
  if (pathname === "/contact") return "Contact";
  if (pathname === "/login") return "Login";
  if (pathname === "/register") return "Register";
  return "Home";
};

function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <img
            src="/favicon.ico"
            alt="HealthCare logo"
            width="28"
            height="28"
            className="me-2 rounded-circle align-text-bottom"
          />
          <span>HealthPro</span>
          <span className="ms-2 opacity-75">| {getPageLabel(location.pathname)}</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navMenu"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navMenu">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about">About</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/contact">Contact</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/login">Login</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link btn btn-light text-primary ms-2 px-3" to="/register">
                Register
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
