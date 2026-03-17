import { useNavigate, useLocation } from "react-router-dom";

const getPageLabel = (pathname) => {
  if (pathname === "/") return "Home";
  if (pathname === "/about") return "About";
  if (pathname === "/contact") return "Contact";
  if (pathname === "/login") return "Login";
  if (pathname === "/register") return "Register";
  return "Home";
};

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        <div className="flex items-center gap-2 text-xl font-semibold text-blue-600">
          <img
            src="/favicon.ico"
            alt="HealthCare logo"
            className="w-8 h-8 object-contain rounded-full"
          />
          <span>HealthPro</span>
          <span className="text-base font-normal text-gray-500">| {getPageLabel(location.pathname)}</span>
        </div>

        <div className="flex items-center gap-4">
          {role && (
            <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600">
              {role.toUpperCase()}
            </span>
          )}

          {role && (
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
