import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 300000,
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// 401 → clear & redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user_info");
      window.location.href = "/login";
    }
   const backendMessage = error.response?.data?.error?.message;
    if (backendMessage) {
      error.message = backendMessage;
    }

    return Promise.reject(error);
  }
);

export default apiClient;

export const unwrap    = (res) => res.data.data;
export const buildParams = (filters = {}) => {
  const p = {};
  Object.entries(filters).forEach(([k,v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "ALL") p[k] = v;
  });
  return p;
};