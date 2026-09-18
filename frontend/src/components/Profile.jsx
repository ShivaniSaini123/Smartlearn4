import { useEffect, useState, useContext } from "react";
import { EmailContext } from "../contexts/EmailContext";
import { useNavigate, useParams } from "react-router-dom"; // ← import useParams
import "./Profile.css";
import { API_BASE } from "../environment";

export default function ProfilePage() {
  const { email: contextEmail } = useContext(EmailContext);
  const { email: paramEmail } = useParams(); // ← get email from URL
  const navigate = useNavigate();

  const finalEmail = decodeURIComponent(paramEmail || contextEmail);
  const isOwnProfile = finalEmail === contextEmail;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(`${API_BASE}/profile/${encodeURIComponent(finalEmail)}`, {
          credentials: "include",
          headers,
        });
        if (!response.ok) throw new Error("User not found");
        const data = await response.json();
        setUser(data);
        // SAVE PROFILE IN LOCAL STORAGE
        localStorage.setItem(
          "userProfile",
          JSON.stringify(data)
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (finalEmail) fetchUserProfile();
    else {
      setLoading(false);
      setError("Email not provided");
    }
  }, [finalEmail]);

  const handleEdit = () => {
    navigate("/details", { state: { email: user.email } });
  };

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div className="profile-container">
      <h2 className="profile-title">Profile</h2>
      <div className="profile-info">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Department:</strong> {user.department || "-"}</p>
        <p><strong>Year Of Study:</strong> {user.yearOfStudy || "-"}</p>
        <p><strong>Semester:</strong> {user.semester || "-"}</p>
        <p><strong>College:</strong> {user.college || "-"}</p>
        <p><strong>Phone:</strong> {user.phone || "-"}</p>

        {isOwnProfile && (
          <button className="edit-btn" onClick={handleEdit}>Edit</button>
        )}
      </div>
    </div>
  );
}
