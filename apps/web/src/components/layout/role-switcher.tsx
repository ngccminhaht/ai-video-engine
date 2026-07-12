"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth/provider";
import { cn } from "@/lib/utils";

/**
 * RoleSwitcher — A dropdown button that allows admin users to switch
 * between the User view (/app) and the Admin view (/admin).
 *
 * Similar to the AI Hive "Người dùng Agent" / "Trình xây dựng" selector.
 * Only shown to users with ADMIN or SUPER_ADMIN role.
 */
export function RoleSwitcher() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only show for admin users
  if (!user || !isAdmin) return null;

  const isInAdmin = pathname.startsWith("/admin");
  const currentMode = isInAdmin ? "admin" : "user";

  const modes = [
    {
      id: "user" as const,
      label: "User View",
      sublabel: "End-user experience",
      icon: User,
      href: "/app",
    },
    {
      id: "admin" as const,
      label: "Admin Panel",
      sublabel: "System management",
      icon: Shield,
      href: "/admin",
    },
  ];

  const currentModeData = modes.find((m) => m.id === currentMode)!;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSwitch(mode: typeof modes[number]) {
    setOpen(false);
    if (mode.id !== currentMode) {
      router.push(mode.href);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2.5 h-10 px-3 pr-2.5 rounded-full border transition-all duration-150",
          "hover:shadow-sm active:scale-[0.98]",
          isInAdmin
            ? "bg-[#1a1a2e] border-[#2a2a4a] text-white hover:bg-[#252545]"
            : "bg-white border-[#E5E5E5] text-[#0A0A0A] hover:border-[#CCCCCC]"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full",
            isInAdmin ? "bg-[#3a3a5a]" : "bg-[#F0F0F0]"
          )}
        >
          <currentModeData.icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {currentModeData.label}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            open && "rotate-180",
            isInAdmin ? "text-gray-400" : "text-gray-500"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-56 rounded-xl overflow-hidden z-50 bg-white border border-[#E5E5E5] shadow-lg"
        >
          <div className="px-3 py-2 border-b border-[#F0F0F0]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999]">
              Switch View
            </p>
          </div>
          <div className="py-1">
            {modes.map((mode) => {
              const isActive = mode.id === currentMode;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleSwitch(mode)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-[#F7F7FF]"
                      : "hover:bg-[#F9F9F9]"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      isActive
                        ? "bg-[#111111] text-white"
                        : "bg-[#F0F0F0] text-[#666]"
                    )}
                  >
                    <mode.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-[#0A0A0A]" : "text-[#333]"
                      )}
                    >
                      {mode.label}
                    </p>
                    <p className="text-[11px] text-[#999]">{mode.sublabel}</p>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
