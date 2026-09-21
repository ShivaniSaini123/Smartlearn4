// Centralized backend API configuration
const server =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:4000";

export const API_BASE = `${server}/api/v1`;
export default server;
