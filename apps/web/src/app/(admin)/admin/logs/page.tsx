"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

interface AuditLogEntry { id: string; user_id: string | null; action: string; resource_type: string; resource_id: string | null; details: Record<string, unknown> | null; created_at: string; }

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchLogs(); }, [page]);

  async function fetchLogs() {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/admin/logs?page=${page}&page_size=50`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.ok) { const data = await res.json(); setLogs(data.items); setTotal(data.total); }
    setLoading(false);
  }

  const ACTION_COLORS: Record<string, string> = {
    adjust_credits: "color: #B66A00", suspend_user: "color: #D92D20", update_user: "color: #3568B8",
    load_model: "color: #178553", unload_model: "color: #B66A00", disable_model: "color: #D92D20",
    enable_model: "color: #178553", drain_worker: "color: #B66A00",
  };

  return (
    <div className="flex flex-col gap-8">
      <div >
        <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Audit Logs ({total})</h1>
        <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>System activity history</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border-default)" }}>
          <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No audit logs yet</p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--surface-secondary)" }}>
                <th className="text-left px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Time</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Action</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Resource</th>
                <th className="text-left px-4 py-3 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-[#FFF8F7]" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className="font-medium text-sm" style={ACTION_COLORS[log.action] ? { [ACTION_COLORS[log.action].split(":")[0]]: ACTION_COLORS[log.action].split(":")[1].trim() } : { color: "var(--text-primary)" }}>{log.action}</span></td>
                  <td className="px-4 py-3" style={{ color: "var(--text-tertiary)" }}>{log.resource_type}{log.resource_id && <span className="ml-1 font-mono text-xs" style={{ color: "var(--text-muted)" }}>({log.resource_id.slice(0, 8)}...)</span>}</td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text-muted)" }}>{log.details ? JSON.stringify(log.details) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn btn-default disabled:opacity-50">Previous</button>
          <span className="text-sm px-3 py-1.5" style={{ color: "var(--text-tertiary)" }}>Page {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={logs.length < 50} className="btn btn-default disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
