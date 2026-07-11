import {
  LayoutDashboard,
  Video,
  ListVideo,
  Boxes,
  Cpu,
  HardDrive,
  Settings,
  FileText,
  HelpCircle,
  Users,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { title: "Generate Video", href: "/admin/generate", icon: Video },
      { title: "Jobs", href: "/admin/jobs", icon: ListVideo },
    ],
  },
  {
    label: "AI Infrastructure",
    items: [
      { title: "Models", href: "/admin/models", icon: Boxes },
      { title: "Workers", href: "/admin/workers", icon: Cpu },
      { title: "Storage", href: "/admin/storage", icon: HardDrive },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Audit Logs", href: "/admin/logs", icon: ScrollText },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Flat list for backward compatibility
export const mainNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export const bottomNavItems: NavItem[] = [
  { title: "Documentation", href: "/docs", icon: FileText },
  { title: "Help & Support", href: "/docs#support", icon: HelpCircle },
];

export const siteConfig = {
  name: "AI Video Platform",
  description: "Multi-model AI video generation engine",
};
