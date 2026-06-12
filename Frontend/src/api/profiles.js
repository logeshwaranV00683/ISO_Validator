import apiClient, { unwrap, buildParams } from "./apiClient";

// ── Profiles ──────────────────────────────────────────────────────────────────
export const getProfiles        = async (f={}) => unwrap(await apiClient.get("/profiles", { params: buildParams(f) }));
export const getProfile         = async (id)   => unwrap(await apiClient.get(`/profiles/${id}`));
export const createProfile      = async (data) => unwrap(await apiClient.post("/profiles", data));
export const updateProfile      = async (id,d) => unwrap(await apiClient.put(`/profiles/${id}`, d));
export const deleteProfile      = async (id, username) => apiClient.delete(`/profiles/${id}`, { params: { username } });
export const setProfileDefault  = async (id, username) => unwrap(await apiClient.patch(`/profiles/${id}/default`, null, { params: { username } }));
export const toggleProfileStatus= async (id, v, username) => unwrap(await apiClient.patch(`/profiles/${id}/status`, null, { params: { active: v, username } }));
export const cloneProfile       = async (id,n) => unwrap(await apiClient.post(`/profiles/${id}/clone`, null, { params: { newName: n } }));
export const testConnection     = async (id)   => unwrap(await apiClient.post(`/profiles/${id}/test-connection`));
// returns: { profileId, host, port, result:"OK"|"FAILED", message, latencyMs, testedAt }

// ── Formats ───────────────────────────────────────────────────────────────────
export const getFormats         = async (f={}) => unwrap(await apiClient.get("/formats", { params: buildParams(f) }));
export const getFormat          = async (id)   => unwrap(await apiClient.get(`/formats/${id}`));
export const createFormat       = async (data) => unwrap(await apiClient.post("/formats", data));
export const updateFormat       = async (id,d) => unwrap(await apiClient.put(`/formats/${id}`, d));
// d: { xmlContent, changeNote }
export const deleteFormat       = async (id)   => apiClient.delete(`/formats/${id}`);
export const validateXml        = async (xml)  => unwrap(await apiClient.post("/formats/validate-xml", { xmlContent: xml }));
// returns: { valid, fieldCount, fieldsFound[], parseError }
export const getFormatVersions  = async (id)   => unwrap(await apiClient.get(`/formats/${id}/versions`));
export const rollbackFormat     = async (id,v) => unwrap(await apiClient.put(`/formats/${id}/rollback/${v}`));
export const reloadFormat       = async (id)   => unwrap(await apiClient.post(`/formats/${id}/reload`));
export const toggleFormatStatus = async (id,s) => unwrap(await apiClient.patch(`/formats/${id}/status`, { status: s }));