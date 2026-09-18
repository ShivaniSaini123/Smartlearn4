import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Timetable.css";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../environment";

const Timetable = () => {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchTimetable = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Check if profile is stored in localStorage
        let storedProfile = null;
        try {
          const raw = localStorage.getItem("userProfile");
          if (raw) storedProfile = JSON.parse(raw);
        } catch (e) {
          storedProfile = null;
        }

        // 2. If profile is missing, try fetching it via user's email
        if (!storedProfile || !storedProfile.semester || !storedProfile.department) {
          const email =
            localStorage.getItem("email") ||
            (() => {
              try {
                return JSON.parse(localStorage.getItem("user") || "{}")?.email;
              } catch {
                return null;
              }
            })();

          if (email) {
            try {
              const profileRes = await axios.get(`${API_BASE}/profile/${encodeURIComponent(email)}`, {
                withCredentials: true,
                headers,
              });
              if (profileRes.data) {
                storedProfile = profileRes.data;
                localStorage.setItem("userProfile", JSON.stringify(storedProfile));
              }
            } catch (pErr) {
              console.warn("Could not fetch user profile automatically:", pErr.message);
            }
          }
        }

        if (!storedProfile || !storedProfile.semester || !storedProfile.department) {
          if (isMounted) setLoading(false);
          return;
        }

        // 3. Fetch timetable with semester & branch
        const semester = String(storedProfile.semester).trim();
        const branch = String(storedProfile.department).trim();

        const response = await axios.get(
          `${API_BASE}/getTt/${encodeURIComponent(semester)}/${encodeURIComponent(branch)}`,
          {
            withCredentials: true,
            headers,
          }
        );

        if (isMounted) {
          setTimetable(response.data);
        }
      } catch (error) {
        console.error("Error fetching timetable:", error.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTimetable();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p id="loading-text27">Loading...</p>;
  }

  if (!timetable) {
    return <p id="no-timetable-text27">Timetable not found.</p>;
  }

  return (
    <div className="timetable-container" id="timetable-container27">
      <h2 id="timetable-header27">Timetable</h2>

      {/* GO BACK BUTTON */}
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

      <div className="timetable-grid" id="timetable-grid27">
        {[
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ].map((day) => {
          const daySchedule = timetable[day];

          return (
            <div
              key={day}
              className="day-tile"
              id={`day-tile-${day}27`}
            >
              <h3 id={`day-header-${day}27`}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </h3>

              {daySchedule && daySchedule.length > 0 ? (
                daySchedule.map((subject, index) => (
                  <div
                    key={index}
                    className="class-info"
                    id={`class-info-${day}-${index}27`}
                  >
                    <h4 id={`subject-name-${day}-${index}27`}>
                      {subject.subjectName}
                    </h4>

                    <p id={`class-time-${day}-${index}27`}>
                      {subject.startTime} - {subject.endTime}
                    </p>

                    <p id={`class-location-${day}-${index}27`}>
                      {subject.location}
                    </p>
                  </div>
                ))
              ) : (
                <p id={`no-classes-${day}27`}>
                  No classes scheduled.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timetable;