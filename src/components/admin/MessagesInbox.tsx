import { Download, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ContactMessageItem } from '../../types/portfolio';
import { apiJson } from '../../utils/api';

export default function MessagesInbox() {
  const [messages, setMessages] = useState<ContactMessageItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchMessages(query = '') {
    setLoading(true);
    const res = await apiJson<{ messages?: ContactMessageItem[] }>(
      `/api/admin/messages${query ? `?q=${encodeURIComponent(query)}` : ''}`,
    );
    if (res.ok && res.data.messages) {
      setMessages(res.data.messages);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMessages('');
  }, []);

  async function toggleRead(msg: ContactMessageItem) {
    const nextRead = !msg.isRead;
    const res = await apiJson<{ ok: boolean }>(`/api/admin/messages/${msg.id}`, {
      method: 'PATCH',
      requireCsrf: true,
      body: { isRead: nextRead },
    });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: nextRead } : m)));
    }
  }

  async function deleteMsg(id: number) {
    const res = await apiJson<{ ok: boolean }>(`/api/admin/messages/${id}`, {
      method: 'DELETE',
      requireCsrf: true,
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchMessages(search);
  }

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#141413]">Messages Inbox</h2>
          <p className="text-xs text-[#57554F] font-mono-tabular">
            {messages.length} total · {unreadCount} unread
          </p>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center border border-[#D6D2C9] bg-white">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              aria-label="Search messages"
              className="px-3 py-1.5 text-sm focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Run search"
              className="px-3 py-2 text-[#57554F] hover:text-[#141413]"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <a
            href="/api/admin/messages/export"
            className="inline-flex items-center gap-1.5 border border-[#141413] bg-white px-3.5 py-2 text-xs font-medium text-[#141413] hover:bg-[#F8F7F4]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="border border-[#E4E1DA] bg-white p-8 text-center text-sm text-[#57554F]">
          Loading inbox...
        </div>
      ) : messages.length === 0 ? (
        <div className="border border-[#E4E1DA] bg-white p-8 text-center text-sm text-[#57554F]">
          No contact messages found.
        </div>
      ) : (
        <div className="divide-y divide-[#E4E1DA] border border-[#E4E1DA] bg-white">
          {messages.map((msg) => (
            <div key={msg.id} className="p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`font-mono-tabular text-xs font-medium ${
                      msg.isRead ? 'text-[#57554F]' : 'text-[#1E40AF]'
                    }`}
                  >
                    {msg.isRead ? 'Read' : 'Unread'}
                  </span>
                  <h3 className="font-display text-base font-semibold text-[#141413]">{msg.subject}</h3>
                </div>
                <span className="font-mono-tabular text-xs text-[#57554F]">{msg.createdAt}</span>
              </div>

              <p className="text-xs text-[#57554F]">
                From <span className="font-medium text-[#141413]">{msg.fullName}</span> ({msg.email})
              </p>

              <p className="text-sm leading-relaxed text-[#141413] whitespace-pre-wrap">{msg.message}</p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => toggleRead(msg)}
                  className="border border-[#E4E1DA] px-3 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F8F7F4]"
                >
                  {msg.isRead ? 'Mark unread' : 'Mark read'}
                </button>
                <button
                  type="button"
                  aria-label={`Delete message from ${msg.fullName}`}
                  onClick={() => deleteMsg(msg.id)}
                  className="border border-[#E4E1DA] p-2 text-[#B91C1C] hover:bg-[#FEF2F2]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
