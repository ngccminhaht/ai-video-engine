"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { navGroups, siteConfig } from "@/config/site";
import {
  Video,
  BookOpen,
  User,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { SidebarToggleIcon, ChevronSelectorIcon } from "@/components/icons";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { useState, useEffect, useRef } from "react";

export function Sidebar() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored) setCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-white border-r border-[#EBDCDD] overflow-hidden transition-all duration-200 max-md:hidden",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo + Collapse toggle — like aihive top area */}
      <div
        className={cn(
          "shrink-0 flex items-center h-16 border-b border-[#EBDCDD]",
          collapsed ? "justify-center px-2" : "justify-between px-5"
        )}
      >
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-3">
            <img src="/images/logo-full.png" alt={siteConfig.name} className="h-8 w-auto object-contain" />
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" className="flex items-center justify-center">
            <img src="/images/logo-mark.png" alt="Logo" className="w-9 h-9 object-contain" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-md text-[#A99699] hover:text-[#241719] hover:bg-[#F3E9E9] transition-colors"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <SidebarToggleIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Role Switcher */}
      {!collapsed && (
        <div className="shrink-0 px-4 pt-4 pb-2">
          <RoleSwitcher />
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group Label — aihive: uppercase, gray, small, tracking wide */}
            {!collapsed && (
              <p className="px-1 mt-5 mb-3 text-[13px] font-bold uppercase tracking-wider text-[#A99699]">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mt-3" />}

            {/* Nav Items — aihive style: h-10, rounded-xl, gap-3 */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "relative flex items-center gap-3.5 h-12 rounded-xl text-[15px] font-medium transition-all duration-150",
                      collapsed
                        ? "justify-center w-12 mx-auto"
                        : "px-4",
                      isActive
                        ? "text-[#C5242D] bg-[#FFF0F0]"
                        : "text-[#625154] hover:text-[#241719] hover:bg-[#F8F5F4]"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                    {/* Active indicator — red bar right side like aihive */}
                    {isActive && !collapsed && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full bg-[#C5242D]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section — Guide + Account Dropdown like aihive */}
      <div
        className={cn(
          "shrink-0 border-t border-[#EBDCDD] px-3 py-3 space-y-2",
          collapsed && "flex flex-col items-center px-2"
        )}
      >
        {/* Documentation — aihive style with dark circle icon */}
        <Link
          href="/docs"
          className={cn(
            "flex items-center gap-3.5 h-12 rounded-xl transition-all duration-150",
            collapsed ? "justify-center w-12" : "px-4",
            "text-[#625154] hover:text-[#241719] hover:bg-[#F8F5F4]"
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#241719] shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-medium">Documentation</span>
          )}
        </Link>

        {/* Account Dropdown — aihive style */}
        <AccountDropdown collapsed={collapsed} onExpand={() => setCollapsed(false)} />
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════
   Account Dropdown — matches aihive's pattern
   Rounded-full button, click opens menu above
   ═══════════════════════════════════════════ */
function AccountDropdown({
  collapsed,
  onExpand,
}: {
  collapsed: boolean;
  onExpand: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button — aihive: rounded-full, gray bg, icon+name+chevron */}
      <button
        onClick={() => {
          if (collapsed) {
            onExpand();
            return;
          }
          setOpen(!open);
        }}
        className={cn(
          "flex items-center w-full rounded-full transition-colors",
          collapsed
            ? "justify-center w-10 h-10 mx-auto"
            : "h-10 px-2 gap-2",
          open ? "bg-[#F3E9E9]" : "bg-[#F3E9E9] hover:bg-[#EBDCDD]"
        )}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-[#EBDCDD] shrink-0">
          <User className="w-3.5 h-3.5 text-[#625154]" />
        </div>
        {!collapsed && (
          <>
            <span className="text-[13px] font-medium text-[#625154] truncate flex-1 text-left">
              Admin
            </span>
            <ChevronSelectorIcon className="text-[#A99699] shrink-0" />
          </>
        )}
      </button>

      {/* Dropdown Menu — opens ABOVE like aihive */}
      {open && !collapsed && (
        <div
          className="absolute left-0 right-0 rounded-xl overflow-hidden z-50"
          style={{
            bottom: "52px",
            background: "#FFFFFF",
            border: "1px solid #EBDCDD",
            boxShadow:
              "0 4px 6px -2px rgba(71, 24, 29, 0.03), 0 12px 16px -4px rgba(71, 24, 29, 0.08)",
          }}
        >
          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F3E9E9]">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#FCEDEA] border border-[#EBDCDD]">
              <User className="w-4 h-4 text-[#C5242D]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#241719] truncate">
                Admin
              </p>
              <p className="text-[11px] text-[#A99699] truncate">
                admin@aivideo.dev
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/admin/settings");
              }}
              className="flex items-center w-full h-9 px-4 text-[13px] text-[#625154] hover:bg-[#F8F5F4] transition-colors"
            >
              <Settings className="w-4 h-4 mr-3 text-[#A99699]" />
              Settings
            </button>
            <button
              onClick={() => {
                setOpen(false);
                window.open("/docs", "_blank");
              }}
              className="flex items-center w-full h-9 px-4 text-[13px] text-[#625154] hover:bg-[#F8F5F4] transition-colors"
            >
              <HelpCircle className="w-4 h-4 mr-3 text-[#A99699]" />
              Help Center
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-[#F3E9E9] py-1">
            <button
              onClick={handleLogout}
              className="flex items-center w-full h-9 px-4 text-[13px] text-[#625154] hover:bg-[#F8F5F4] transition-colors group"
            >
              <LogOut className="w-4 h-4 mr-3 text-[#A99699] group-hover:text-[#D92D20]" />
              <span className="group-hover:text-[#D92D20]">Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
