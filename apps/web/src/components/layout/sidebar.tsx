"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navGroups, bottomNavItems, siteConfig } from "@/config/site";
import { Video, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen transition-all duration-200 max-md:hidden",
        collapsed ? "w-[72px]" : "w-[252px]"
      )}
      style={{ background: "var(--sidebar)" }}
    >
      {/* Logo & Brand */}
      <div
        className="flex items-center gap-3 px-5 h-16 border-b"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: "var(--sidebar-active-bg)" }}
        >
          <Video className="w-4 h-4" style={{ color: "var(--sidebar-active-text)" }} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span
              className="text-sm font-semibold truncate block"
              style={{ color: "var(--sidebar-text)" }}
            >
              {siteConfig.name}
            </span>
            <span
              className="text-[11px] truncate block"
              style={{ color: "var(--sidebar-muted)" }}
            >
              Admin Console
            </span>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {/* Group Label */}
            {!collapsed && (
              <p
                className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-muted)" }}
              >
                {group.label}
              </p>
            )}

            {/* Group Items */}
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                      collapsed && "justify-center px-0"
                    )}
                    style={
                      isActive
                        ? {
                            background: "var(--sidebar-active-bg)",
                            color: "var(--sidebar-active-text)",
                          }
                        : {
                            color: "var(--sidebar-text)",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "var(--sidebar-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <item.icon
                      className="w-[18px] h-[18px] shrink-0"
                      style={
                        isActive
                          ? { color: "var(--sidebar-active-text)" }
                          : { color: "var(--sidebar-text)" }
                      }
                    />
                    {!collapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div
        className="px-3 py-4 space-y-0.5 border-t"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        {bottomNavItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            title={collapsed ? item.title : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
              collapsed && "justify-center px-0"
            )}
            style={{ color: "var(--sidebar-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--sidebar-hover)";
              e.currentTarget.style.color = "var(--sidebar-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--sidebar-muted)";
            }}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Link>
        ))}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 w-full",
            collapsed && "justify-center px-0"
          )}
          style={{ color: "var(--sidebar-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--sidebar-hover)";
            e.currentTarget.style.color = "var(--sidebar-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--sidebar-muted)";
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
