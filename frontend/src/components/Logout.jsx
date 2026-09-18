import axios from "axios";
import { API_BASE } from "../environment";

export const handleLogout = async (navigate, setEmail, setBranch) => {
  try {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    await axios.post(
      `${API_BASE}/logout`,
      {},
      {
        withCredentials: true,
        headers,
      }
    );
  } catch (error) {
    console.error("Logout request error:", error);
  } finally {
    // Clear all client auth and session state
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("email");
    localStorage.removeItem("role");

    if (setEmail) setEmail(null);
    if (setBranch) setBranch(null);
    if (navigate) navigate("/login");
  }
};
