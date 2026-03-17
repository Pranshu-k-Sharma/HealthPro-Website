import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!email || !password) {
    setMessage("Please fill all fields");
    return;
  }

  setMessage("Logging in...");

  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Login failed");
      return;
    }

    setMessage("Login successful ✅");
    console.log("Server response:", data);

  } catch (error) {
    setMessage("Server not reachable");
  }
};


  return (
    <div className="container mt-5 pt-5">
      <h2 className="text-center mb-4">Login</h2>

      <form className="col-md-5 mx-auto" onSubmit={handleSubmit}>
        <input
          type="email"
          className="form-control mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="form-control mb-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="btn btn-primary w-100">
          Login
        </button>

        {message && (
          <p className="text-center mt-3">{message}</p>
        )}
      </form>
    </div>
  );
}

export default Login;
