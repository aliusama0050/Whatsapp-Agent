import api from "./api";

export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  email: string;
  company: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

export async function getContacts(
  search?: string,
  page = 1,
  limit = 50
): Promise<ContactsResponse> {
  const params: Record<string, string | number> = { page, limit };
  if (search) params.search = search;
  const { data } = await api.get("/contacts", { params });
  return data;
}

export async function getContact(phone: string): Promise<Contact> {
  const { data } = await api.get(`/contacts/${phone}`);
  return data;
}

export async function updateContact(
  phone: string,
  updates: Partial<Pick<Contact, "name" | "email" | "company" | "notes">>
): Promise<Contact> {
  const { data } = await api.put(`/contacts/${phone}`, updates);
  return data;
}

export async function deleteContact(phone: string): Promise<void> {
  await api.delete(`/contacts/${phone}`);
}
