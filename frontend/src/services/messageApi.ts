import api from "./api";
import type { Message } from "../types";

export async function getMessages(
  phone: string,
  before?: string,
  limit = 50
): Promise<{ messages: Message[]; has_more: boolean }> {
  const params: Record<string, string | number> = { limit };
  if (before) params.before = before;
  const { data } = await api.get(`/conversations/${phone}/messages`, { params });
  return data;
}

export async function sendMessage(phone: string, body: string): Promise<Message> {
  const { data } = await api.post(`/conversations/${phone}/messages`, { body });
  return data;
}
