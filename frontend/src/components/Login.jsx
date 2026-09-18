import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { EmailContext } from "../contexts/EmailContext";
import './Login.css'; // Import styles for the Login component
import { API_BASE } from "../environment";

const Login = () => {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { setEmail: setEmails } = useContext(EmailContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // Redirect to OTP verification if required
      if (response.status === 403 && data.redirectTo === "/verify-otp") {
        navigate("/verify-otp", { state: { email: data.email } });
      } else if (response.ok) {
        // Successful login
        const user = data.user;

        setEmails(email);
        localStorage.setItem("email", email);
        localStorage.setItem("userEmail", email);
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        localStorage.setItem("user", JSON.stringify({
          id: user._id || user.id,
          email: user.email,
          role: user.role,
          college: user.college,
          department: user.department,
          phone: user.phone,
          yearOfStudy: user.yearOfStudy,
        }));

        const role = user.role || "Student";
        localStorage.setItem("role", role);

        // Redirect based on role
        const targetRoute = role === "Professor" ? "/classDashBoard" : "/dashboard";
        navigate(targetRoute);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div id="login1-container">
      <div id="login1-card">
        <h2 id="login1-title">Login</h2>

        {error && <p id="error-message1">{error}</p>}

        <form onSubmit={handleLogin} id="login1-form">
          <div className="form1-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form1-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter Your Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" id="login1-button">
            Log In
          </button>
        </form>

        <p id="login1-footer">
          Don't have an account?{" "}
          <a href="/register" id="register-link">
            Register
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
