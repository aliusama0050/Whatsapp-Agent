import api from "./api";
import type { Message } from "../types";

export async function sendMedia(phone: string, file: File, caption?: string): Promise<Message> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);

  const { data } = await api.post(`/media/conversations/${phone}/send`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
