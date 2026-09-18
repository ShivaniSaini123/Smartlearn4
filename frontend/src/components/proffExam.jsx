import React, { useState } from 'react';
import axios from 'axios';
import './proffExam.css';
import { useNavigate } from "react-router-dom";
import { API_BASE as API } from "../environment";

const ProffExam = () => {
  const [activeTab, setActiveTab] = useState(null); // 'view' or 'add'
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [exams, setExams] = useState([{ subject: '', date: '', startTime: '', endTime: '' }]);
  const [timetable, setTimetable] = useState(null);

  // ── Edit state ──
  const [editingExamId, setEditingExamId] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', date: '', startTime: '', endTime: '' });
  const [editError, setEditError] = useState('');

  const navigate = useNavigate();

  const handleExamChange = (index, field, value) => {
    const newExams = [...exams];
    newExams[index][field] = value;
    setExams(newExams);
  };

  const addExamRow = () => {
    setExams([...exams, { subject: '', date: '', startTime: '', endTime: '' }]);
  };

  const removeExamRow = (index) => {
    if (exams.length === 1) return;
    setExams(exams.filter((_, i) => i !== index));
  };

  const handleAddTimetable = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/addTimetable`, {
        branch,
        semester: parseInt(semester),
        exams,
      });
      alert(response.data.message);
      setBranch('');
      setSemester('');
      setExams([{ subject: '', date: '', startTime: '', endTime: '' }]);
    } catch (error) {
      console.log(error.response?.data);
      alert(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Error adding timetable"
      );
    }
  };

  const handleGetTimetable = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`${API}/getTimetable`, {
        params: { branch, semester: parseInt(semester) },
      });
      setTimetable(response.data);
    } catch (error) {
      alert('No timetable found for this branch and semester.');
      setTimetable(null);
    }
  };

  // ── Edit handlers ──
  const startEdit = (exam) => {
    setEditingExamId(exam._id);
    setEditError('');
    setEditForm({
      subject: exam.subject,
      date: exam.date ? new Date(exam.date).toISOString().split('T')[0] : '',
      startTime: exam.startTime,
      endTime: exam.endTime,
    });
  };

  const cancelEdit = () => {
    setEditingExamId(null);
    setEditError('');
  };

  const saveEdit = async (examId) => {
    setEditError('');

    if (editForm.startTime >= editForm.endTime) {
      setEditError('Start time must be before end time.');
      return;
    }

    try {
      const res = await axios.put(
        `${API}/updateExam/${timetable.branch}/${timetable.semester}/${examId}`,
        editForm
      );
      setTimetable(res.data.timetable);
      setEditingExamId(null);
    } catch (error) {
      setEditError(
        error.response?.data?.message || 'Failed to update exam.'
      );
    }
  };

  const handleDeleteExam = async (examId, subject) => {
    if (!window.confirm(`Delete exam "${subject}"? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(
        `${API}/deleteExam/${timetable.branch}/${timetable.semester}/${examId}`
      );
      setTimetable(res.data.timetable);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete exam.');
    }
  };

  return (
    <div className="container">
      <h2 className="heading">Exam Timetable Management</h2>

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

      {!activeTab && (
        <div className="toggle-btns">
          <button className="toggle-btn" onClick={() => setActiveTab('view')}>
            See Timetable
          </button>
          <button className="toggle-btn" onClick={() => setActiveTab('add')}>
            Add Exam Schedule
          </button>
        </div>
      )}

      {activeTab && (
        <button className="back-btn" onClick={() => {
          setActiveTab(null);
          setBranch('');
          setSemester('');
          setExams([{ subject: '', date: '', startTime: '', endTime: '' }]);
          setTimetable(null);
          setEditingExamId(null);
        }}>
          ← Go Back
        </button>
      )}

      {activeTab === 'view' && (
        <form className="form-section">
          <div className="form-group">
            <label>Branch:</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">Select Branch</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EE">EE</option>
              <option value="ME">ME</option>
              <option value="CE">CE</option>
            </select>
          </div>

          <div className="form-group">
            <label>Semester:</label>
            <input
              type="number"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Enter semester number"
            />
          </div>

          <button className="fetch-btn" onClick={handleGetTimetable}>
            Fetch Timetable
          </button>
        </form>
      )}

      {activeTab === 'add' && (
        <form className="form-section" onSubmit={handleAddTimetable}>
          <div className="form-group">
            <label>Branch:</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">Select Branch</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EE">EE</option>
              <option value="ME">ME</option>
              <option value="CE">CE</option>
            </select>
          </div>

          <div className="form-group">
            <label>Semester:</label>
            <input
              type="number"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Enter semester number"
            />
          </div>

          <div>
            <h3 className="section-title">Exams</h3>
            {exams.map((exam, index) => (
              <div key={index} className="exam-card">
                <input
                  type="text"
                  placeholder="Subject"
                  value={exam.subject}
                  onChange={(e) => handleExamChange(index, 'subject', e.target.value)}
                />
                <input
                  type="date"
                  value={exam.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleExamChange(index, 'date', e.target.value)}
                />
                <div className="time-inputs">
                  <input
                    type="time"
                    value={exam.startTime}
                    onChange={(e) => handleExamChange(index, 'startTime', e.target.value)}
                  />
                  <input
                    type="time"
                    value={exam.endTime}
                    onChange={(e) => handleExamChange(index, 'endTime', e.target.value)}
                  />
                </div>
                {exams.length > 1 && (
                  <button
                    type="button"
                    className="remove-row-btn"
                    onClick={() => removeExamRow(index)}
                    title="Remove this exam row"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-btn" onClick={addExamRow}>
              Add Another Exam
            </button>
          </div>

          <button className="submit-btn" onClick={handleAddTimetable}>
            Submit Timetable
          </button>
        </form>
      )}

      {activeTab === 'view' && timetable && (
        <div className="timetable-display" style={{ marginTop: '1rem' }}>
          <h3 className="section-title">
            Timetable for {timetable.branch}, Semester {timetable.semester}
          </h3>
          <div className="exam-list">
            {timetable.exams.map((exam) => (
              <div key={exam._id} className="exam-item">
                {editingExamId === exam._id ? (
                  <div className="exam-edit-form">
                    <input
                      type="text"
                      value={editForm.subject}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      placeholder="Subject"
                    />
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    />
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      />
                      <input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      />
                    </div>
                    {editError && <p className="exam-edit-error">{editError}</p>}
                    <div className="exam-edit-actions">
                      <button type="button" className="save-edit-btn" onClick={() => saveEdit(exam._id)}>
                        💾 Save
                      </button>
                      <button type="button" className="cancel-edit-btn" onClick={cancelEdit}>
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p><strong>Subject:</strong> {exam.subject}</p>
                    <p><strong>Date:</strong> {new Date(exam.date).toLocaleDateString()}</p>
                    <p><strong>Start Time:</strong> {exam.startTime}</p>
                    <p><strong>End Time:</strong> {exam.endTime}</p>
                    <div className="exam-item-actions">
                      <button className="edit-exam-btn" onClick={() => startEdit(exam)}>
                        ✏ Edit
                      </button>
                      <button className="delete-exam-btn" onClick={() => handleDeleteExam(exam._id, exam.subject)}>
                        🗑 Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProffExam;