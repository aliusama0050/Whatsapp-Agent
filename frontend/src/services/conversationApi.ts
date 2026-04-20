import api from "./api";
import type { Conversation, Note } from "../types";

export async function getConversations(
  page = 1,
  limit = 20,
  status?: string
): Promise<{ conversations: Conversation[]; total: number }> {
  const params: Record<string, string | number> = { page, limit };
  if (status) params.status = status;
  const { data } = await api.get("/conversations", { params });
  return data;
}

export async function getConversation(phone: string): Promise<Conversation> {
  const { data } = await api.get(`/conversations/${phone}`);
  return data;
}

export async function toggleAgent(phone: string, status: "ai_active" | "human_takeover") {
  const { data } = await api.put(`/conversations/${phone}/agent`, { status });
  return data;
}

export async function markRead(phone: string) {
  await api.put(`/conversations/${phone}/read`);
}

export async function getStats() {
  const { data } = await api.get("/dashboard/stats");
  return data;
}

// Tags
export async function updateTags(phone: string, tags: string[]): Promise<{ tags: string[] }> {
  const { data } = await api.put(`/conversations/${phone}/tags`, { tags });
  return data;
}

// Notes
export async function getNotes(phone: string): Promise<Note[]> {
  const { data } = await api.get(`/conversations/${phone}/notes`);
  return data.notes;
}

export async function addNote(phone: string, text: string): Promise<Note> {
  const { data } = await api.post(`/conversations/${phone}/notes`, { text });
  return data;
}

export async function deleteNote(phone: string, noteId: string): Promise<void> {
  await api.delete(`/conversations/${phone}/notes/${noteId}`);
}
