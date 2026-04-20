import api from "./api";
import type { Template, Message } from "../types";

export async function getTemplates(): Promise<Template[]> {
  const { data } = await api.get("/templates");
  return data.templates;
}

export interface SendTemplateRequest {
  template_name: string;
  language_code: string;
  components: { type: string; parameters: { type: string; text: string }[] }[];
}

export async function sendTemplate(phone: string, body: SendTemplateRequest): Promise<Message> {
  const { data } = await api.post(`/templates/${phone}/send`, body);
  return data;
}
