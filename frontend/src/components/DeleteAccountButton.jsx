// src/components/DeleteAccountButton.jsx
import axios from "axios";
import { API_BASE } from "../environment";

export const handleDeleteAccount = async (email, navigate, setEmail, setBranch) => {
  if (!email) {
    alert("No email found. Please login.");
    return;
  }

  if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;

  try {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // send email in request body
    await axios.delete(`${API_BASE}/delete-account`, {
      data: { email },
      headers,
      withCredentials: true,
    });

    // clear context + localStorage
    if (setEmail) setEmail(null);
    if (setBranch) setBranch(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("user");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("email");
    localStorage.removeItem("role");

    alert("Account deleted. Please register again.");
    navigate("/register");
  } catch (err) {
    console.error("Delete Error:", err);
    const msg = err?.response?.data?.message || "Failed to delete account";
    alert(msg);
  }
};
