import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./VideoMeet.css"; // Import CSS
import { API_BASE } from "../environment";
const VideoMeet = () => {
  const [isCreating, setIsCreating] = useState(true);
  const [otp, setOtp] = useState("");
  const [duration, setDuration] = useState(30);
  const [createdMeetingLink, setCreatedMeetingLink] = useState(""); // full URL
  const [joinLinkInput, setJoinLinkInput] = useState(""); // user input, can be full URL or path
  const [joinOtp, setJoinOtp] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const toggleMode = () => {
    setIsCreating(!isCreating);
    setMessage("");
    setOtp("");
    setJoinLinkInput("");
    setJoinOtp("");
    setCreatedMeetingLink("");
  };

  const createMeeting = async () => {
    if (!otp.trim()) {
      setMessage("❌ OTP is required to create a meeting.");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/meeting/create`, {
        otp,
        durationMinutes: duration,
      }, { withCredentials: true });

      // Assuming response.data.link is something like "/meet/uuid"
      const fullLink = window.location.origin + response.data.link;
      setCreatedMeetingLink(fullLink);
      setMessage("✅ Meeting created! Share the link and OTP.");
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Failed to create meeting");
    }
  };

  const verifyAndJoin = async () => {
    if (!joinLinkInput.trim() || !joinOtp.trim()) {
      setMessage("❌ Both meeting link and OTP are required.");
      return;
    }

    // Normalize joinLinkInput: extract path part if user pasted full URL
    let linkId;
    try {
      const url = new URL(joinLinkInput, window.location.origin);
      linkId = url.pathname; // e.g. "/meet/uuid"
    } catch {
      // if invalid URL, maybe user just typed path
      if (joinLinkInput.startsWith("/meet/")) {
        linkId = joinLinkInput;
      } else {
        setMessage("❌ Invalid meeting link format.");
        return;
      }
    }

    try {
      const response = await axios.post(`${API_BASE}/meeting/verify`, {
        linkId,
        otp: joinOtp,
      }, { withCredentials: true });

      if (response.data.success) {
        setMessage("✅ OTP verified! Redirecting...");
        navigate(linkId); // Navigate to meeting page
      } else {
        setMessage("❌ OTP verification failed");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Error verifying OTP");
    }
  };
 return (
    <div className="video-meet-container">
      <div style={{ textAlign: "center" }}>
        <button className="toggle-button" onClick={toggleMode}>
          {isCreating ? "Want to Join a Meeting?" : "Want to Create a Meeting?"}
        </button>
      </div>
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
      {isCreating ? (
        <>
          <h2>Create a Meeting</h2>
          <input
            type="text"
            placeholder="Enter OTP for meeting"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="input-field"
          />
          <input
            type="number"
            placeholder="Duration (minutes)"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="input-field"
            min={1}
          />
          <button className="action-button" onClick={createMeeting}>
            Create Meeting
          </button>

          {createdMeetingLink && (
            <div className="meeting-link-container">
              <p>
                <strong>Meeting Link:</strong>{" "}
                <a href={createdMeetingLink} target="_blank" rel="noopener noreferrer">
                  {createdMeetingLink}
                </a>
              </p>
              <button
                className="copy-button"
                onClick={() => {
                  navigator.clipboard.writeText(createdMeetingLink);
                  setMessage("✅ Link copied to clipboard!");
                }}
              >
                📋 Copy Link
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <h2>Join a Meeting</h2>
          <input
            type="text"
            placeholder="Enter full meeting link or path (e.g. /meet/xyz or https://...)"
            value={joinLinkInput}
            onChange={(e) => setJoinLinkInput(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Enter OTP"
            value={joinOtp}
            onChange={(e) => setJoinOtp(e.target.value)}
            className="input-field"
          />
          <button className="action-button" onClick={verifyAndJoin}>
            Join Meeting
          </button>
        </>
      )}

      {message && (
        <p className="message" style={{ color: message.startsWith("✅") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default VideoMeet;