"use client";

import { useEffect, useState } from "react";
import { Search, Shield, CreditCard, Ban, Loader2 } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  credits: number;
  last_login_at: string | null;
  created_at: string;
  jobs_count: number;
}

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
    const res = await fetch(`/api/v1/admin/users?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  async function adjustCredits(userId: string) {
    const amount = prompt("Enter credit amount (positive to add, negative to remove):");
    if (!amount) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/admin/users/${userId}/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ amount: parseInt(amount) }),
    });
    fetchUsers();
  }

  async function suspendUser(userId: string) {
    if (!confirm("Suspend this user?")) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/admin/users/${userId}/suspend`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    fetchUsers();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchUsers();
  }

  const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: "text-purple-400 bg-purple-400/10",
    ADMIN: "text-blue-400 bg-blue-400/10",
    USER: "text-emerald-400 bg-emerald-400/10",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users ({total})</h1>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm w-72 focus:outline-none focus:border-primary"
          />
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credits</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Jobs</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.status === "active" ? "text-emerald-400" : "text-red-400"}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{u.credits}</td>
                  <td className="px-4 py-3 text-right">{u.jobs_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => adjustCredits(u.id)} className="p-1.5 rounded hover:bg-secondary" title="Adjust credits">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {u.status === "active" && (
                        <button onClick={() => suspendUser(u.id)} className="p-1.5 rounded hover:bg-secondary" title="Suspend">
                          <Ban className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
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
