import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Exam.css';
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../environment";

const motivationalQuotes = [
  "Believe you can and you're halfway there.",
  "The harder you work for something, the greater you’ll feel when you achieve it.",
  "Success is not how high you have climbed, but how you make a positive difference to the world.",
  "Don’t watch the clock; do what it does. Keep going.",
  "Dream big and dare to fail.",
];

const branches = ['CSE', 'ECE', 'ME', 'CE', 'EE']; // example branches
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

const ExamTimetable = () => {
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
 const navigate = useNavigate();
  const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    return motivationalQuotes[randomIndex];
  };

  const calculateTimeLeft = (examDate) => {
    const now = new Date();
    const timeDiff = new Date(examDate) - now;
    if (timeDiff <= 0) return null;

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDiff / 1000) % 60);

    return { days, hours, minutes, seconds };
  };

  useEffect(() => {
    if (!branch || !semester) return;

    let timerInterval = null;
    let isMounted = true;

    const fetchExamTimetable = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_BASE}/getTimetable`, {
          params: { branch, semester: parseInt(semester) },
          withCredentials: true,
          headers,
        });

        if (!isMounted) return;

        const examData = response.data.exams || [];
        setExams(examData);
        setQuote(getRandomQuote());
        setLoading(false);

        if (examData.length > 0) {
          const nextExamDate = examData
            .map((exam) => new Date(exam.date))
            .sort((a, b) => a - b)[0];
          setTimeLeft(calculateTimeLeft(nextExamDate));

          timerInterval = setInterval(() => {
            setTimeLeft(calculateTimeLeft(nextExamDate));
          }, 1000);
        }
      } catch (err) {
        if (!isMounted) return;
        setError('Error fetching exam timetable');
        setLoading(false);
      }
    };

    fetchExamTimetable();

    return () => {
      isMounted = false;
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [branch, semester]);

  return (
    <div className="exam-timetable-container">
      <h2>Select Your Branch and Semester</h2>
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
      <div className="form-section">
        <label>
          Branch:
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">-- Select Branch --</option>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <label>
          Semester:
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">-- Select Semester --</option>
            {semesters.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p>Loading timetable...</p>}
      {error && <p>{error}</p>}

      {branch && semester && !loading && exams.length === 0 && (
        <p>No exams found for this semester and branch.</p>
      )}

      {exams.length > 0 && (
        <>
          <h2>Exam Timetable for {branch} - Semester {semester}</h2>

          <div className="quote-section">
            <p className="motivational-quote">"{quote}"</p>
          </div>

          {timeLeft && (
            <div className="countdown-timer">
              <h3>Time Left for Nearest Exam:</h3>
              <div className="timer-boxes">
                <div className="time-box">
                  <p className="time-value">{timeLeft.days}</p>
                  <p className="time-label">Days</p>
                </div>
                <div className="time-box">
                  <p className="time-value">{timeLeft.hours}</p>
                  <p className="time-label">Hours</p>
                </div>
                <div className="time-box">
                  <p className="time-value">{timeLeft.minutes}</p>
                  <p className="time-label">Minutes</p>
                </div>
                <div className="time-box">
                  <p className="time-value">{timeLeft.seconds}</p>
                  <p className="time-label">Seconds</p>
                </div>
              </div>
            </div>
          )}

          <div className="exam-timetable-grid">
            {exams.map((exam, index) => (
              <div key={index} className="exam-tile">
                <h3>{exam.subject}</h3>
                <p>Date: {new Date(exam.date).toLocaleDateString()}</p>
                <p>Time: {exam.startTime} - {exam.endTime}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExamTimetable;
