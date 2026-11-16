import {
  BarChart3,
  Bot,
  CalendarDays,
  Clapperboard,
  Cpu,
  FileText,
  FolderOpen,
  Image,
  LayoutGrid,
  Scissors,
  Search,
  Settings,
  Tags,
  Youtube,
  type LucideIcon,
} from "lucide-react";

/** live = works end to end; setup = works but needs configuration; planned = not built yet (honestly labelled). */
export type NavStatus = "live" | "setup" | "planned";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  status: NavStatus;
  stage?: number;
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/overview", label: "Overview", icon: LayoutGrid, status: "live" },
      { to: "/manager", label: "AI Manager", icon: Bot, status: "planned", stage: 4 },
    ],
  },
  {
    label: "Create",
    items: [
      { to: "/scripts", label: "Scripts", icon: FileText, status: "live" },
      { to: "/seo", label: "SEO Studio", icon: Tags, status: "live" },
      { to: "/thumbnails", label: "Thumbnails", icon: Image, status: "planned", stage: 3 },
      { to: "/video", label: "Video Studio", icon: Clapperboard, status: "planned", stage: 5 },
      { to: "/shorts", label: "Shorts Studio", icon: Scissors, status: "planned", stage: 5 },
    ],
  },
  {
    label: "Grow",
    items: [
      { to: "/channels", label: "YouTube Channels", icon: Youtube, status: "setup", stage: 2 },
      { to: "/analytics", label: "Analytics", icon: BarChart3, status: "setup", stage: 2 },
      { to: "/competitors", label: "Competitor Research", icon: Search, status: "planned", stage: 2 },
      { to: "/calendar", label: "Content Calendar", icon: CalendarDays, status: "planned", stage: 3 },
    ],
  },
  {
    label: "Library",
    items: [{ to: "/media", label: "Media Library", icon: FolderOpen, status: "planned", stage: 5 }],
  },
];

export const NAV_FOOTER: NavItem[] = [
  { to: "/providers", label: "AI Providers", icon: Cpu, status: "live" },
  { to: "/settings", label: "Settings", icon: Settings, status: "live" },
];
