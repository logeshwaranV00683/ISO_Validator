import apiClient, { unwrap } from "./apiClient";


export const validateMessage = async (profileId, rawMessage, enableAi = false) => {
  const res = await apiClient.post("/validate",
    { profileId, rawMessage, enableAi },
    { timeout: enableAi ? 120000 : 30000 }  // AI on → 2min, normal → 30sec
  );
  return unwrap(res);
 
};


export const buildMessage = async (profileId, mti, fields, outputFormat = "HEX") => {
  const res = await apiClient.post("/validate/build", { profileId, mti, fields, outputFormat });
  return res.data?.data ?? res.data;
};

export const rerunValidation = async (runReference) => {
  const res = await apiClient.post(`/validate/${runReference}/rerun`);
  return unwrap(res);
};


export const askAiChat = async ({ mti, profileName, errors, parsedFields, originalExplanation, history, question }) => {
  const res = await apiClient.post("/ai/chat", {
    mti, profileName, errors, parsedFields, originalExplanation, history, question
  });
  return unwrap(res);
  
};