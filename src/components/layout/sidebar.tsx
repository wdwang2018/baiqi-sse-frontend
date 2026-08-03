"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  Filter,
  Sparkles,
  ListChecks,
  LayoutGrid,
  Gem,
  Telescope,
  Swords,
  TrendingUp,
  Link as LinkIcon,
  Users,
  Coins,
  Puzzle,
  MessageCircle,
  Network,
  FlaskConical,
  Brain,
  BookOpen,
  Settings,
  BarChart3,
  Scale,
  Database,
  type LucideIcon,
} from "lucide-react";
import { NAV_SECTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const iconMap: Record<string, LucideIcon> = {
  Home,
  Filter,
  Sparkles,
  ListChecks,
  LayoutGrid,
  Gem,
  Telescope,
  Swords,
  TrendingUp,
  Link: LinkIcon,
  Users,
  Coins,
  Puzzle,
  Scale,
  MessageCircle,
  Network,
  FlaskConical,
  Brain,
  BookOpen,
  Settings,
  BarChart3,
  Database,
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  // 仅系统管理员（dataScope=ALL）可见管理类入口；其它租户/主管一律不可见
  const isSuperAdmin = session?.user?.dataScope === "ALL";

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <span className="text-xl font-bold tracking-tight">白起SSE</span>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-3">
          {NAV_SECTIONS.map((section) => {
            // 过滤掉当前用户无权看到的 adminOnly 项
            const visibleItems = section.items.filter(
              (it) => !it.adminOnly || isSuperAdmin,
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="mb-3 last:mb-0">
                <div className="mb-1.5 px-3 text-xs font-medium text-muted-foreground">
                  {section.title}
                </div>
                {visibleItems.map((item) => {
                  const Icon = iconMap[item.icon];
                  const active = pathname === item.route;
                  return (
                    <Link key={item.id} href={item.route} prefetch>
                      <div
                        className={cn(
                          "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                          active && "bg-accent font-medium",
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span
                            className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: item.badgeColor || "#f59e0b" }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t px-6 py-4 text-xs text-muted-foreground">
        白起 SSE v2.0 · SSM 十大工具
      </div>
    </aside>
  );
}
