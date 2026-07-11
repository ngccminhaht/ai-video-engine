"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchLogs(); }, [page]);

  async function fetchLogs() {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/admin/logs?page=${page}&page_size=50`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  const ACTION_COLORS: Record<string, string> = {
    adjust_credits: "text-yellow-400",
    suspend_user: "text-red-400",
    update_user: "text-blue-400",
    load_model: "text-emerald-400",
    unload_model: "text-orange-400",
    disable_model: "text-red-400",
    enable_model: "text-emerald-400",
    drain_worker: "text-yellow-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audit Logs ({total})</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-border">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No audit logs yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${ACTION_COLORS[log.action] || "text-foreground"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.resource_type}
                    {log.resource_id && <span className="ml-1 font-mono text-xs">({log.resource_id.slice(0, 8)}...)</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded border border-border text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-muted-foreground px-3 py-1.5">Page {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={logs.length < 50}
            className="px-3 py-1.5 rounded border border-border text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
