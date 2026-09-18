const AttendanceRecord = require("../models/AttendanceRecord");
const Attendance = require("../models/Attendance");

// View Attendance
const viewAttendance = async (req, res) => {
  const { email, branch, semester, subject } = req.body;

  try {
    const attendanceRecord = await AttendanceRecord.findOne({
      email,
      branch,
      semester,
      "subjects.subject": subject, // Match subject inside the array
    });

    if (!attendanceRecord) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    const subjectRecord = attendanceRecord.subjects.find(
      (subj) => subj.subject === subject
    );

    if (!subjectRecord) {
      return res.status(404).json({ error: "Subject not found in attendance record" });
    }

    const totalAttended = subjectRecord.attended;
    const totalMissed = subjectRecord.missed;

    if (totalAttended + totalMissed === 0) {
      return res.status(400).json({ error: "No attendance data available for this subject." });
    }

    const attendancePercentage = (totalAttended / (totalAttended + totalMissed)) * 100;

    res.json({ subject, attendancePercentage: attendancePercentage.toFixed(2) });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Server error" });
  }
};
const saveOtp = async (req, res) => {
  try {
    const { branch, semester, subject, otp, durationMinutes } = req.body;
    if (!branch || !semester || !subject || !otp) {
      return res.status(400).json({ error: "Branch, semester, subject, and OTP are required." });
    }

    const duration = Number(durationMinutes) || 10; // Default 10 minutes
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    let attendance = await Attendance.findOne({ branch, semester });

    if (!attendance) {
      attendance = new Attendance({
        branch,
        semester,
        subjects: new Map([[subject, otp]]),
      });
    } else {
      attendance.subjects.set(subject, otp);
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: `OTP saved successfully. Valid for ${duration} minutes.`,
      expiresAt,
    });
  } catch (error) {
    console.error("Error saving OTP:", error.message);
    res.status(500).json({ error: "Server error saving OTP." });
  }
};

// Mark Attendance
const markAttendance = async (req, res) => {
  const email = (req.user?.email || req.body.email || "").trim().toLowerCase();
  const { branch, semester, subject, otp } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required." });
  if (!branch || !semester || !subject || !otp) {
    return res.status(400).json({ error: "All fields (branch, semester, subject, OTP) are required." });
  }

  try {
    const attendance = await Attendance.findOne({ branch, semester });
    if (!attendance || !attendance.subjects.has(subject)) {
      return res.status(400).json({ error: "No active attendance session for this subject." });
    }

    const storedOtp = attendance.subjects.get(subject);
    if (!storedOtp || storedOtp.toString().trim() !== otp.toString().trim()) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    const now = new Date();

    // Find or create student's attendance record
    let record = await AttendanceRecord.findOne({ email, branch, semester });

    if (!record) {
      record = new AttendanceRecord({
        email,
        branch,
        semester,
        subjects: [{ subject, attended: 1, missed: 0, lastMarked: now }],
      });
    } else {
      const existingSubject = record.subjects.find((sub) => sub.subject.toLowerCase() === subject.toLowerCase());

      if (existingSubject) {
        const lastMarked = new Date(existingSubject.lastMarked || 0);
        const diffSeconds = (now - lastMarked) / 1000;
        if (diffSeconds < 60) {
          return res.status(400).json({ error: "Attendance already marked for this class session." });
        }
        existingSubject.attended += 1;
        existingSubject.lastMarked = now;
      } else {
        record.subjects.push({ subject, attended: 1, missed: 0, lastMarked: now });
      }
    }

    await record.save();

    res.status(200).json({ success: true, message: "Attendance marked successfully." });
  } catch (err) {
    console.error("Error marking attendance:", err.message);
    res.status(500).json({ error: "Server error marking attendance." });
  }
};


module.exports = {
  markAttendance,
  saveOtp,
  viewAttendance,
};
