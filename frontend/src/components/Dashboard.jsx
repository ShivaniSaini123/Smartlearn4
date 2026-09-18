import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { EmailContext } from '../contexts/EmailContext';
import { FaUserCircle } from 'react-icons/fa';
import { handleLogout } from "./Logout";
import { handleDeleteAccount } from "./DeleteAccountButton";
import DashboardWidgets from './DashboardWidgets';
import './Dashboard.css';
import { API_BASE } from "../environment";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const Dashboard = () => {
  const [userdata, setUserdata] = useState({});
  const { email, setEmail, branch, setBranch } = useContext(EmailContext);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (email) getUser();
  }, [email]);

  const getUser = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/profile/${encodeURIComponent(email)}`,
        { withCredentials: true }
      );
      setUserdata(response.data);
    } catch (error) {
      console.log("Profile fetch error:", error?.response?.status, error?.response?.data);
    }
  };

  const navItems = [
    { label: "Attendance",      path: `/attendance/${encodeURIComponent(email)}` },
    { label: "Assignments",     path: "/assignments" },
    { label: "Timetable",       path: "/timetable" },
    { label: "Events and Exam", path: "/exam" },
    { label: "Pomodoro",        path: "/pomodoro" },
    { label: "Set Goals",       path: "/goals" },
    { label: "Virtual Room",    path: "/meet" },
    { label: "Chat Room",       path: "/chat" },
    { label: "Study Materials", path: "/studymaterials" },
  ];

  const firstName = userdata?.name?.split(" ")[0] || "Student";

  return (
    <div className="sl-root">

      {/* ── Mobile overlay (click to close sidebar) ── */}
      {sidebarOpen && (
        <div className="sl-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sl-sidebar ${sidebarOpen ? "sl-sidebar-open" : ""}`}>
        <div className="sl-brand">
          <span className="sl-brand-icon">🎓</span>
          <div>
            <div className="sl-brand-name">SmartLearn</div>
            <div className="sl-brand-sub">Student Portal</div>
          </div>
        </div>

        <div className="sl-user">
          <div className="sl-avatar">
            {userdata?.name ? userdata.name.slice(0,2).toUpperCase() : "ST"}
          </div>
          <div>
            <div className="sl-username">{userdata?.name || "Student"}</div>
            <div className="sl-userrole">
              {userdata?.branch || branch || "—"} · Sem {userdata?.semester || "—"}
            </div>
          </div>
        </div>

        <nav className="sl-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`sl-nav-item ${activeNav === item.label ? "active" : ""}`}
              onClick={() => { setActiveNav(item.label); navigate(item.path); setSidebarOpen(false); }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sl-sidebar-footer">
          <button
            className="sl-logout-btn"
            onClick={() => handleLogout(navigate, setEmail, setBranch)}
          >
            ⏻ Logout
          </button>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="sl-topbar">
        <div className="sl-topbar-left">
          <button
            className="sl-hamburger-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={sidebarOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <div className="sl-topbar-title">
              Good {getGreeting()}, {firstName} 👋
            </div>
            <div className="sl-topbar-sub">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric",
                month: "long", year: "numeric"
              })}
              {userdata?.semester ? ` · Semester ${userdata.semester}` : ""}
            </div>
          </div>
        </div>

        <div className="sl-topbar-right">
          <button
            className="sl-delete-btn"
            onClick={() => handleDeleteAccount(email, navigate, setEmail, setBranch)}
          >
            Delete Account
          </button>
          <button
            className="sl-profile-btn"
            onClick={() => navigate(`/profile/${encodeURIComponent(email)}`)}
            aria-label="Go to profile"
          >
            <FaUserCircle size={20} />
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="sl-main">
        <DashboardWidgets userdata={userdata} email={email} />
      </main>

    </div>
  );
};

export default Dashboard;