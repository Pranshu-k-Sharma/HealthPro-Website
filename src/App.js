import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";

const getPageTitle = (pathname) => {
  if (pathname === "/") return "Home";
  if (pathname === "/about") return "About";
  if (pathname === "/contact") return "Contact";
  if (pathname === "/login") return "Login";
  if (pathname === "/register") return "Register";
  return "Home";
};

function RouteTitleManager() {
  const location = useLocation();

  useEffect(() => {
    document.title = `HealthPro | ${getPageTitle(location.pathname)}`;
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RouteTitleManager />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
