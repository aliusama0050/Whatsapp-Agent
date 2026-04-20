import api from "./api";

export async function exportConversation(phone: string, format: "csv" | "json" = "csv"): Promise<void> {
  const { data } = await api.get(`/conversations/${phone}/export`, {
    params: { format },
    responseType: "blob",
  });

  const blob = new Blob([data], {
    type: format === "csv" ? "text/csv" : "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversation_${phone}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
