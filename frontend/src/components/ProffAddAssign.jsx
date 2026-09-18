import React, { useState } from 'react';
import axios from 'axios';
import "./proffAddAssi.css";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../environment";

const AddAssignment = () => {

  const navigate = useNavigate();

  const [assignmentData, setAssignmentData] = useState({
    assignmentNumber: '',
    subject: '',
    chapter: '',
    deadline: '',
    professorName: '',
    description: '',
    branch: '',
    semester: '',
  });

  const [file, setFile] = useState(null);

  const branches = ['CSE', 'ECE', 'Mechanical', 'Civil', 'IT'];
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Handle input changes
  const handleChange = (e) => {

    setAssignmentData({
      ...assignmentData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle file selection
  const handleFileChange = (e) => {

    setFile(e.target.files[0]);
  };

  // Handle form submit
  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      // Generate email automatically
      const generatedEmail =
        `${assignmentData.branch}${assignmentData.semester}@gmail.com`.trim();

      // Create FormData
      const formData = new FormData();

      // Append assignment fields
      Object.entries(assignmentData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Append generated email
      formData.append('email', generatedEmail);

      // Append file
      if (file) {
        formData.append('attachments', file);
      }

      // Debugging
      console.log("Submitting FormData...");

      const response = await axios.post(
        `${API_BASE}/addAssignmentProff`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
        }
      );

      console.log(response.data);

      alert(response.data.message);

      // Reset form after success
      setAssignmentData({
        assignmentNumber: '',
        subject: '',
        chapter: '',
        deadline: '',
        professorName: '',
        description: '',
        branch: '',
        semester: '',
      });

      setFile(null);

    } catch (error) {

      console.error('Error submitting:', error);

      console.log(error.response?.data);

      alert(
        error.response?.data?.error ||
        'Error: Could not add assignment'
      );
    }
  };

  return (

    <div className="assignment-page">

      <div className="assignment-container">

        <h2>Add Assignment</h2>

        {/* Go Back Button */}
        <button
          type="button"
          className="go-back-btn"
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "15px",
            padding: "8px 16px",
            background: "linear-gradient(120deg, #a078d4, #7e5dbf)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ← Go Back
        </button>

        <form
          className="assignment-form"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >

          {/* Branch */}
          <label>Branch</label>

          <select
            name="branch"
            value={assignmentData.branch}
            onChange={handleChange}
            required
          >
            <option value="">Select Branch</option>

            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Semester */}
          <label>Semester</label>

          <select
            name="semester"
            value={assignmentData.semester}
            onChange={handleChange}
            required
          >
            <option value="">Select Semester</option>

            {semesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Assignment Number */}
          <input
            type="text"
            name="assignmentNumber"
            placeholder="Assignment Number"
            value={assignmentData.assignmentNumber}
            onChange={handleChange}
            required
          />

          {/* Subject */}
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={assignmentData.subject}
            onChange={handleChange}
            required
          />

          {/* Chapter */}
          <input
            type="text"
            name="chapter"
            placeholder="Chapter"
            value={assignmentData.chapter}
            onChange={handleChange}
            required
          />

          {/* Deadline */}
          <input
            type="datetime-local"
            name="deadline"
            value={assignmentData.deadline}
            onChange={handleChange}
            required
          />

          {/* Professor Name */}
          <input
            type="text"
            name="professorName"
            placeholder="Professor Name"
            value={assignmentData.professorName}
            onChange={handleChange}
            required
          />

          {/* Description */}
          <textarea
            name="description"
            placeholder="Assignment Description"
            value={assignmentData.description}
            onChange={handleChange}
            required
          />

          {/* File Upload */}
          <div className="file-wrapper">

            <label className="file-label">
              Upload Assignment File
            </label>

            <input
              type="file"
              name="attachments"
              onChange={handleFileChange}
              required
            />
          </div>

          {/* Submit Button */}
          <button type="submit">
            Add Assignment
          </button>

        </form>

      </div>

    </div>
  );
};

export default AddAssignment;