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

// ── Generic Templates (used for scopes with no dedicated endpoint, e.g. BRD_PARSE) ─────────
// Backend: AiTemplateController — GET/POST /ai/templates, GET/PUT/DELETE /ai/templates/{id},
// PUT /ai/templates/{id}/rollback, GET /ai/templates/{id}/versions
export const getTemplatesByScope = async (scope) =>
  unwrap(await apiClient.get("/ai/templates", { params: { scope } }));
export const getTemplateById = async (id) =>
  unwrap(await apiClient.get(`/ai/templates/${id}`));
export const createTemplate = async (template) =>
  unwrap(await apiClient.post("/ai/templates", template));
export const updateTemplate = async (id, template) =>
  unwrap(await apiClient.put(`/ai/templates/${id}`, template));
export const deleteTemplate = async (id) =>
  unwrap(await apiClient.delete(`/ai/templates/${id}`));
export const getTemplateVersions = async (id) =>
  unwrap(await apiClient.get(`/ai/templates/${id}/versions`));
export const rollbackTemplate = async (id) =>
  unwrap(await apiClient.put(`/ai/templates/${id}/rollback`));

// ── AI Logs ───────────────────────────────────────────────────────────────────
// filters: { runReference, status, page, size }
export const getAiLogs = async (f = {}) =>
  unwrap(await apiClient.get("/ai/logs", { params: buildParams(f) }));