import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import { getContacts, deleteContact, type Contact } from "../services/contactApi";
import { ArrowLeft, Search, Trash2, MessageSquare, ChevronLeft, ChevronRight, Users, Loader2 } from "lucide-react";

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContacts(search || undefined, page, limit);
      setContacts(res.contacts);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDelete = async (phone: string) => {
    if (!confirm(`Delete contact ${phone}?`)) return;
    try {
      await deleteContact(phone);
      fetchContacts();
    } catch {
      // silent
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Contacts</h1>
                <span className="text-sm text-zinc-500">({total})</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm">
              {search ? "No contacts match your search" : "No contacts yet"}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left">
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Phone</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Email</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Company</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                        {c.name || <span className="text-zinc-400 italic">Unknown</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 font-mono text-xs">
                        {c.phone_number}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                        {c.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                        {c.company || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/?phone=${c.phone_number}`)}
                            className="rounded p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            title="Open conversation"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.phone_number)}
                            className="rounded p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete contact"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
