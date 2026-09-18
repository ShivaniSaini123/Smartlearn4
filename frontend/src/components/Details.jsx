import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Details.css";
import { API_BASE } from "../environment";

const Details = ({ email: propEmail }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const editMode = location.state?.editMode || false;

  const email =
    propEmail ||
    location.state?.email ||
    localStorage.getItem("userEmail") ||
    "";
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    yearOfStudy: "",
    semester: "",
    department: "",
    college: "",
    phone: "",
    role: "",
    identifier: "",
  });

  useEffect(() => {
    if (editMode && email) {
      // Fetch profile data if in edit mode
      const fetchProfile = async () => {
        try {
          const token = localStorage.getItem("token");
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(email)}`, {
            credentials: "include",
            headers,
          });
          if (!res.ok) throw new Error("Failed to fetch profile");
          const data = await res.json();
          setFormData({
            name: data.name || "",
            password: "", // leave empty for security
            yearOfStudy: data.yearOfStudy || "",
            semester: data.semester || "",
            department: data.department || "",
            college: data.college || "",
            phone: data.phone || "",
            role: data.role || "",
            identifier: data.identifier || "",
          });
        } catch (err) {
          console.error("Failed to load profile:", err);
          alert("Failed to load profile data.");
        }
      };
      fetchProfile();
    }
  }, [editMode, email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      email,
      ...(formData.role === "Student" && { yearOfStudy: formData.yearOfStudy || "1" }),
    };

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(
        `${API_BASE}/${editMode ? `updateprofile/${encodeURIComponent(email)}` : "welcome"}`,
        {
          method: editMode ? "PUT" : "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        alert(editMode ? "Profile updated!" : "User created!");
        navigate("/login");
      } else {
        const errorData = await response.json();
        alert("Error: " + (errorData.message || "Something went wrong"));
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("An error occurred: " + error.message);
    }
  };

  return (
    <div className="container">
      <div className="formCard">
        <h2 className="details-heading">
          {editMode ? "Update Your Details" : "Enter Your Details"}
        </h2>
        <form onSubmit={handleSubmit} className="details-form">
          {/* Name input (not editable in editMode?) */}
          {!editMode && (
            <div className="formGroup">
              <label className="label">Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input"
              />
            </div>
          )}

          <div className="formGroup">
            <label className="label">Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!editMode}
              className="input"
            />
          </div>

          <div className="formGroup">
            <label className="label">Role:</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="select"
            >
              <option value="">Select Role</option>
              <option value="Student">Student</option>
              <option value="Professor">Professor</option>
            </select>
          </div>

          {formData.role === "Student" && (
            <div className="formGroup">
              <label className="label">Year of Study:</label>
              <select
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                required
                className="select"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          <div className="formGroup">
            <label className="label">Semester:</label>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              required
              className="select"
            >
              <option value="">Select Semester</option>
              {[...Array(8)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label className="label">Department:</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <div className="formGroup">
            <label className="label">College:</label>
            <input
              type="text"
              name="college"
              value={formData.college}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <div className="formGroup">
            <label className="label">Phone:</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              pattern="^\d{10}$"
              required
              className="input"
            />
          </div>

          <div className="formGroup">
            <label className="label">
              {formData.role === "Student"
                ? "Student Roll Number"
                : "Professional Identity Number"}
            </label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <button type="submit" className="button">
            {editMode ? "Update" : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Details;
