import React, { useState, useContext  } from "react";
import { useNavigate } from "react-router-dom";

import "./ProffDash.css";
import { EmailContext } from "../contexts/EmailContext";
import { handleLogout } from "./Logout";
import { handleDeleteAccount } from "./DeleteAccountButton";
import { FaUserCircle } from "react-icons/fa";
import { API_BASE } from "../environment";

const ProffDashBoard = () => {
  const navigate = useNavigate();
   const { email, setEmail, setBranch } = useContext(EmailContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ branch: "", subject: "", semester: "" });
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const handleNavigation = (route) => navigate(route);
  const handleMarkAttendance = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMessage("");
    setOtp("");
    setFormData({ branch: "", subject: "", semester: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const generateOtp = async () => {
    const { branch, subject, semester } = formData;
    if (branch && subject && semester) {
      const newOtp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
      setOtp(newOtp.toString());
  
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const res = await fetch(`${API_BASE}/attendance`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ branch, subject, semester, otp: newOtp }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save OTP");

        console.log("OTP stored in DB:", data.message);
        setMessage("OTP generated and stored successfully.");
      } catch (err) {
        console.error("Error saving OTP:", err.message);
        setMessage("Error generating OTP. Please try again.");
      }
    } else {
      setMessage("Please fill all fields before generating OTP.");
    }
  };
  
  return (
    <div className="dashboard-container">
     {/* TOP NAVBAR */}
      <nav className="proff-navbar">
       <div 
  className="proff-title clickable-title"
  onClick={() => navigate("/")}
>
  SmartLearn
</div>


        <div className="proff-actions">

          {/* Prevent null email route error */}
          <button
            onClick={() => {
              if (!email) {
                alert("Email missing! Please log in again.");
                return;
              }
              navigate(`/profile/${encodeURIComponent(email)}`);

            }}
            className="profile-btn"
          >
            <FaUserCircle size={26} />
          </button>

          <button
            onClick={() => handleLogout(navigate, setEmail, setBranch)}
            className="logout-btn"
          >
            Logout
          </button>

          <button
            onClick={() => handleDeleteAccount(email, navigate, setEmail, setBranch)}
            className="delete-btn"
          >
            Delete Account
          </button>
        </div>
      </nav>

      {/* <h1 className="dashboard-title">Professor Dashboard</h1> */}

      <div className="dashboard-grid">
        <button onClick={() => handleNavigation("/proffaddassign")} className="dashboard-btn">
          <i className="fas fa-file-alt"></i> Add Assignments
        </button>
        <button onClick={() => handleNavigation("/ProffTimeTable")} className="dashboard-btn">
          <i className="fas fa-calendar"></i> Add Time Table
        </button>
        <button onClick={() => handleNavigation("/ProffExam")} className="dashboard-btn">
          <i className="fas fa-pencil-alt"></i> Add Exam Schedule
        </button>
        <button onClick={handleMarkAttendance} className="dashboard-btn">
          <i className="fas fa-user-check"></i> Mark Attendance
        </button>
        <button onClick={() => handleNavigation("/AddSyllabus")} className="dashboard-btn">
          <i className="fas fa-book"></i> Add Syllabus
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Mark Attendance</h2>
            <div className="modal-form">
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                className="modal-input"
                placeholder="Branch"
              />
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className="modal-input"
                placeholder="Subject"
              />
              <input
                type="text"
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                className="modal-input"
                placeholder="Semester"
              />
              <button onClick={generateOtp} className="modal-btn generate">Generate OTP</button>
              <button onClick={handleCloseModal} className="modal-btn close">Close</button>
            </div>
            {otp && <div className="otp-container"><h3>Your OTP: {otp}</h3></div>}
            {message && <div className="message-container"><p>{message}</p></div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProffDashBoard;
