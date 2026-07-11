"use client";

import { useEffect, useState } from "react";
import { Sparkles, Video, Clock, HardDrive, Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface UsageData {
  summary: {
    credits_balance: number;
    credits_used_this_month: number;
    total_videos_generated: number;
    total_seconds_generated: number;
    storage_used_mb: number;
  };
  plan: {
    name: string;
    monthly_credits: number;
    max_storage_gb: number;
    max_resolution: string;
    status: string;
  };
  recent_transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    note: string | null;
    created_at: string;
  }>;
}

const TX_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  hold: { label: "Hold", color: "text-[#D97706]" },
  charge: { label: "Charge", color: "text-[#DC2626]" },
  refund: { label: "Refund", color: "text-[#16A34A]" },
  grant: { label: "Grant", color: "text-[#16A34A]" },
  purchase: { label: "Purchase", color: "text-[#16A34A]" },
};

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/me/usage", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    fetch_data();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#8A8A8A]" />
      </div>
    );
  }

  if (!data) return <p className="text-[#666666]">Failed to load usage data</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Usage</h1>
        <p className="text-sm text-[#666666] mt-1">Track your credits and generation history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Sparkles className="w-4 h-4" />} label="Credits Balance" value={String(data.summary.credits_balance)} />
        <StatCard icon={<TrendingDown className="w-4 h-4" />} label="Used This Month" value={String(data.summary.credits_used_this_month)} />
        <StatCard icon={<Video className="w-4 h-4" />} label="Videos Generated" value={String(data.summary.total_videos_generated)} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Seconds Generated" value={`${data.summary.total_seconds_generated}s`} />
      </div>

      {/* Plan Info */}
      <div className="p-6 rounded-xl border border-[#E5E5E5] bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[#0A0A0A]">Current Plan</h2>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#16A34A]/10 text-[#16A34A]">
            {data.plan.status}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[#8A8A8A] mb-1">Plan</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">{data.plan.name}</p>
          </div>
          <div>
            <p className="text-xs text-[#8A8A8A] mb-1">Monthly Credits</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">{data.plan.monthly_credits}</p>
          </div>
          <div>
            <p className="text-xs text-[#8A8A8A] mb-1">Max Storage</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">{data.plan.max_storage_gb} GB</p>
          </div>
          <div>
            <p className="text-xs text-[#8A8A8A] mb-1">Max Resolution</p>
            <p className="text-sm font-semibold text-[#0A0A0A]">{data.plan.max_resolution}</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-lg font-medium text-[#0A0A0A] mb-3">Credit History</h2>
        {data.recent_transactions.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-[#E5E5E5]">
            <p className="text-sm text-[#666666]">No transactions yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
            {data.recent_transactions.map((tx) => {
              const config = TX_TYPE_CONFIG[tx.type] || { label: tx.type, color: "text-[#0A0A0A]" };
              return (
                <div key={tx.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0A0A0A]">{config.label}</p>
                    <p className="text-xs text-[#8A8A8A]">
                      {tx.note || new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white">
      <div className="flex items-center gap-2 text-[#666666] mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-[#0A0A0A]">{value}</p>
    </div>
  );
}
