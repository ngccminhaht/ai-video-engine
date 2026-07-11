"use client";

import { useEffect, useState } from "react";
import { Search, CreditCard, Ban, Loader2 } from "lucide-react";

interface AdminUser { id: string; email: string; name: string; role: string; status: string; credits: number; last_login_at: string | null; created_at: string; jobs_count: number; }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    const params = new URLSearchParams({ page_size: "50" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/v1/admin/users?${params}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.ok) { const data = await res.json(); setUsers(data.items); setTotal(data.total); }
    setLoading(false);
  }

  async function adjustCredits(userId: string) {
    const amount = prompt("Enter credit amount (positive to add, negative to remove):");
    if (!amount) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/admin/users/${userId}/credits`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ amount: parseInt(amount) }) });
    fetchUsers();
  }

  async function suspendUser(userId: string) {
    if (!confirm("Suspend this user?")) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/admin/users/${userId}/suspend`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    fetchUsers();
  }

  function handleSearch(e: React.FormEvent) { e.preventDefault(); fetchUsers(); }

  const ROLE_COLORS: Record<string, string> = { SUPER_ADMIN: "bg-[#FFF0F0] text-[#C5242D]", ADMIN: "bg-[#EEF4FF] text-[#3568B8]", USER: "bg-[#EAF8F1] text-[#178553]" };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Users ({total})</h1>
          <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>Manage platform users</p>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="input-admin pl-9 w-72" />
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--surface-secondary)" }}>
                <th className="text-left px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>User</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Role</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Status</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Credits</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Jobs</th>
                <th className="text-right px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-[#FFF8F7]" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-4 py-3"><p className="font-medium" style={{ color: "var(--text-primary)" }}>{u.name}</p><p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{u.email}</p></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[13px] font-medium ${ROLE_COLORS[u.role] || ""}`}>{u.role}</span></td>
                  <td className="px-4 py-3"><span className="text-[13px] font-medium" style={{ color: u.status === "active" ? "#178553" : "#D92D20" }}>{u.status}</span></td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "var(--text-primary)" }}>{u.credits}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>{u.jobs_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => adjustCredits(u.id)} className="p-1.5 rounded-lg transition-colors hover:bg-[#FFF0F0]" title="Adjust credits"><CreditCard className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} /></button>
                      {u.status === "active" && <button onClick={() => suspendUser(u.id)} className="p-1.5 rounded-lg transition-colors hover:bg-[#FFF0EF]" title="Suspend"><Ban className="w-4 h-4" style={{ color: "#D92D20" }} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
