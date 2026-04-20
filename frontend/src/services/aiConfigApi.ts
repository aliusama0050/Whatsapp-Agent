import api from "./api";

export interface KnowledgeEntry {
  title: string;
  content: string;
}

export interface AIConfig {
  system_prompt: string;
  fallback_message: string;
  knowledge_entries: KnowledgeEntry[];
  default_system_prompt?: string;
  default_fallback_message?: string;
}

export async function getAIConfig(): Promise<AIConfig> {
  const { data } = await api.get("/ai-config");
  return {
    ...data,
    knowledge_entries: Array.isArray(data.knowledge_entries) ? data.knowledge_entries : [],
  };
}

export async function updateAIConfig(
  payload: Partial<{ system_prompt: string; fallback_message: string; knowledge_entries: KnowledgeEntry[] }>
): Promise<AIConfig> {
  const { data } = await api.put("/ai-config", payload);
  return data;
}
