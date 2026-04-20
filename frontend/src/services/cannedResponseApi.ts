import api from "./api";
import type { CannedResponse } from "../types";

export async function getCannedResponses(category?: string): Promise<CannedResponse[]> {
  const params = category ? { category } : {};
  const { data } = await api.get("/canned-responses", { params });
  return Array.isArray(data.canned_responses) ? data.canned_responses : Array.isArray(data) ? data : [];
}

export async function createCannedResponse(
  payload: { shortcut: string; title: string; body: string; category: string }
): Promise<CannedResponse> {
  const { data } = await api.post("/canned-responses", payload);
  return data;
}

export async function updateCannedResponse(
  id: string,
  payload: Partial<{ shortcut: string; title: string; body: string; category: string }>
): Promise<CannedResponse> {
  const { data } = await api.put(`/canned-responses/${id}`, payload);
  return data;
}

export async function deleteCannedResponse(id: string): Promise<void> {
  await api.delete(`/canned-responses/${id}`);
}
