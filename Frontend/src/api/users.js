import apiClient, { unwrap, buildParams } from "./apiClient";

// filters: { role, isActive, page, size }
export const getUsers           = async (f={}) => unwrap(await apiClient.get("/users", { params: buildParams(f) }));
export const getUser            = async (id)   => unwrap(await apiClient.get(`/users/${id}`));
export const createUser         = async (d)    => unwrap(await apiClient.post("/users", d));
// d: { username, password, fullName, email, role }
export const updateUser         = async (id,d) => unwrap(await apiClient.put(`/users/${id}`, d));
export const deleteUser         = async (id)   => apiClient.delete(`/users/${id}`);
export const toggleUserStatus   = async (id,v) => unwrap(await apiClient.patch(`/users/${id}/status`, { isActive: v }));
export const changeUserRole     = async (id,r) => unwrap(await apiClient.patch(`/users/${id}/role`, { role: r }));
export const adminResetPassword = async (id,p) => unwrap(await apiClient.post(`/users/${id}/reset-password`, { newPassword: p }));
export const getUserSessions    = async (id)   => unwrap(await apiClient.get(`/users/${id}/sessions`));
export const revokeUserSessions = async (id)   => apiClient.delete(`/users/${id}/sessions`);