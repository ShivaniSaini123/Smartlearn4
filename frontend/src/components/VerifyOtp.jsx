import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import './VerifyOtp.css';
import { useLocation } from "react-router-dom";
import { API_BASE } from "../environment";
const VerifyOtp = () => {
  const location = useLocation();
  const email = location.state?.email || localStorage.getItem("userEmail") || "";
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [error, setError] = useState("");
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  const handleChange = (element, index) => {
    const value = element.value.replace(/\D/, ""); // Allow only digits
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Focus next input
    if (element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputsRef.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/details");
      } else {
        setError(data.message || "Verification failed, please try again");
      }
    } catch {
      setError("An error occurred. Please try again later.");
    }
  };

  return (
    <div id="verify-container">
      <div id="verify-box">
        <h2 id="title">Verify Your Email</h2>
        <p className="text-gray-300 mb-4">Please Enter The Verification Code We Sent To <br /><b>{email}</b></p>

        {error && <p id="error-message">{error}</p>}

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="otp-inputs">
            {otp.map((digit, i) => (
              <input
                key={i}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                ref={(el) => (inputsRef.current[i] = el)}
                className="otp-box"
              />
            ))}
          </div>
          <button type="submit" id="verify-button">Confirm</button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp;
