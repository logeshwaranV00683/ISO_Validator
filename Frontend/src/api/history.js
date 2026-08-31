import apiClient, { unwrap, buildParams } from "./apiClient";

// filters: { profileId, mti, status, environment, fromDate, toDate,
//            responseCode, search, page, size, sortBy, sortDir }
export const getHistory = async (f = {}) => {
  const res = await apiClient.get("/history", { params: buildParams(f) });
  return unwrap(res);
  // PagedResponse: { content:[], page, size, totalElements, totalPages }
};

export const getHistoryDetail = async (runReference) => {
  const res = await apiClient.get(`/history/${runReference}`);
  return unwrap(res);
};

export const getHistoryStats = async () => {
  const res = await apiClient.get("/history/stats");
  return unwrap(res);
  // { totalRuns, passed, failed, warned, passRate, avgTotalMs, avgAiMs, p95TotalMs,
  //   aiSkipCount, topErrorFields:[], runsByMti:{}, runsByProfile:{}, runsByStatus:{} }
};

export const exportHistory = async (f = {}, format = "json") => {
  const res = await apiClient.get("/history/export", {
    params: { ...buildParams(f), format },
    responseType: format === "csv" ? "blob" : "json",
  });
  return res.data;
};

export const deleteRun = async (runReference) => {
  await apiClient.delete(`/history/${runReference}`);
};

export const bulkDeleteRuns = async (runReferences) => {
  const res = await apiClient.post("/history/bulk-delete", runReferences);
  return unwrap(res);
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
// filters: { sourceService, action, entityType, entityId, userId, fromDate, toDate, page, size }
export const getAuditLogs = async (f = {}) => {
  const res = await apiClient.get("/audit", { params: buildParams(f) });
  return unwrap(res);
};

export const getAuditLog = async (auditId) => {
  const res = await apiClient.get(`/audit/${auditId}`);
  return unwrap(res);
};