import apiClient, { unwrap } from "./apiClient";

// POST /validate — Parse + validate + AI explain
export const validateMessage = async (profileId, rawMessage, enableAi = false) => {
  const res = await apiClient.post("/validate", { profileId, rawMessage, enableAi });
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
export const buildMessage = async (profileId, mti, fields) => {
  const res = await apiClient.post("/validate/build", { profileId, mti, fields });
  return unwrap(res);
  // returns: { rawMessage, mti, bitmapHex, bitsSet[], totalLength,
  //   fieldBreakdown: [{ deNumber, fieldName, rawValue, encoding:"FIXED"|"LLVAR"|"LLLVAR" }],
  //   missingMandatory[], profile }
};

// POST /validate/:runReference/rerun
export const rerunValidation = async (runReference) => {
  const res = await apiClient.post(`/validate/${runReference}/rerun`);
  return unwrap(res);
};