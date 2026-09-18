const express = require('express');
// const multer = require('multer');
// const path = require('path');
const upload = require("../middleware/cloudinaryUpload");
const router = express.Router();
const { authMiddleware, requireRole } = require("../middleware/auth");
const Meeting = require("../models/Meeting");

// Controllers
const registerUser = require('../Controllers/registerUser');
const loginUser = require('../Controllers/loginUser');
const verifyOtp = require('../Controllers/verifyOtp');
const submitUserDetails = require("../Controllers/SubmitUserDetails");
const getuserProfile = require("../Controllers/userProfile");
const updateUserProfile = require('../Controllers/updateUserProfile');
const { markAttendance, saveOtp, viewAttendance } = require("../Controllers/attendance");
const {addTimetable,getTimetable,updateExam,deleteExam}=require('../Controllers/exam.js');
const { createOrUpdateTimetable, updateDaySchedule, getTt } = require('../Controllers/timetable.js');
const { getAllAssignments } = require('../Controllers/getAllAssignments');
const { addSubmission } = require('../Controllers/addSubmission');
const { submitAssignment } = require('../Controllers/submitAssignment');
const { addAssignmentProff } = require('../Controllers/addAssignmentProff');
const { addSyllabus } = require('../Controllers/addSyllabus');
const syllabusController = require('../Controllers/syllabusController');
const goalController = require('../Controllers/Goals');
const { createMeeting, verifyMeeting } = require('../Controllers/meetingController');
const msgController = require("../Controllers/messageController");
const {
  getUserByEmail,
  getContacts,
  getConnectionRequests,
  sendConnectionRequest,
  acceptConnectionRequest,rejectConnectionRequest, deleteContact
} = require('../Controllers/getUserByEmail');
const logoutUser = require("../Controllers/logoutUser");
const deleteAccount = require("../Controllers/deleteAccount");
const aiController = require("../Controllers/aiController");
const streakController = require('../Controllers/streakController');
const achievementController = require('../Controllers/achievementController');
const challengeController = require('../Controllers/challengeController');
const healthScoreController = require('../Controllers/healthScoreController');
 

//---------------------------- AUTH ROUTES ----------------------------//
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/welcome', submitUserDetails);

//---------------------------- PROFILE ROUTES ----------------------------//
router.get('/profile/:email', authMiddleware, getuserProfile);
router.put('/updateprofile/:email', authMiddleware, updateUserProfile);

//---------------------------- ATTENDANCE ROUTES ----------------------------//
router.post('/attendance', authMiddleware, requireRole("Professor", "admin"), saveOtp);
router.post('/mark', authMiddleware, markAttendance);
router.post('/view-attendance', authMiddleware, viewAttendance);
router.post('/attendance/view', authMiddleware, viewAttendance);

//---------------------------- TIMETABLE & EXAM ROUTES ----------------------------//
router.post('/createOrUpdateTimetable', authMiddleware, requireRole("Professor", "admin"), createOrUpdateTimetable);
router.put('/updateDaySchedule/:semester/:branch/:day', authMiddleware, requireRole("Professor", "admin"), updateDaySchedule);
router.post('/addTimetable', authMiddleware, requireRole("Professor", "admin"), addTimetable);
router.get('/getTimetable', authMiddleware, getTimetable);
router.get('/getTt/:semester/:branch', authMiddleware, getTt);
router.put('/updateExam/:branch/:semester/:examId', authMiddleware, requireRole("Professor", "admin"), updateExam);
router.delete('/deleteExam/:branch/:semester/:examId', authMiddleware, requireRole("Professor", "admin"), deleteExam);

//---------------------------- SYLLABUS ROUTES ----------------------------//
router.post('/syllabus', authMiddleware, requireRole("Professor", "admin"), addSyllabus);
router.use('/api', authMiddleware, syllabusController);


//---------------------------- ASSIGNMENTS ROUTES ----------------------------//
router.get('/assignments', authMiddleware, getAllAssignments);
router.post('/assignment', authMiddleware, addSubmission);
router.post('/submit', authMiddleware, submitAssignment);
router.post(
  '/addAssignmentProff',
  authMiddleware,
  requireRole("Professor", "admin"),
  upload.array('attachments', 5),
  addAssignmentProff
);
//---------------------------- GOALS ROUTES ----------------------------//
router.post('/goals', authMiddleware, goalController.createGoal);
router.get('/goals/:userId', authMiddleware, goalController.getGoalsByUser);
router.put('/goals/:id', authMiddleware, goalController.updateGoal);
router.delete('/goals/:id', authMiddleware, goalController.deleteGoal);
router.patch('/goals/:id/toggle', authMiddleware, goalController.toggleGoal);

//---------------------------- MEETING ROUTES ----------------------------//
router.post('/meeting/create', authMiddleware, createMeeting);
router.post('/meeting/verify', authMiddleware, verifyMeeting);
router.get("/meeting/:linkId", authMiddleware, async (req, res) => {
  const { linkId } = req.params;
  try {
    const meeting = await Meeting.findOne({ linkId });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//---------------------------- CONNECTION & CONTACT ROUTES ----------------------------//
router.get('/users/:email/contacts', authMiddleware, getContacts);
router.get('/users/:email/connection-requests', authMiddleware, getConnectionRequests);
router.post('/users/:email/connection-requests', authMiddleware, sendConnectionRequest);
router.post("/users/:email/connection-requests/:requesterEmail/accept", authMiddleware, acceptConnectionRequest);
router.delete("/users/:email/connection-requests/:requesterEmail/reject", authMiddleware, rejectConnectionRequest);
router.delete("/users/:email/contacts/:contactEmail", authMiddleware, deleteContact);
router.get('/users/search', authMiddleware, getUserByEmail);

//---------------------------- CHAT & MESSAGES ROUTES ----------------------------//
router.get("/messages/:user1/:user2", authMiddleware, msgController.getMessagesBetweenUsers);
router.delete("/messages/delete/:messageId", authMiddleware, msgController.deleteMessageController);
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { sender, recipient, content, type, timestamp, recipientOnline } = req.body;
    const msgData = {
      from: sender.trim().toLowerCase(),
      to: recipient.trim().toLowerCase(),
      content, type, timestamp,
    };
    await msgController.saveMessage(msgData, recipientOnline);
    if (recipientOnline) await msgController.markMessagesDelivered(recipient, sender);
    res.status(200).json({ success: true, message: "Message saved" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});
router.post(
  "/send-file",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        sender,
        recipient,
        type,
        timestamp,
        recipientOnline,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const msgData = {
        from: sender.trim().toLowerCase(),
        to: recipient.trim().toLowerCase(),

        // Cloudinary URL
        content: req.file.path,

        type: type || "file",
        timestamp: timestamp || new Date(),
      };

      const savedMessage = await msgController.saveMessage(
        msgData,
        recipientOnline,
        req.app.get("io")
      );

      if (recipientOnline) {
        await msgController.markMessagesDelivered(recipient, sender);
      }

      res.status(200).json({
        success: true,
        message: "File sent successfully",
        data: savedMessage,
      });

    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to send file",
      });
    }
  }
);
router.post("/mark-delivered", authMiddleware, async (req, res) => {
  const { user1, user2 } = req.body;
  await msgController.markMessagesDelivered(user1, user2);
  res.status(200).json({ success: true });
});
router.post("/messages/mark-read", authMiddleware, async (req, res) => {
  const { user1, user2 } = req.body;
  await msgController.markMessagesRead(user1, user2);
  res.status(200).json({ success: true });
});
router.get("/unread-senders/:userId", authMiddleware, async (req, res) => {
  const data = await msgController.getUnreadCountsPerSender(req.params.userId);
  res.status(200).json({ unreadCounts: data });
});

// ------------------ LOGOUT & DELETE ------------------ //
router.post("/logout", logoutUser);
router.delete("/delete-account", authMiddleware, deleteAccount);

//---------------------------- AI ROUTES ----------------------------//
router.post(
  "/ai/chat",
  authMiddleware,
  aiController.chat
);

// ---------------------------- STUDY STREAK ROUTES ---------------------------- //
router.get('/streak/:userId', authMiddleware, streakController.getStreak);
router.post('/streak/:userId/ping', authMiddleware, streakController.pingActivity);
 
// ---------------------------- ACHIEVEMENTS ROUTES ---------------------------- //
router.get('/achievements/:userId', authMiddleware, achievementController.getAchievements);
 
// ---------------------------- DAILY CHALLENGE ROUTES ---------------------------- //
router.get('/challenge/today', authMiddleware, challengeController.getTodayChallenge);
router.post('/challenge/:userId/attempt', authMiddleware, challengeController.submitAttempt);
router.get('/challenge/:userId/attempt-today', authMiddleware, challengeController.getTodayAttempt);
 
// ---------------------------- ACADEMIC HEALTH SCORE ROUTE ---------------------------- //
router.get('/health-score/:userId', authMiddleware, healthScoreController.getHealthScore);

module.exports = router;
