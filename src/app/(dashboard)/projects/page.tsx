"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SSM_STAGE_OPTIONS, stageNum } from "@/lib/constants";

interface ProjectRow {
  id: string;
  name: string;
  customer: string;
  industry?: string | null;
  stage?: string | null;
  estimatedValue?: string | null;
  updatedAt: string;
}

const STAGE_COLORS = [
  "#9ca3af", "#6b7280", "#0891b2", "#0d9488",
  "#7c3aed", "#16a34a", "#dc2626", "#475569",
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createProject = async () => {
    if (!customer.trim()) return;
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || `${customer.trim()} - 项目`,
        customer: customer.trim(),
      }),
    });
    setCreating(false);
    if (res.ok) {
      const p = await res.json();
      router.push(`/projects/${p.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Filter className="h-5 w-5 text-cyan-600" /> 项目汇总库
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          所有项目信息（客户 / 业务 / 痛点 / 我方方案 / 互动）的单一事实源，销售工具共享
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新建项目</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-xs text-muted-foreground">客户名称 *</label>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="如：门头沟同仁医院"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-xs text-muted-foreground">项目名称</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="留空则自动生成"
              />
            </div>
            <Button onClick={createProject} disabled={creating || !customer.trim()}>
              {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              创建并进入
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">项目列表（{projects.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 加载中...
            </div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              暂无项目，先在上方创建，或在「九宫图生成器」中保存项目
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const n = stageNum(p.stage);
                const color = n >= 1 && n <= 7 ? STAGE_COLORS[n] : STAGE_COLORS[0];
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:border-cyan-500 hover:bg-accent">
                      <div className="mb-1 truncate font-medium">{p.customer}</div>
                      <div className="mb-2 truncate text-xs text-muted-foreground">{p.name}</div>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          style={{ color, borderColor: color }}
                        >
                          {p.stage || "未设置阶段"}
                        </Badge>
                        {p.estimatedValue && (
                          <span className="text-xs text-muted-foreground">
                            {p.estimatedValue}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        阶段选项：{SSM_STAGE_OPTIONS.join(" · ")}
      </p>
    </div>
  );
}
