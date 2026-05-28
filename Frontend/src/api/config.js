import apiClient, { unwrap } from "./apiClient";

// GET /config — list all key-value system configs
export const getSystemConfig = async () => {
  const res = await apiClient.get("/config");
  return unwrap(res);
  // [{ key, value, description, updatedAt, updatedBy }]
};

// PUT /config/:key
export const updateSystemConfig = async (key, value, description) => {
  const res = await apiClient.put(`/config/${encodeURIComponent(key)}`, { value, description });
  return unwrap(res);
};