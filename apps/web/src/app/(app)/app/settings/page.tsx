"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { User, Lock, Loader2, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Settings</h1>
        <p className="text-sm text-[#666666] mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <ProfileSection />

      {/* Password Section */}
      <PasswordSection />

      {/* Account Info */}
      <div className="p-6 rounded-xl border border-[#E5E5E5]">
        <h2 className="text-lg font-medium text-[#0A0A0A] mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#666666]">Email</span>
            <span className="text-[#0A0A0A]">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666666]">Account ID</span>
            <span className="text-[#0A0A0A] font-mono text-xs">{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666666]">Role</span>
            <span className="text-[#0A0A0A]">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666666]">Member since</span>
            <span className="text-[#0A0A0A]">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const token = localStorage.getItem("access_token");
    const res = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      setSaved(true);
      // Update stored user
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        u.name = name;
        localStorage.setItem("user", JSON.stringify(u));
      }
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="p-6 rounded-xl border border-[#E5E5E5]">
      <div className="flex items-center gap-3 mb-4">
        <User className="w-5 h-5 text-[#666666]" />
        <h2 className="text-lg font-medium text-[#0A0A0A]">Profile</h2>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#111111]"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || name === user?.name}
            className="px-4 py-2 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </div>
    </form>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const token = localStorage.getItem("access_token");
    const res = await fetch("/api/v1/me/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (res.ok) {
      setMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const data = await res.json();
      setError(data.detail || "Failed to change password");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-[#E5E5E5]">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="w-5 h-5 text-[#666666]" />
        <h2 className="text-lg font-medium text-[#0A0A0A]">Change Password</h2>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#111111]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#111111]"
          />
          <p className="mt-1 text-xs text-[#8A8A8A]">Minimum 8 characters</p>
        </div>

        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        {message && <p className="text-sm text-[#16A34A]">{message}</p>}

        <button
          type="submit"
          disabled={saving || !currentPassword || newPassword.length < 8}
          className="px-4 py-2 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
        </button>
      </div>
    </form>
  );
}
