"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  FolderOpen,
  Clock,
  Image,
  BarChart3,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/lib/auth/guard";
import { useAuth } from "@/lib/auth/provider";

const navItems = [
  { title: "Dashboard", href: "/app", icon: LayoutDashboard },
  { title: "Generate", href: "/app/generate", icon: Video },
  { title: "Projects", href: "/app/projects", icon: FolderOpen },
  { title: "Jobs", href: "/app/jobs", icon: Clock },
  { title: "Assets", href: "/app/assets", icon: Image },
  { title: "Usage", href: "/app/usage", icon: BarChart3 },
  { title: "Settings", href: "/app/settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <AppHeader />
        <main className="max-w-[1280px] mx-auto px-6 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}

function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-[#E5E5E5] bg-white sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 flex items-center h-14 gap-1">
        {/* Logo */}
        <Link href="/app" className="flex items-center gap-2 mr-6">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#111111]">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-[#0A0A0A] hidden sm:block">
            AI Video
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/app"
                ? pathname === "/app" || pathname === "/app/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#F7F7F7] text-[#0A0A0A]"
                    : "text-[#666666] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden md:block">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Credits */}
        {user && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F7F7F7] text-sm">
            <span className="text-[#666666]">Credits:</span>
            <span className="font-medium text-[#0A0A0A]">{user.credits}</span>
          </div>
        )}

        {/* User menu */}
        <div className="flex items-center gap-2 ml-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F7F7F7] cursor-default">
            <div className="w-7 h-7 rounded-full bg-[#E5E5E5] flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-[#666666]" />
            </div>
            <span className="text-sm text-[#0A0A0A] hidden lg:block">
              {user?.name}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-[#8A8A8A] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
