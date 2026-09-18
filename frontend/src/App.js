import "./App.css";
import Details from './components/Details'; 
import { motion, AnimatePresence } from "framer-motion";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HeroPage from "./components/HeroPage";
import Login from "./components/Login";
import Register from "./components/Register";
import VerifyOtp from "./components/VerifyOtp";
import { useState } from "react";
import Dashboard from "./components/Dashboard";
import ProffDashBoard from "./components/ProffDash";
import "@fortawesome/fontawesome-free/css/all.min.css";
import ProffTimeTable from './components/ProffTT';
import Pomodoro from "./components/Pomodoro";
import Timetable from "./components/Timetable";
import ProffExam from './components/proffExam'
import Exam from './components/Exam'

import ProfilePage from "./components/Profile";
import VideoMeetComponent from "./components/VideoMeet";
import MeetingPage from "./components/MeetingPage";  
// import JoinRoom from "./components/JoinRoom";
// import VideoChat from "./components/VideoChat";
import Assignment from "./components/Assignment";
import ProffAddAssign from './components/ProffAddAssign';
import GoalForm from './components/Goals';

import AddSyllabus from "./components/AddSyllabus";
import StudyMaterials from "./components/StudyMaterials";
import AttendanceForm from "./components/AttendanceForm";
import ChatApp from "./components/ChatApp"; 
import { API_BASE } from "./environment";

const pageTransition = {
  initial: { opacity: 0, x: 200, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -200, scale: 0.95 },
  transition: { duration: 0.7, ease: "easeInOut" },
};

function App() {
  const [email, setEmail] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegistrationSuccess = (userEmail) => {
    console.log("Registered Email(in app.js):", userEmail);
    setEmail(userEmail);
    setIsRegistered(true);
  };

  const handleChallengeCreate = async (challengeData) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await fetch(`${API_BASE}/challenges/create`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(challengeData),
      });
    } catch (err) {
      console.error("Failed to create challenge:", err);
    }
  };

  return (
    <Router>
      <AnimatePresence>
        <Routes>
          <Route
            path="/"
            element={
              <motion.div {...pageTransition}>
                <HeroPage />
              </motion.div>
            }
          />
          <Route
            path="/login"
            element={
              <motion.div {...pageTransition}>
                <Login />
              </motion.div>
            }
          />
          <Route
            path="/register"
            element={
              <motion.div {...pageTransition}>
                <Register onSuccess={handleRegistrationSuccess} />
              </motion.div>
            }
          />
          <Route
            path="/verify-otp"
            element={
              <motion.div {...pageTransition}>
                <VerifyOtp email={email} />
              </motion.div>
            }
          />
        <Route
            path="/dashboard"
            element={
              <motion.div {...pageTransition}>
                <Dashboard email={email} />
              </motion.div>
            }
          />
          <Route
            path="/assignments"
            element={
                <Assignment />
            }
          />
          <Route
            path="/studymaterials"
            element={
              <motion.div {...pageTransition}>
                <StudyMaterials />
              </motion.div>
            }
          />
          <Route
            path="/details"
            element={
              <motion.div {...pageTransition}>
                <Details email={email} />
              </motion.div>
            }
          />
          <Route
            path="/timetable"
            element={
              <motion.div {...pageTransition}>
                <Timetable email={email} />
              </motion.div>
            }
          />
          {/* <Route
          path="/profile"
          element={<ProfilePage/>}
        /> */}
        <Route path="/profile/:email" element={<ProfilePage />} />
        
        <Route
          path="/chat"
          element={<ChatApp/>}
        />
       <Route path="/meet" element={<VideoMeetComponent />} />
<Route path="/meet/:linkId" element={<MeetingPage />} />

        {/* <Route path="/room" element={<JoinRoom />} />
        <Route path="/room/:roomId" element={<VideoChat />} /> */}
        
          <Route 
            path="/pomodoro" 
            element={<Pomodoro />} 
          />
           {/* <Route
            path="/timetable"
            element={
                <Timetable />
            }
          /> */}
          <Route
            path="classDashBoard"
            element={
              <motion.div {...pageTransition}>
                <ProffDashBoard />
              </motion.div>
            }
          />
          {/* <Route
            path="/timetable/:email"
            element={
              <motion.div {...pageTransition}>
                <Timetable />
              </motion.div>
            }
          /> */}
          <Route path="/AddSyllabus" element={<AddSyllabus />} />
          <Route path="/ProffTimeTable" element={<ProffTimeTable />} />
          <Route path="/proffaddassign" element={<ProffAddAssign />} />
          <Route path="/ProffExam" element={<ProffExam />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/attendance/:email" element={<AttendanceForm />} />
          <Route
            path="/goals"
            element={
              <motion.div {...pageTransition}>
                <GoalForm onAddGoal={async (goalData) => {
                  try {
                    const token = localStorage.getItem("token");
                    const res = await fetch(`${API_BASE}/goals`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      credentials: "include",
                      body: JSON.stringify({ ...goalData, userId: email }),
                    });
                    if (!res.ok) throw new Error("Failed to add goal");
                    const data = await res.json();
                    console.log("Goal added:", data);
                  } catch (err) {
                    console.error(err);
                  }
                }} />
              </motion.div>
            }
          />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;