import apiClient, { unwrap } from "./apiClient";

// POST /validate — Parse + validate + AI explain
export const validateMessage = async (profileId, rawMessage, enableAi = false) => {
  const res = await apiClient.post("/validate",
    { profileId, rawMessage, enableAi },
    { timeout: enableAi ? 120000 : 30000 }  // AI on → 2min, normal → 30sec
  );
  return unwrap(res);
  // returns: { runReference, status, mti, mtiDescription, profile,
  //   timing: { parseDurationMs, validationDurationMs, aiDurationMs, totalDurationMs },
  //   bitmap: { primary, extended, bitsSet[] },
  //   parsedFields: [{ deNumber, fieldName, rawValue, displayValue, isPresent }],
  //   errors: [{ deNumber, fieldName, severity, issueDescription, ruleSnapshot,
  //              aiExplanation, aiFixSuggestion }],
  //   summary: { criticalCount, warningCount, infoCount },
  //   ai: { enabled, modelUsed, durationMs } }
};

// POST /validate/build — Build raw message from DE field values
  // returns: { rawMessage, mti, bitmapHex, bitsSet[], totalLength,
  //   fieldBreakdown: [{ deNumber, fieldName, rawValue, encoding:"FIXED"|"LLVAR"|"LLLVAR" }],
  //   missingMandatory[], profile }
export const buildMessage = async (profileId, mti, fields, outputFormat = "HEX") => {
  const res = await apiClient.post("/validate/build", { profileId, mti, fields, outputFormat });
  return res.data?.data ?? res.data;
};

// POST /validate/:runReference/rerun
export const rerunValidation = async (runReference) => {
  const res = await apiClient.post(`/validate/${runReference}/rerun`);
  return unwrap(res);
};