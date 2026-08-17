// import apiClient, { unwrap } from "./apiClient";

// // GET /config — list all key-value system configs
// export const getSystemConfig = async () => {
//   const res = await apiClient.get("/config");
//   return unwrap(res);
//   // [{ key, value, description, updatedAt, updatedBy }]
// };

// // PUT /config/:key
// export const updateSystemConfig = async (key, value, description) => {
//   const res = await apiClient.put(
//     `/config/${encodeURIComponent(key)}`,
//     {
//       configValue: value,
//       description
//     }
//   );
//   return unwrap(res);
// };
import apiClient, { unwrap } from "./apiClient";


export const getSystemConfig = async () => {
  const res = await apiClient.get("/config");
  return unwrap(res);
 
};


export const getConfigValue = async (key, fallback) => {
  try {
    const all = await getSystemConfig();
    const entry = (all || []).find(c => c.configKey === key);
    return entry ? entry.configValue : fallback;
  } catch (e) {
    return fallback;
  }
};


export const updateSystemConfig = async (key, value, description) => {
  const res = await apiClient.put(
    `/config/${encodeURIComponent(key)}`,
    {
      configValue: value,
      description
    }
  );
  return unwrap(res);
};