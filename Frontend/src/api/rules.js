import apiClient, { buildParams } from "./apiClient";

const direct = (res) => res.data;

export const getRules        = async (f={}) => direct(await apiClient.get("/rules/all", { params: buildParams(f) }));
export const getRule         = async (id)   => direct(await apiClient.get(`/rules/${id}`));
export const createRule      = async (d)    => direct(await apiClient.post("/rules", d));
export const updateRule      = async (id,d) => direct(await apiClient.put(`/rules/${id}`, d));
export const deleteRule      = async (id)   => apiClient.delete(`/rules/${id}`);
export const toggleRule      = async (id)   => direct(await apiClient.patch(`/rules/${id}/status`));
export const reorderRules    = async (arr)  => direct(await apiClient.patch("/rules/reorder", { priorities: arr }));
export const exportRules     = async (profileId, mti) => direct(await apiClient.get("/rules/export", { params: buildParams({ profileId, mti }) }));
export const bulkImportRules = async (profileId, profileName, mti, rules, strategy="MERGE") =>
  direct(await apiClient.post("/rules/bulk-import", { profileId, profileName, mti, strategy, rules }));

// Field Definitions — also no ApiResponse wrapper
export const getFieldDefinitions  = async (f={}) => direct(await apiClient.get("/field-definitions", { params: buildParams(f) }));
export const getFieldDefinition   = async (id)   => direct(await apiClient.get(`/field-definitions/${id}`));
export const createFieldDef       = async (d)    => direct(await apiClient.post("/field-definitions", d));
export const updateFieldDef       = async (id,d) => direct(await apiClient.put(`/field-definitions/${id}`, d));
export const deleteFieldDef       = async (id)   => apiClient.delete(`/field-definitions/${id}`);
export const bulkImportFieldDefs  = async (profileId, mti, defs) =>
  direct(await apiClient.post("/field-definitions/bulk-import", { profileId, mti, definitions: defs }));