import apiClient, { unwrap, buildParams } from "./apiClient";

// ── Validation Rules ──────────────────────────────────────────────────────────
// filters: { profileId, mti, severity, isActive, page, size }
export const getRules        = async (f={}) => unwrap(await apiClient.get("/rules", { params: buildParams(f) }));
export const getRule         = async (id)   => unwrap(await apiClient.get(`/rules/${id}`));
export const createRule      = async (d)    => unwrap(await apiClient.post("/rules", d));
export const updateRule      = async (id,d) => unwrap(await apiClient.put(`/rules/${id}`, d));
export const deleteRule      = async (id)   => apiClient.delete(`/rules/${id}`);

// FIX: Backend PATCH /rules/{id}/status takes NO body — it toggles internally.
// Removed { isActive: v } body; `v` param removed since backend ignores it.
export const toggleRule      = async (id)   => unwrap(await apiClient.patch(`/rules/${id}/status`));

// FIX: Backend ReorderRulesRequest expects { priorities: [...] }, not { updates: [...] }
export const reorderRules    = async (arr)  => unwrap(await apiClient.patch("/rules/reorder", { priorities: arr }));
// arr: [{ ruleId, priority }]

// FIX: BulkImportRulesRequest requires profileName — pass it through
export const bulkImportRules = async (profileId, profileName, mti, rules, strategy="MERGE") =>
  unwrap(await apiClient.post("/rules/bulk-import", { profileId, profileName, mti, strategy, rules }));
// returns: { imported, updated, skipped, errors[] }

export const exportRules     = async (profileId, mti) =>
  unwrap(await apiClient.get("/rules/export", { params: buildParams({ profileId, mti }) }));

// ── Field Definitions — replaces hardcoded PROFILE_DE_CATALOG ─────────────────
// filters: { profileId, mti }
export const getFieldDefinitions  = async (f={}) => unwrap(await apiClient.get("/field-definitions", { params: buildParams(f) }));
// each: { definitionId, profileId, mti, deNumber, fieldName, dataType,
//         maxLength, isLlvar, isMandatory, placeholderValue, displayOrder,
//         isBuilderVisible, isActive }
export const getFieldDefinition   = async (id)   => unwrap(await apiClient.get(`/field-definitions/${id}`));
export const createFieldDef       = async (d)    => unwrap(await apiClient.post("/field-definitions", d));
export const updateFieldDef       = async (id,d) => unwrap(await apiClient.put(`/field-definitions/${id}`, d));
export const deleteFieldDef       = async (id)   => apiClient.delete(`/field-definitions/${id}`);
export const bulkImportFieldDefs  = async (profileId, mti, defs) =>
  unwrap(await apiClient.post("/field-definitions/bulk-import", { profileId, mti, definitions: defs }));