import apiClient, { unwrap, buildParams } from "./apiClient";

// ── Ollama Config ─────────────────────────────────────────────────────────────
export const getAiConfig      = async ()   => unwrap(await apiClient.get("/ai/config"));
export const updateAiConfig   = async (d)  => unwrap(await apiClient.put("/ai/config", d));
export const getAvailableModels = async () => unwrap(await apiClient.get("/ai/models"));
export const updateAiConfigBulk = async (items) => unwrap(await apiClient.put("/ai/config/bulk", items));
// returns: [{ name, size, modified, isActive }]

// ── Prompt Templates ──────────────────────────────────────────────────────────
export const getGlobalPrompt  = async ()           => unwrap(await apiClient.get("/ai/prompts/global"));
export const updateGlobalPrompt = async (content, note) =>
  unwrap(await apiClient.put("/ai/prompts/global", { promptTemplate: content, changeNote: note }));

export const getProfilePrompt  = async (profileId) => unwrap(await apiClient.get(`/ai/prompts/profile/${profileId}`));
export const upsertProfilePrompt = async (profileId, content, note) =>
  unwrap(await apiClient.put(`/ai/prompts/profile/${profileId}`, { promptTemplate: content, changeNote: note }));
export const deleteProfilePrompt = async (profileId) => apiClient.delete(`/ai/prompts/profile/${profileId}`);

export const testPrompt = async (data) =>
  unwrap(await apiClient.post("/ai/test", data));
// data: { templateContent, sampleMti, sampleProfileName, sampleErrors }
// returns: { response, durationMs, modelUsed }

export const getPromptVersions = async (templateId) =>
  unwrap(await apiClient.get(`/ai/prompts/${templateId}/versions`));
export const rollbackPrompt = async (templateId, version) =>
  unwrap(await apiClient.put(`/ai/prompts/${templateId}/rollback/${version}`));

// ── AI Logs ───────────────────────────────────────────────────────────────────
// filters: { runReference, status, page, size }
export const getAiLogs = async (f = {}) =>
  unwrap(await apiClient.get("/ai/logs", { params: buildParams(f) }));