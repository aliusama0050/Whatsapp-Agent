import api from "./api";
import type { Message } from "../types";

export interface SearchResult extends Message {
  customer_name: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}

export async function searchMessages(q: string, page = 1, limit = 20): Promise<SearchResponse> {
  const { data } = await api.get("/search/messages", { params: { q, page, limit } });
  return data;
}
