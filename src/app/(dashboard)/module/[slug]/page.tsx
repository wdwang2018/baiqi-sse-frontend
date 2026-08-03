"use client";

import { useState, useEffect, useCallback } from "react";
import { notFound } from "next/navigation";
import { Hammer, ArrowLeft, Sparkles, Loader2, Copy, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { findNavItem } from "@/lib/constants";
import { getModuleConfig, type ModuleConfig, type ModuleField } from "@/lib/modules/registry";
import { Markdown } from "@/components/markdown";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gem: (p) => <span {...p}>💎</span>,
  Telescope: (p) => <span {...p}>🔭</span>,
  Swords: (p) => <span {...p}>⚔️</span>,
  Scale: (p) => <span {...p}>⚖️</span>,
  Puzzle: (p) => <span {...p}>🧩</span>,
  Users: (p) => <span {...p}>👥</span>,
  Link: (p) => <span {...p}>🔗</span>,
  TrendingUp: (p) => <span {...p}>📈</span>,
  Sparkles: (p) => <span {...p}>✨</span>,
  Hammer: Hammer,
};

interface ProjectRow {
  id: string;
  name: string;
  customer: string;
  industry: string | null;
  stage: string | null;
  pain: string | null;
  products: string | null;
}

// 根据字段 key 从项目对象取值（用于「从项目载入」自动填充）
function autofillValue(field: ModuleField, p: ProjectRow): string {
  switch (field.key) {
    case "pain":
      return p.pain ?? "";
    case "product":
    case "capability":
      return p.products ?? "";
    case "industry":
      return p.industry ?? "";
    case "customer":
      return p.customer ?? "";
    case "name":
    case "project":
      return p.name ?? "";
    case "stage":
      return p.stage ?? "";
    case "current":
      return `客户：${p.customer || ""}，行业：${p.industry || ""}，阶段：${p.stage || ""}`;
    default:
      return "";
  }
}

export default function ModulePage({ params }: { params: { slug: string } }) {
  const navItem = findNavItem(params.slug);
  const config = getModuleConfig(params.slug);

  // 未注册 → 占位页
  if (!config) {
    if (!navItem) notFound();
    return <Placeholder item={navItem} />;
  }

  return <ModuleRunner config={config} />;
}

function Placeholder({ item }: { item: NonNullable<ReturnType<typeof findNavItem>> }) {
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
              <CardDescription className="mt-1">白起 SSE · 销售辅助模块</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {item.badge && (
              <Badge style={{ backgroundColor: item.badgeColor || "#f59e0b" }} className="text-white">
                {item.badge}
              </Badge>
            )}
            <Badge variant="outline">建设中</Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            该模块已纳入「白起 SSE · 十大销售辅助工具」规划，正在开发中。
            当前阶段仅 <span className="font-medium text-foreground">九宫图生成器</span> 已完整上线。
          </p>
          <div className="flex gap-3 pt-2">
            <Button asChild variant="default">
              <a href="/nine-grid">
                <ArrowLeft className="mr-2 h-4 w-4" /> 前往九宫图生成器
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/">返回项目总览</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleRunner({ config }: { config: ModuleConfig }) {
  const Icon = iconMap[config.icon] || Sparkles;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((f) => [f.key, ""])),
  );
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch {
      /* 忽略：无项目时不影响手动填写 */
    }
  }, []);

  useEffect(() => {
    if (config.projectContext) loadProjects();
  }, [config.projectContext, loadProjects]);

  const onProjectChange = (id: string) => {
    setSelectedProject(id);
    if (!id) return;
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setValues((prev) => {
      const next = { ...prev };
      config.fields.forEach((f) => {
        const v = autofillValue(f, p);
        if (v) next[f.key] = v;
      });
      return next;
    });
  };

  const setValue = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const missing = config.fields.find((f) => f.required && !values[f.key]?.trim());

  const run = async () => {
    if (missing) {
      setError(`请填写必填项：${missing.label}`);
      return;
    }
    setSubmitting(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolType: config.slug, input: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `请求失败 (${res.status})`);
      setResult(data?.content || "");
    } catch (e: any) {
      setError(e?.message || "生成失败");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-slate-800">
            <Icon className="h-5 w-5 text-primary" />
            {config.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>
        <Button onClick={run} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {submitting ? "AI 生成中…" : "🤖 生成"}
        </Button>
      </div>

      {config.intro && (
        <div className="text-xs text-muted-foreground bg-accent/50 border rounded-md px-3 py-2">
          💡 {config.intro}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 输入区 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">输入信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.projectContext && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">从项目汇总库载入</Label>
                <select
                  value={selectedProject}
                  onChange={(e) => onProjectChange(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">— 手动填写 / 不选 —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.customer || p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {config.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>
                  {f.label}
                  {f.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.key}
                    rows={f.rows || 3}
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  />
                ) : f.type === "select" ? (
                  <select
                    id={f.key}
                    value={values[f.key]}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">— 请选择 —</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={f.key}
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  />
                )}
                {f.helpText && (
                  <p className="text-xs text-muted-foreground">{f.helpText}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 输出区 */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI 生成结果
            </CardTitle>
            {result && (
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "已复制" : "复制"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                ⚠️ {error}
              </div>
            )}
            {!result && !error && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                填写左侧信息后点击「生成」，结果将显示在此处
              </div>
            )}
            {result && config.output === "markdown" && (
              <div className="max-h-[70vh] overflow-auto">
                <Markdown content={result} />
              </div>
            )}
            {result && config.output !== "markdown" && (
              <pre className="whitespace-pre-wrap bg-gray-50 border rounded-lg p-4 text-sm leading-relaxed max-h-[70vh] overflow-auto">
                {result}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
