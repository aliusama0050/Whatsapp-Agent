export interface User {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
}

export interface Conversation {
  id: string;
  phone_number: string;
  customer_name: string;
  agent_status: "ai_active" | "human_takeover";
  last_message_at: string | null;
  last_customer_message_at: string | null;
  window_expires_at: string | null;
  unread_count: number;
  last_message_preview: string | null;
  tags?: string[];
}

export interface Note {
  id: string;
  text: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface Message {
  id: string;
  phone_number: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "ai_agent" | "human_agent";
  message_type: string;
  body: string;
  status: string;
  whatsapp_message_id: string | null;
  timestamp: string;
  // Template messages
  template_name?: string;
  template_language?: string;
  template_components?: TemplateComponent[];
  // Media messages (Feature 2)
  media_url?: string;
  media_type?: string;
  mime_type?: string;
  filename?: string;
}

export interface Template {
  name: string;
  language: string;
  category: string;
  components: TemplateComponent[];
}

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

export interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  category: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export type WSEvent =
  | { type: "new_message"; conversation_id: string; phone_number: string; customer_name?: string; message: Message }
  | { type: "message_status"; whatsapp_message_id: string; status: string }
  | { type: "agent_status_changed"; phone_number: string; status: string; changed_by: string };
