import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Dashboard.css";
import AIChatTutor from "./Aichattutor";
import { API_BASE as API } from "../environment";

const POMO_TOTAL = 25 * 60;
const circumference = 2 * Math.PI * 36;

export default function DashboardWidgets({ userdata, email }) {
  const userId = email || JSON.parse(localStorage.getItem("user") || "{}")?.email;
  console.log("userdata received:", userdata);
  // ── Attendance (kept for health score calc, not shown as a card) ──
  const [attendanceMap, setAttendanceMap] = useState({});

  // ── Exams ──
  const [exams, setExams] = useState([]);
  const [nextExam, setNextExam] = useState(null);
  const [daysToExam, setDaysToExam] = useState(null);

  // ── Goals ──
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(false);

  // ── Assignments ──
  const [assignments, setAssignments] = useState([]);

  // ── CGPA ──
  const [semesters, setSemesters] = useState([
    { id: 1, name: "Semester 1", gpa: 7.8, credits: 24 },
    { id: 2, name: "Semester 2", gpa: 8.0, credits: 24 },
    { id: 3, name: "Semester 3", gpa: 8.1, credits: 26 },
    { id: 4, name: "Semester 4", gpa: 7.9, credits: 26 },
  ]);
  const [cgpaOpen, setCgpaOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editSem, setEditSem] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newSem, setNewSem] = useState({ name: "", gpa: "", credits: "" });

  // ── Pomodoro ──
  const [pomoSec, setPomoSec] = useState(POMO_TOTAL);
  const [pomoRunning, setPomoRunning] = useState(false);
  const pomoRef = useRef(null);

  // ── Study Streak (real backend) ──
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });

  // ── Daily Challenge (real backend) ──
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [challengeResult, setChallengeResult] = useState(null);

  // ── Achievements (real backend) ──
  const [badges, setBadges] = useState([]);

  // ── AI Assistant is handled entirely inside <AIChatTutor /> now ──

  // ── Fetch Attendance (used only for health score) ──
  useEffect(() => {
    if (!userdata?.branch || !userdata?.semester || !email) return;
    const subjects = userdata?.subjects || [];
    if (!subjects.length) return;
    Promise.all(
      subjects.map((subject) =>
        axios
          .post(`${API}/attendance/view`, { email, branch: userdata.branch, semester: userdata.semester, subject })
          .then((r) => ({ subject, pct: parseFloat(r.data.attendancePercentage) }))
          .catch(() => ({ subject, pct: null }))
      )
    ).then((results) => {
      const map = {};
      results.forEach(({ subject, pct }) => { map[subject] = pct; });
      setAttendanceMap(map);
    });
  }, [userdata, email]);

  // ── Fetch Exams ──
  useEffect(() => {
    if (!userdata?.department || !userdata?.semester) return;
    axios
      .get(`${API}/getTimetable`, { params: { branch: userdata.department, semester: userdata.semester } })
      .then((r) => {
        const sorted = (r.data?.exams || [])
          .map((e) => ({ ...e, dateObj: new Date(e.date) }))
          .filter((e) => e.dateObj >= new Date())
          .sort((a, b) => a.dateObj - b.dateObj);
        setExams(sorted);
        if (sorted.length) {
          const next = sorted[0];
          setNextExam(next);
          setDaysToExam(Math.ceil((next.dateObj - new Date()) / (1000 * 60 * 60 * 24)));
        }
      })
      .catch(() => {});
  }, [userdata]);

  // ── Fetch Goals ──
  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    setGoalsLoading(true);
    fetch(`${API}/goals/${userId}?date=${today}`)
      .then((r) => r.json())
      .then((data) => setGoals(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setGoalsLoading(false));
  }, [userId]);

  // ── Fetch Assignments ──
  useEffect(() => {
    axios.get(`${API}/assignments`)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.assignments || [];
        const withDays = list.map((a) => {
          const due = a.dueDate ? new Date(a.dueDate) : null;
          const daysLeft = due ? Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24)) : null;
          return { ...a, daysLeft };
        }).filter((a) => a.daysLeft === null || a.daysLeft >= 0)
          .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
        setAssignments(withDays);
      })
      .catch(() => setAssignments([]));
  }, []);

  // ── Study Streak: ping on load + fetch ──
useEffect(() => {
  if (!userId) return;
  axios.get(`${API}/streak/${userId}`)
    .then((r) => setStreak(r.data))
    .catch(() => {});
}, [userId]);

// ── Daily Challenge: fetch today's question + prior attempt ──
  useEffect(() => {
    setChallengeLoading(true);
    axios.get(`${API}/challenge/today`)
      .then((r) => setChallenge(r.data))
      .catch(() => setChallenge(null))
      .finally(() => setChallengeLoading(false));

    if (userId) {
      axios.get(`${API}/challenge/${userId}/attempt-today`)
        .then((r) => {
          if (r.data) {
            setChallengeResult({
              isCorrect: r.data.isCorrect,
              correctAnswer: r.data.correctAnswer,
              explanation: r.data.explanation,
            });
            setSelectedOption(r.data.selectedAnswer);
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  // ── Achievements ──
  useEffect(() => {
    if (!userId) return;
    axios.get(`${API}/achievements/${userId}`)
      .then((r) => setBadges(r.data || []))
      .catch(() => setBadges([]));
  }, [userId, streak.currentStreak]);

  // ── Pomodoro ──
  useEffect(() => {
    if (pomoRunning) {
      pomoRef.current = setInterval(() => {
        setPomoSec((s) => {
          if (s <= 1) { clearInterval(pomoRef.current); setPomoRunning(false); return 0; }
          return s - 1;
        });
      }, 1000);
    } else clearInterval(pomoRef.current);
    return () => clearInterval(pomoRef.current);
  }, [pomoRunning]);

  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── CGPA helpers ──
  const calcCGPA = () => {
    if (!semesters.length) return "—";
    let tw = 0, tg = 0;
    semesters.forEach((s) => { tg += s.gpa * s.credits; tw += s.credits; });
    return tw ? (tg / tw).toFixed(2) : "—";
  };
  const cgpa = calcCGPA();
  const lastTwo = semesters.slice(-2);
  const cgpaTrend = lastTwo.length === 2 ? (lastTwo[1].gpa - lastTwo[0].gpa).toFixed(2) : null;

  const saveEdit = () => {
    const gpa = parseFloat(editSem.gpa);
    const credits = parseInt(editSem.credits);
    if (!editSem.name || isNaN(gpa) || gpa < 0 || gpa > 10 || isNaN(credits)) return;
    setSemesters((ss) => ss.map((s) => s.id === editId ? { ...s, ...editSem, gpa, credits } : s));
    setEditId(null);
  };
  const saveNew = () => {
    const gpa = parseFloat(newSem.gpa);
    const credits = parseInt(newSem.credits);
    if (!newSem.name || isNaN(gpa) || gpa < 0 || gpa > 10 || isNaN(credits)) return;
    setSemesters((ss) => [...ss, { id: Date.now(), name: newSem.name, gpa, credits }]);
    setNewSem({ name: "", gpa: "", credits: "" });
    setAddingNew(false);
  };

  // ── Derived stats ──
  const doneCnt = goals.filter((g) => g.completed).length;
  const goalPct = goals.length ? Math.round((doneCnt / goals.length) * 100) : 0;
  const pomoProgress = ((POMO_TOTAL - pomoSec) / POMO_TOTAL) * 100;
  const priorityColor = { high: "#FF6450", medium: "#FACE7A", low: "#1DC675" };

  // ── Academic Health Score (live formula, no extra DB write) ──
  const avgAttendance = (() => {
    const vals = Object.values(attendanceMap).filter((v) => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();

  const healthScore = (() => {
    const cgpaScore = parseFloat(cgpa) ? Math.min(100, (parseFloat(cgpa) / 10) * 100) : 0;
    const goalScore = goals.length ? (doneCnt / goals.length) * 100 : 50;
    const assignScore = assignments.length
      ? ((assignments.length - assignments.filter(a => a.daysLeft !== null && a.daysLeft <= 1).length) / assignments.length) * 100
      : 80;
    return Math.round(cgpaScore * 0.4 + goalScore * 0.3 + assignScore * 0.3);
  })();
  const healthLabel = healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Good" : healthScore >= 55 ? "Fair" : "Needs Work";
  const healthColor = healthScore >= 85 ? "#1DC675" : healthScore >= 70 ? "#FACE7A" : "#FF6450";

  // ── Focused suggestion ──
  const pendingGoals = goals.filter(g => !g.completed).length;
  const suggestedSubject = nextExam?.subject || assignments[0]?.subject || "your weakest subject";

  const toggleGoal = async (goal) => {
    try {
      const res = await axios.patch(`${API}/goals/${goal._id}/toggle`);
      setGoals((gs) => gs.map((g) => g._id === goal._id ? res.data : g));
    } catch (err) {
      console.error("Toggle goal error:", err);
    }
  };

const submitChallengeAnswer = async (option) => {
  if (challengeResult || !userId) return;
  setSelectedOption(option);
  try {
    const res = await axios.post(`${API}/challenge/${userId}/attempt`, { selectedAnswer: option });
    setChallengeResult(res.data);
    if (res.data.streak) setStreak(res.data.streak);
  } catch (err) {
    console.error("Challenge submit error:", err);
  }
};

  return (
    <div className="sl-widgets">

      {/* ── Welcome + Focus ── */}
      <div className="sl-welcome-row">
        <div className="sl-welcome-card">
          <div className="sl-welcome-hi">Welcome back, {userdata?.name?.split(" ")[0] || "Student"} 👋</div>
          <div className="sl-welcome-sub">Ready to crush your goals today?</div>
          <div className="sl-welcome-stats">
            <span className="sl-ws">📋 {pendingGoals} pending goals</span>
            {nextExam && <span className="sl-ws">📌 {daysToExam}d to {nextExam.subject}</span>}
            {avgAttendance && <span className="sl-ws">✓ {avgAttendance.toFixed(0)}% attendance</span>}
          </div>
        </div>

        <div className="sl-quote-card sl-focus-card">
          <div className="sl-quote-label">🌤 Focus Recommendation</div>
          <div className="sl-focus-lines">
            <div className="sl-focus-line">
              <span className="sl-focus-dot" style={{ background: "#FF6450" }} />
              {pendingGoals} pending goal{pendingGoals !== 1 ? "s" : ""}
            </div>
            {nextExam && (
              <div className="sl-focus-line">
                <span className="sl-focus-dot" style={{ background: "#FACE7A" }} />
                Exam in {daysToExam} day{daysToExam !== 1 ? "s" : ""}
              </div>
            )}
            <div className="sl-focus-line">
              <span className="sl-focus-dot" style={{ background: "#00ffff" }} />
              {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} pending
            </div>
          </div>
          <div className="sl-focus-suggest">
            Suggested focus: <strong style={{ color: "#00ffff" }}>{suggestedSubject}</strong>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="sl-stat-row sl-stat-row-3">
        <div className="sl-stat-card">
          <div className="sl-stat-icon" style={{ background: "rgba(29,198,117,0.15)", color: "#1DC675" }}>🎯</div>
          <div className="sl-stat-val">{goalsLoading ? "…" : `${doneCnt}/${goals.length}`}</div>
          <div className="sl-stat-lbl">Today's Goals</div>
          <div className={`sl-stat-trend ${goals.length && doneCnt === goals.length ? "up" : "down"}`}>
            {goals.length === 0 ? "No goals set" : doneCnt === goals.length ? "All done!" : `${goals.length - doneCnt} remaining`}
          </div>
        </div>

        <div className="sl-stat-card cgpa-stat" onClick={() => setCgpaOpen(true)}>
          <div className="sl-stat-icon" style={{ background: "rgba(250,206,122,0.15)", color: "#FACE7A" }}>★</div>
          <div className="sl-stat-val">{cgpa}</div>
          <div className="sl-stat-lbl">CGPA</div>
          {cgpaTrend !== null && (
            <div className={`sl-stat-trend ${parseFloat(cgpaTrend) >= 0 ? "up" : "down"}`}>
              {parseFloat(cgpaTrend) >= 0 ? "↑" : "↓"} {Math.abs(cgpaTrend)} last sem
            </div>
          )}
          <div className="sl-cgpa-hint">click to update →</div>
        </div>

        <div className="sl-stat-card">
          <div className="sl-stat-icon" style={{ background: "rgba(255,100,80,0.15)", color: "#FF6450" }}>📌</div>
          <div className="sl-stat-val">{daysToExam !== null ? daysToExam : "—"}</div>
          <div className="sl-stat-lbl">Days to Exam</div>
          <div className="sl-stat-trend" style={{ color: "#888" }}>
            {nextExam ? `${nextExam.subject} · ${nextExam.dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "No exams scheduled"}
          </div>
        </div>
      </div>

      {/* ── Row: Academic Health + Study Streak ── */}
      <div className="sl-mid-grid sl-grid-2">
        <div className="sl-card">
          <div className="sl-card-head">
            <span className="sl-card-title">📊 Academic Health</span>
          </div>
          <div className="sl-health-wrap">
            <div className="sl-health-score" style={{ color: healthColor }}>
              {healthScore}<span style={{ fontSize: 14, color: "#888" }}>/100</span>
            </div>
            <div className="sl-health-label" style={{ color: healthColor }}>{healthLabel}</div>
            <div className="sl-subj-bar-bg" style={{ marginTop: 12 }}>
              <div className="sl-subj-bar-fill" style={{ width: `${healthScore}%`, background: healthColor, transition: "width 1s ease" }} />
            </div>
            <div className="sl-health-breakdown">
              <div className="sl-hb-row"><span>CGPA</span><span style={{ color: "#FACE7A" }}>{cgpa}</span></div>
              <div className="sl-hb-row"><span>Goals today</span><span style={{ color: "#1DC675" }}>{doneCnt}/{goals.length}</span></div>
              <div className="sl-hb-row"><span>Assignments pending</span><span style={{ color: "#FF6450" }}>{assignments.length}</span></div>
            </div>
          </div>
        </div>

        <div className="sl-card">
          <div className="sl-card-head">
            <span className="sl-card-title">🔥 Study Streak</span>
          </div>
          <div className="sl-streak-wrap">
            <div className="sl-streak-flame">🔥</div>
            <div className="sl-streak-num">{streak.currentStreak}</div>
            <div className="sl-streak-lbl">day streak</div>
            <div className="sl-streak-days">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="sl-streak-day"
                  style={{
                    background: i < (streak.currentStreak % 7 || (streak.currentStreak >= 7 ? 7 : 0))
                      ? "linear-gradient(135deg,#00ffff,#ff00ff)"
                      : "rgba(255,255,255,0.06)",
                    boxShadow: i < streak.currentStreak % 7 ? "0 0 6px rgba(0,255,255,0.4)" : "none",
                  }}
                  title={`Day ${i + 1}`}
                />
              ))}
            </div>
            <div className="sl-streak-best">
              🏆 Longest: <strong style={{ color: "#FACE7A" }}>{streak.longestStreak} days</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row: Today's Schedule + Pending Assignments + Upcoming Exams ── */}
      <div className="sl-mid-grid sl-grid-3">
        <div className="sl-card">
          <div className="sl-card-head">
            <span className="sl-card-title">📅 Upcoming Exams</span>
          </div>
          {exams.length === 0 ? (
            <p style={{ color: "#555", fontSize: 13 }}>No upcoming exams.</p>
          ) : (
            exams.slice(0, 4).map((exam, i) => (
              <div key={i} className="sl-exam-item">
                <div className="sl-exam-bar" style={{ background: i === 0 ? "#FF6450" : i === 1 ? "#FACE7A" : "#1DC675" }} />
                <div>
                  <div className="sl-exam-subject">{exam.subject}</div>
                  <div className="sl-exam-date">
                    {exam.dateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    {i === 0 && daysToExam !== null && <span className="sl-exam-badge">{daysToExam}d</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sl-card">
          <div className="sl-card-head">
            <span className="sl-card-title">📚 Assignments</span>
            <span className="sl-card-sub">{assignments.length} pending</span>
          </div>
          <div className="sl-assign-list">
            {assignments.length === 0 ? (
              <p style={{ color: "#555", fontSize: 13 }}>Nothing pending — nice work!</p>
            ) : (
              assignments.slice(0, 4).map((a, i) => (
                <div key={a._id || i} className="sl-assign-item">
                  <div className="sl-assign-left">
                    <div className="sl-assign-title">{a.title}</div>
                    <div className="sl-assign-sub">{a.subject}</div>
                  </div>
                  <div className="sl-assign-due" style={{ color: a.daysLeft <= 1 ? "#FF6450" : a.daysLeft <= 3 ? "#FACE7A" : "#1DC675" }}>
                    {a.daysLeft === 0 ? "Today!" : a.daysLeft === 1 ? "Tomorrow" : a.daysLeft ? `${a.daysLeft}d left` : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sl-card">
          <div className="sl-card-head">
            <span className="sl-card-title">🎯 Today's Goals</span>
            <span className="sl-card-sub">{doneCnt}/{goals.length} done</span>
          </div>
          <div className="sl-goal-bar-wrap">
            <div className="sl-goal-bar-bg">
              <div className="sl-goal-bar-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <span className="sl-goal-pct">{goalPct}%</span>
          </div>
          <div className="sl-goals-list">
            {goalsLoading ? (
              <p style={{ color: "#555", fontSize: 13 }}>Loading goals…</p>
            ) : goals.length === 0 ? (
              <p style={{ color: "#555", fontSize: 13 }}>No goals for today.</p>
            ) : (
              goals.slice(0, 4).map((g) => (
                <div key={g._id} className="sl-goal-item" onClick={() => toggleGoal(g)} style={{ cursor: "pointer" }}>
                  <div className={`sl-goal-check ${g.completed ? "done" : ""}`}>{g.completed && "✓"}</div>
                  <span className={`sl-goal-text ${g.completed ? "done" : ""}`}>{g.title}</span>
                  <span className="sl-goal-type">{g.type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Row: Pomodoro + Daily Challenge ── */}
      <div className="sl-mid-grid sl-grid-2">
        <div className="sl-card">
          <div className="sl-card-head">
            <span className="sl-card-title">⏱ Pomodoro</span>
            <span className="sl-card-sub">{pomoRunning ? "Focus Mode" : "Ready"}</span>
          </div>
          <div className="sl-pomo-wrap">
            <svg width="110" height="110" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="36" fill="none" stroke="#2a2a3a" strokeWidth="8" />
              <circle
                cx="45" cy="45" r="36" fill="none"
                stroke={pomoRunning ? "#FACE7A" : "#333"}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (pomoProgress / 100) * circumference}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s linear" }}
              />
              <text x="45" y="49" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">
                {fmtTime(pomoSec)}
              </text>
            </svg>
            <div className="sl-pomo-btns">
              <button className="sl-pomo-btn primary" onClick={() => setPomoRunning((r) => !r)}>
                {pomoRunning ? "⏸ Pause" : "▶ Start"}
              </button>
              <button className="sl-pomo-btn" onClick={() => { setPomoRunning(false); setPomoSec(POMO_TOTAL); }}>
                ↺ Reset
              </button>
            </div>
            <div className="sl-pomo-sessions">25 min focus · 5 min break</div>
          </div>
        </div>

        <div className="sl-card">
          <div className="sl-card-head">
            <span className="sl-card-title">🧠 Daily Challenge</span>
            {challenge && (
              <span className="sl-card-sub" style={{
                background: "rgba(0,255,255,0.08)", color: "#00ffff",
                border: "1px solid rgba(0,255,255,0.2)", borderRadius: 20,
                padding: "2px 10px", fontSize: 10
              }}>{challenge.category}</span>
            )}
          </div>
          {challengeLoading ? (
            <p style={{ color: "#555", fontSize: 13 }}>Loading question…</p>
          ) : !challenge ? (
            <p style={{ color: "#555", fontSize: 13 }}>No challenge available today.</p>
          ) : (
            <>
              <div className="sl-challenge-q">{challenge.question}</div>
              <div className="sl-challenge-opts">
                {challenge.options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  let bg = "rgba(255,255,255,0.04)";
                  let border = "rgba(255,255,255,0.1)";
                  if (challengeResult) {
                    if (opt === challengeResult.correctAnswer) { bg = "rgba(29,198,117,0.15)"; border = "#1DC675"; }
                    else if (isSelected) { bg = "rgba(255,100,80,0.15)"; border = "#FF6450"; }
                  } else if (isSelected) {
                    bg = "rgba(0,255,255,0.1)"; border = "#00ffff";
                  }
                  return (
                    <button
                      key={opt}
                      className="sl-challenge-opt"
                      style={{ background: bg, borderColor: border }}
                      onClick={() => submitChallengeAnswer(opt)}
                      disabled={!!challengeResult}
                    >
                      <span className="sl-opt-letter">{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {challengeResult && (
                <div className="sl-challenge-exp">
                  <strong style={{ color: challengeResult.isCorrect ? "#1DC675" : "#FF6450" }}>
                    {challengeResult.isCorrect ? "Correct! " : "Not quite. "}
                  </strong>
                  {challengeResult.explanation}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Achievement Badges ── */}
      <div className="sl-card">
        <div className="sl-card-head">
          <span className="sl-card-title">🏆 Achievements</span>
          <span className="sl-card-sub">{badges.length} earned</span>
        </div>
        {badges.length === 0 ? (
          <p style={{ color: "#555", fontSize: 13 }}>Keep going — your first badge is close!</p>
        ) : (
          <div className="sl-badges-grid">
            {badges.map((b) => (
              <div key={b._id} className="sl-badge earned">
                <div className="sl-badge-icon">{b.icon}</div>
                <div className="sl-badge-label">{b.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CGPA Modal ── */}
      {cgpaOpen && (
        <div className="sl-modal-overlay" onClick={() => { setCgpaOpen(false); setEditId(null); setAddingNew(false); }}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-modal-head">
              <span className="sl-modal-title">★ CGPA Tracker</span>
              <div className="sl-modal-cgpa">{cgpa}</div>
              <button className="sl-modal-close" onClick={() => { setCgpaOpen(false); setEditId(null); setAddingNew(false); }}>✕</button>
            </div>
            <table className="sl-cgpa-table">
              <thead><tr><th>Semester</th><th>GPA</th><th>Credits</th><th></th></tr></thead>
              <tbody>
                {semesters.map((s) =>
                  editId === s.id ? (
                    <tr key={s.id} className="sl-edit-row">
                      <td><input value={editSem.name} onChange={(e) => setEditSem({ ...editSem, name: e.target.value })} /></td>
                      <td><input type="number" value={editSem.gpa} min="0" max="10" step="0.01" onChange={(e) => setEditSem({ ...editSem, gpa: e.target.value })} style={{ width: 70 }} /></td>
                      <td><input type="number" value={editSem.credits} min="1" max="40" onChange={(e) => setEditSem({ ...editSem, credits: e.target.value })} style={{ width: 70 }} /></td>
                      <td>
                        <button className="sl-save-btn" onClick={saveEdit}>Save</button>
                        <button className="sl-cancel-btn" onClick={() => setEditId(null)}>✕</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td><span className={`sl-gpa-pill ${s.gpa >= 8 ? "high" : s.gpa >= 7 ? "mid" : "low"}`}>{s.gpa.toFixed(2)}</span></td>
                      <td style={{ color: "#888" }}>{s.credits} cr</td>
                      <td>
                        <button className="sl-icon-action" onClick={() => { setEditId(s.id); setEditSem({ name: s.name, gpa: s.gpa, credits: s.credits }); }}>✏</button>
                        <button className="sl-icon-action del" onClick={() => setSemesters((ss) => ss.filter((x) => x.id !== s.id))}>🗑</button>
                      </td>
                    </tr>
                  )
                )}
                {addingNew && (
                  <tr className="sl-edit-row">
                    <td><input placeholder="Semester 5" value={newSem.name} onChange={(e) => setNewSem({ ...newSem, name: e.target.value })} /></td>
                    <td><input type="number" placeholder="GPA" value={newSem.gpa} min="0" max="10" step="0.01" onChange={(e) => setNewSem({ ...newSem, gpa: e.target.value })} style={{ width: 70 }} /></td>
                    <td><input type="number" placeholder="Credits" value={newSem.credits} min="1" onChange={(e) => setNewSem({ ...newSem, credits: e.target.value })} style={{ width: 70 }} /></td>
                    <td>
                      <button className="sl-save-btn" onClick={saveNew}>Add</button>
                      <button className="sl-cancel-btn" onClick={() => setAddingNew(false)}>✕</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button className="sl-add-sem-btn" onClick={() => { setAddingNew(true); setEditId(null); }}>+ Add Semester</button>
          </div>
        </div>
      )}

      {/* ── Floating AI Study Assistant (Gemini-backed) ── */}
      <AIChatTutor />
    </div>
  );
}