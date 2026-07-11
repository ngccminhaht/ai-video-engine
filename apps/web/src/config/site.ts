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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Generate Video", href: "/generate", icon: Video },
  { title: "Jobs", href: "/jobs", icon: ListVideo },
  { title: "Models", href: "/models", icon: Boxes },
  { title: "Workers", href: "/workers", icon: Cpu },
  { title: "Storage", href: "/storage", icon: HardDrive },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const bottomNavItems: NavItem[] = [
  { title: "Documentation", href: "#", icon: FileText },
  { title: "Help & Support", href: "#", icon: HelpCircle },
];

export const siteConfig = {
  name: "AI Video Platform",
  description: "Multi-model AI video generation engine",
};
