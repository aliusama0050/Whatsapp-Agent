import { useEffect, useState } from "react";
import { getContact, updateContact, type Contact } from "../../services/contactApi";
import { X, Save, User, Mail, Building2, FileText, Loader2 } from "lucide-react";

interface Props {
  phoneNumber: string;
  onClose: () => void;
}

export default function ContactProfile({ phoneNumber, onClose }: Props) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setLoading(true);
    getContact(phoneNumber)
      .then((c) => {
        setContact(c);
        setName(c.name);
        setEmail(c.email);
        setCompany(c.company);
        setNotes(c.notes);
      })
      .catch(() => {
        setContact(null);
      })
      .finally(() => setLoading(false));
  }, [phoneNumber]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateContact(phoneNumber, { name, email, company, notes });
      setContact(updated);
      setDirty(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const updateField = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setDirty(true);
  };

  return (
    <div className="w-72 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Contact Info</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Avatar area */}
          <div className="flex flex-col items-center py-2">
            <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <User className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">{phoneNumber}</span>
          </div>

          {/* Fields */}
          <Field
            icon={<User className="h-3.5 w-3.5" />}
            label="Name"
            value={name}
            onChange={updateField(setName)}
          />
          <Field
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
            value={email}
            onChange={updateField(setEmail)}
            type="email"
          />
          <Field
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Company"
            value={company}
            onChange={updateField(setCompany)}
          />
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => updateField(setNotes)(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              placeholder="Add notes about this contact..."
            />
          </div>

          {/* Save */}
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-2 text-sm font-medium text-white transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          )}

          {/* Metadata */}
          {contact && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
              {contact.created_at && (
                <div className="text-xs text-zinc-400">
                  Created: {new Date(contact.created_at).toLocaleDateString()}
                </div>
              )}
              {contact.updated_at && (
                <div className="text-xs text-zinc-400">
                  Updated: {new Date(contact.updated_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </div>
  );
}
