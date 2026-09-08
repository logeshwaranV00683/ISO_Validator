import apiClient, { unwrap } from "./apiClient";

export const uploadBrd = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(await apiClient.post("/ai/brd/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 900000
    }));
};

export const uploadBrdMulti = async (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    return unwrap(await apiClient.post("/ai/brd/upload-multi", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 900000
    }));
};
export const getBrdList       = async ()         => unwrap(await apiClient.get("/ai/brd"));
export const getBrdById       = async (id)       => unwrap(await apiClient.get(`/ai/brd/${id}`));
export const getBrdPreview    = async (id)       => unwrap(await apiClient.get(`/ai/brd/${id}/preview`));
export const updateBrdPreview = async (id, data) => unwrap(await apiClient.put(`/ai/brd/${id}/preview`, data));
export const confirmBrd       = async (id)       => unwrap(await apiClient.post(`/ai/brd/${id}/confirm`));
export const deleteBrd        = async (id)       => apiClient.delete(`/ai/brd/${id}`);
export const suggestSwitch    = async (rawMessage) =>
    unwrap(await apiClient.post("/ai/suggest-switch", { rawMessage }));