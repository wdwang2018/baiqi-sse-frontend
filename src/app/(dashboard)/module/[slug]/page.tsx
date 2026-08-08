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

// review 模块 logs 的结构化物件（与后端 ReviewInput.logs: array<LogRow> 对齐）
interface LogRow {
  date: string;
  action_type: string;
  content: string;
}

// 根据字段 key 从项目对象取值（用于「从项目载入」自动填充）
function autofillValue(field: ModuleField, p: ProjectRow): string {
  switch (field.key) {
    case "customer_name":
    case "customer":
      return p.customer ?? "";
    case "core_pain":
    case "base_pain":
      return p.pain ?? "";
    case "our_product":
      return p.products ?? "";
    case "industry":
      return p.industry ?? "";
    case "name":
    case "project_name":
      return p.name ?? "";
    case "stage":
      return p.stage ?? "";
    default:
      return "";
  }
}

// 将表单值组装为后端工具专属的 Input（数组按行拆分、整数转换、空可选字段置 null）
function buildInput(config: ModuleConfig, values: Record<string, string>, logRows: LogRow[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of config.fields) {
    if (f.type === "loglist") {
      out[f.key] = logRows;
      continue;
    }
    let v: any = values[f.key];
    if (f.array) {
      v = (v || "")
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);
    } else if (f.integer) {
      const n = parseInt(v, 10);
      v = isNaN(n) ? 0 : n;
    } else {
      v = v == null || v === "" ? null : v;
    }
    out[f.key] = v;
  }
  return out;
}

function humanize(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// 通用结构化结果渲染：字符串走 Markdown，数组走列表，其余走 JSON
function StructuredResult({ data }: { data: any }) {
  if (!data || typeof data !== "object") {
    return (
      <pre className="text-xs bg-gray-50 border rounded-lg p-4 whitespace-pre-wrap">
        {String(data)}
      </pre>
    );
  }
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">{humanize(k)}</h3>
          {typeof v === "string" ? (
            <div className="text-sm leading-relaxed">
              <Markdown content={v} />
            </div>
          ) : Array.isArray(v) ? (
            v.length === 0 ? (
              <p className="text-xs text-muted-foreground">（无）</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                {v.map((item, i) =>
                  typeof item === "string" ? (
                    <li key={i}>
                      <Markdown content={item} />
                    </li>
                  ) : (
                    <li key={i}>
                      <pre className="text-xs bg-gray-50 border rounded p-2 whitespace-pre-wrap">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </li>
                  ),
                )}
              </ul>
            )
          ) : (
            <pre className="text-xs bg-gray-50 border rounded-lg p-4 whitespace-pre-wrap">
              {JSON.stringify(v, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

// review 模块 logs 的结构化多行编辑器（每条：日期 / 动作类型 / 内容）
function LogRowEditor({ rows, onChange }: { rows: LogRow[]; onChange: (r: LogRow[]) => void }) {
  const update = (i: number, patch: Partial<LogRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { date: "", action_type: "", content: "" }]);
  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">暂无日志，点击下方「添加一行」开始记录。</p>
      )}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[88px_108px_1fr_auto] gap-2 items-start border rounded-md p-2">
          <Input placeholder="日期" value={r.date} onChange={(e) => update(i, { date: e.target.value })} />
          <Input placeholder="动作类型" value={r.action_type} onChange={(e) => update(i, { action_type: e.target.value })} />
          <Input placeholder="内容" value={r.content} onChange={(e) => update(i, { content: e.target.value })} />
          <Button variant="ghost" size="sm" type="button" onClick={() => remove(i)} aria-label="删除">✕</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" type="button" onClick={add}>＋ 添加一行</Button>
    </div>
  );
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
            当前阶段已上线的「表单 → AI 端具体工具路由」模块请见左侧导航。
          </p>
          <div className="flex gap-3 pt-2">
            <Button asChild variant="default">
              <a href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> 返回项目总览
              </a>
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
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // review 模块的 logs 为结构化多行（array<LogRow>）
  const [logRows, setLogRows] = useState<LogRow[]>([]);

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

  const missing = config.fields.find((f) => {
    if (!f.required) return false;
    if (f.type === "loglist") return logRows.length === 0;
    return !values[f.key]?.trim();
  });

  const run = async () => {
    if (missing) {
      setError(`请填写必填项：${missing.label}`);
      return;
    }
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      // 与九宫格 / 项目汇总库(classify) 完全一致：前端**直连 AI 端具体工具路由**，
      // 携带 NextAuth Cookie；请求体为该工具专属的结构化 Input（字段见 registry），
      // 由 AI 端持 DEEPSEEK_API_KEY 调大模型并返回结构化结果。母舰不持 Key、不直连大模型。
      const body = buildInput(config, values, logRows);
      const AI_BASE = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.75:8001";
      const res = await fetch(`${AI_BASE}/api/ai/${config.route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 携带 NextAuth Cookie，AI 端用 NEXTAUTH_SECRET 解密鉴权（与九宫格同源）
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errBody: any = null;
        try {
          errBody = await res.json();
        } catch {
          /* ignore */
        }
        const msg =
          errBody?.detail || errBody?.error || `AI 请求失败 (${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "生成失败");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    try {
      const text =
        result == null
          ? ""
          : typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(text);
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
                {f.type === "loglist" ? (
                  <LogRowEditor rows={logRows} onChange={setLogRows} />
                ) : f.type === "textarea" ? (
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
            {result && (
              <div className="max-h-[70vh] overflow-auto">
                {typeof result === "string" ? (
                  <Markdown content={result} />
                ) : (
                  <StructuredResult data={result} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
