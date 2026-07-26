import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { NAV_SECTIONS } from "@/lib/constants";

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
  MessageCircle,
  Network,
  FlaskConical,
  Brain,
  BookOpen,
  Settings,
  BarChart3,
};

const stats = [
  { label: "客户数", value: "0", icon: Users },
  { label: "活跃商机", value: "0", icon: Target },
  { label: "AI 调用", value: "0 / 1000", icon: Zap },
  { label: "本月转化", value: "—", icon: TrendingUp },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">项目总览</h2>
        <p className="text-sm text-muted-foreground">
          基于 SSM 方法论的 AI 辅助销售管理平台
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="rounded-lg bg-accent p-2.5">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{section.title}</h3>
            <Badge variant="secondary">{section.items.length} 项</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.items.map((item) => {
              const Icon = iconMap[item.icon];
              const isBuilt = item.route !== `/module/${item.id}`;
              return (
                <Link key={item.id} href={item.route} prefetch>
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        {Icon && <Icon className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.badge && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: item.badgeColor || "#f59e0b" }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isBuilt ? "已上线" : "建设中"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
