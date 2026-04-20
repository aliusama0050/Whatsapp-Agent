import api from "./api";
import type { User } from "../types";

export interface UserDetail extends User {
  created_at?: string;
}

export async function getUsers(): Promise<UserDetail[]> {
  const { data } = await api.get("/users");
  return Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : [];
}

export async function createUser(payload: { username: string; password: string; role: string }): Promise<UserDetail> {
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(id: string, payload: Partial<{ username: string; role: string; is_active: boolean }>): Promise<UserDetail> {
  const { data } = await api.put(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function resetPassword(id: string, newPassword: string): Promise<void> {
  await api.put(`/users/${id}/reset-password`, { new_password: newPassword });
}
