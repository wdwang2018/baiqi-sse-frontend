import Link from "next/link";
import { notFound } from "next/navigation";
import { Hammer, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { findNavItem } from "@/lib/constants";

export default function ModulePlaceholderPage({
  params,
}: {
  params: { slug: string };
}) {
  const item = findNavItem(params.slug);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <Hammer className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{item.name}</CardTitle>
              <CardDescription className="mt-1">
                白起 SSE · 销售辅助模块
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {item.badge && (
              <Badge
                style={{ backgroundColor: item.badgeColor || "#f59e0b" }}
                className="text-white"
              >
                {item.badge}
              </Badge>
            )}
            <Badge variant="outline">建设中</Badge>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            该模块已纳入「白起 SSE · 十大销售辅助工具」规划，正在开发中。
            当前阶段仅 <span className="font-medium text-foreground">九宫图生成器</span>{" "}
            已完整上线。本页面作为占位，确保菜单可正常导航、不出现 404。
          </p>

          <div className="flex gap-3 pt-2">
            <Button asChild variant="default">
              <Link href="/nine-grid">
                <ArrowLeft className="mr-2 h-4 w-4" />
                前往九宫图生成器
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">返回项目总览</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
