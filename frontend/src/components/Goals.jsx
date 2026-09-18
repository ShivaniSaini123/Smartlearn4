import React, { useState, useEffect, useCallback } from "react";
import "./Goals.css";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../environment";

const Goals = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "daily",
    priority: "medium",
    deadline: "",
    userId: "",
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [goals, setGoals] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [goalBeingEdited, setGoalBeingEdited] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    type: "daily",
    priority: "medium",
    deadline: "",
  });

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);

    const email = localStorage.getItem("email") || JSON.parse(localStorage.getItem("user") || "{}")?.email || "";
    setForm((prev) => ({ ...prev, userId: email }));
  }, []);

  const fetchGoals = useCallback(async (date) => {
    if (!form.userId || !date) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${API_BASE}/goals/${encodeURIComponent(form.userId)}?date=${encodeURIComponent(date)}`,
        {
          credentials: "include",
          headers,
        }
      );
      const result = await res.json();
      setGoals(result || []);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("❌ Failed to fetch goals.");
    } finally {
      setLoading(false);
    }
  }, [form.userId]);

  useEffect(() => {
    if (form.userId && selectedDate) {
      fetchGoals(selectedDate);
    }
  }, [form.userId, selectedDate, fetchGoals]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "deadline") setDeadlineError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const deadlineDate = new Date(form.deadline);
    if (isNaN(deadlineDate)) {
      setDeadlineError("Please enter a valid deadline.");
      return;
    }

    if (!form.userId) {
      alert("User ID missing.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ Goal added!");
        setForm((prev) => ({
          ...prev,
          title: "",
          description: "",
          deadline: "",
        }));
        fetchGoals(selectedDate);
      } else {
        alert("❌ Error: " + (result.message || result.error));
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("❌ Server error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/goals/${goalId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ Goal deleted!");
        fetchGoals(selectedDate);
      } else {
        alert("❌ Error: " + (result.message || result.error));
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Could not delete goal.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (goalId) => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/goals/${goalId}/toggle`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });

    const result = await res.json();

    if (res.ok) {
      setGoals((prev) =>
        prev.map((g) => (g._id === goalId ? result : g))
      );
    } else {
      alert("❌ Error: " + (result.message || result.error));
    }
  } catch (err) {
    console.error("Toggle error:", err);
    alert("❌ Could not update goal.");
  } finally {
    setLoading(false);
  }
};

  const handleEditClick = (goal) => {
    setGoalBeingEdited(goal._id);
    setEditForm({
      title: goal.title,
      description: goal.description,
      type: goal.type,
      priority: goal.priority,
      deadline: goal.deadline.split("T")[0],
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!goalBeingEdited) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/goals/${goalBeingEdited}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(editForm),
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ Goal updated!");
        setGoalBeingEdited(null);
        fetchGoals(selectedDate);
      } else {
        alert("❌ Error: " + (result.message || result.error));
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("❌ Failed to update goal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="goal-container">
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

      <h2>🎯 My Goals</h2>
      <button className="add-goal-btn" onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "➕ Set Goal"}
      </button>

      {showForm && (
        <form className="goal-form" onSubmit={handleSubmit}>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Goal Title"
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
          />
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            required
          />
          {deadlineError && <p className="error">{deadlineError}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Goal"}
          </button>
        </form>
      )}

      <div className="date-filter">
        <label htmlFor="goal-date">📅 Filter by Date:</label>
        <input
          type="date"
          id="goal-date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="goal-list">
        <h3>📌 Goals:</h3>
        {loading ? (
          <p>Loading goals...</p>
        ) : goals.length === 0 ? (
          <p>No goals for this date.</p>
        ) : (
          goals.map((goal) => (
            <div key={goal._id} className="goal-item">
              {goalBeingEdited === goal._id ? (
                <form className="edit-form" onSubmit={handleUpdate}>
                  <input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    required
                  />
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                  />
                  <select name="type" value={editForm.type} onChange={handleEditChange}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <select
                    name="priority"
                    value={editForm.priority}
                    onChange={handleEditChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    type="date"
                    name="deadline"
                    value={editForm.deadline}
                    onChange={handleEditChange}
                    required
                  />
                  <button type="submit">💾 Save</button>
                  <button type="button" onClick={() => setGoalBeingEdited(null)}>
                    ❌ Cancel
                  </button>
                </form>
              ) : (
               <>
  <h4 style={{ textDecoration: goal.completed ? "line-through" : "none" }}>
    {goal.title}
  </h4>
  <p>{goal.description}</p>
  <p>Type: {goal.type}</p>
  <p>Priority: {goal.priority}</p>
  <p>Deadline: {new Date(goal.deadline).toLocaleDateString()}</p>
  <button onClick={() => handleToggle(goal._id)} className="toggle-btn">
    {goal.completed ? "✅ Done" : "☐ Mark as Done"}
  </button>
  <button onClick={() => handleEditClick(goal)}>✏ Edit</button>
  <button onClick={() => handleDelete(goal._id)} className="delete-btn">
    🗑 Delete
  </button>
</>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Goals;
