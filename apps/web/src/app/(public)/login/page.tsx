"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Video } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") {
        localStorage.setItem("access_token", "mock-access-token");
        localStorage.setItem("refresh_token", "mock-refresh-token");
        localStorage.setItem("user", JSON.stringify({
          id: "mock-admin-001", email, name: "Admin", avatar_url: null,
          role: "SUPER_ADMIN", status: "active", credits: 1000,
          email_verified: true, created_at: new Date().toISOString(),
        }));
        router.push("/admin");
        return;
      }

      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Login failed");
        return;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "ADMIN" || data.user.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/app");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#F8F5F4" }}>
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl" style={{ background: "#7F1D24" }}>
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: "#241719" }}>Revid.IO</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8" style={{ border: "1px solid #EBDCDD", boxShadow: "0 1px 2px rgba(71,24,29,0.04), 0 8px 24px rgba(71,24,29,0.05)" }}>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: "#241719" }}>Welcome back</h1>
          <p className="text-sm mb-6" style={{ color: "#847174" }}>Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {error && (
              <div className="p-3 rounded-xl text-sm" style={{ background: "#FFF0EF", border: "1px solid #F4B8B3", color: "#D92D20" }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold mb-1.5" style={{ color: "#241719" }}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-admin"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-semibold mb-1.5" style={{ color: "#241719" }}>Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="input-admin pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#A99699" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#847174" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium hover:underline" style={{ color: "#C5242D" }}>
              Create one
            </Link>
          </p>
          <p className="mt-2 text-center">
            <Link href="/forgot-password" className="text-sm hover:underline" style={{ color: "#847174" }}>
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
