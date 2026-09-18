import React, { useState, useContext } from "react";
import axios from "axios";
import { EmailContext } from "../contexts/EmailContext";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../environment";

const AddAssignmentForm = ({ branch, refreshAssignments }) => {
  const navigate = useNavigate();
  const { email } = useContext(EmailContext);
  const [submitted, setSubmitted] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    email,
    branch: branch || "",
    assignmentNumber: "",
    subject: "",
    chapter: "",
    deadline: "",
    professorName: "",
    description: "",
  });

  const [files, setFiles] = useState([]); // Multiple files

  const handleChange = (e) => {
    setAssignmentData({ ...assignmentData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]); // Store multiple files
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!files.length) {
      alert("Please upload at least one file! 📁");
      return;
    }

    const formData = new FormData();
    Object.entries(assignmentData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    files.forEach((file) => {
      formData.append("attachments", file); // Match backend field name
    });

    try {
      await axios.post(`${API_BASE}/assignment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      refreshAssignments?.();
      alert("Assignment submitted successfully! ✅");
      setSubmitted(true);
      // Reset form
      setAssignmentData({
        email,
        branch,
        assignmentNumber: "",
        subject: "",
        chapter: "",
        deadline: "",
        professorName: "",
        description: "",
      });
      setFiles([]);
    } catch (error) {
      console.error("Error adding assignment:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="assignment-form">
      <h2 className="form-title">
  {submitted ? `Edit Assignment for ${branch}` : `Add New Assignment for ${branch}`}
</h2>
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

      <input type="text" name="branch" placeholder="Branch" value={assignmentData.branch} onChange={handleChange} required />
      <input type="number" name="assignmentNumber" placeholder="Assignment Number" value={assignmentData.assignmentNumber} onChange={handleChange} required />
      <input type="text" name="subject" placeholder="Subject" value={assignmentData.subject} onChange={handleChange} required />
      <input type="text" name="chapter" placeholder="Chapter" value={assignmentData.chapter} onChange={handleChange} required />
      <input type="datetime-local" name="deadline" value={assignmentData.deadline} onChange={handleChange} required />
      <input type="text" name="professorName" placeholder="Professor Name" value={assignmentData.professorName} onChange={handleChange} required />
      <textarea name="description" placeholder="Description" value={assignmentData.description} onChange={handleChange} required />

      {/* Multiple File Upload */}
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />

      {files.length > 0 && (
        <ul>
          {files.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      )}

<button type="submit">{submitted ? "Edit Assignment" : "Add Assignment"}</button>

    </form>
  );
};

export default AddAssignmentForm;
