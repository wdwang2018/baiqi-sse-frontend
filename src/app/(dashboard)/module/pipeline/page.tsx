"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Sparkles,
  Filter,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

// ============================================================
//  销售7阶段（漏斗）— 按 test001 的 SSM 七阶段销售流程逻辑与内容生成
//  数据部分参考九宫图操作：读取 Project（基础物科库）、写入 ProjectModuleData（万能结果库，带版本目录）
// ============================================================

// SSM 七阶段销售流程 & 赢率参考（IBM 原版，来自 test001）
const SSM_STAGES = [
  { n: 1, name: "关注", en: "Noticed", win: "—", color: "#6b7280",
    marker: "客户重视与IBM的关系；客户计划已审核",
    task: "调研行业/竞争对手/业务方向；建立客户关系" },
  { n: 2, name: "发现", en: "Identified", win: "10%", color: "#1a56db",
    marker: "高阶客户一次成功的行业先进理念探讨；建立商机计划",
    task: "与高阶客户对话，揭示业务举措(BI)；确定迫切行动理由" },
  { n: 3, name: "证实", en: "Validated", win: "25%", color: "#d97706",
    marker: "客户确认业务需求、购买愿景；支持IBM与关键决策者沟通",
    task: "协助客户建立购买愿景；找到关键决策者并获得支持" },
  { n: 4, name: "合格", en: "Qualified", win: "50%", color: "#7c3aed",
    marker: "关键决策负责人同意以初步解决方案为基础的进一步合作",
    task: "阐明IBM能力；进行商机评估；创建初步解决方案和价值陈述" },
  { n: 5, name: "投标", en: "Proposed", win: "75%", color: "#dc2626",
    marker: "客户关键决策者有条件批准提议的解决方案",
    task: "与客户共同开发解决方案；验证竞争策略；创建价值陈述" },
  { n: 6, name: "赢单", en: "Won", win: "100%", color: "#059669",
    marker: "已签订合同；公布实施团队并确立项目计划",
    task: "完成合同谈判与签署；确定验收标准；协调启动实施团队" },
  { n: 7, name: "完成", en: "Concluded", win: "✓", color: "#0d9488",
    marker: "客户签署完工报告并认可满足期望；创造额外客户关系资本",
    task: "跟踪业务收益；管理客户期望；交付结果调研；创造新商机" },
] as const;

// 管道健康度公式权重：发现×10% + 证实×25% + 合格×50% + 投标×75% + 赢单×100%
const WIN_RATE: Record<number, number> = { 2: 0.1, 3: 0.25, 4: 0.5, 5: 0.75, 6: 1.0 };

const STAGE_OPTIONS = [
  "1 - 关注（Noticed）",
  "2 - 发现（Identified）",
  "3 - 证实（Validated）",
  "4 - 合格（Qualified）",
  "5 - 投标（Proposed）",
  "6 - 赢单（Won）",
  "7 - 完成（Concluded）",
];

// 解析 Project.stage 字符串（形如 "3 - 证实（Validated）"）为阶段数字 1-7，未设置返回 0
const stageNum = (s: string | null | undefined): number => {
  const first = (s || "")[0] || "0";
  const n = parseInt(first, 10);
  return n >= 1 && n <= 7 ? n : 0;
};

const fmtMoney = (v: number) =>
  v > 0 ? "¥" + v.toLocaleString("zh-CN") : "—";

// ============================================================
//  Types
// ============================================================
interface ModuleRow {
  id: string;
  moduleType: string;
  version: number;
  createdAt: string;
  data: any;
}

interface ProjectRow {
  id: string;
  name: string;
  customer: string;
  industry: string | null;
  stage: string | null;
  estimatedValue: string | null;
  status: string;
  pain: string | null;
  updatedAt: string;
  moduleData: ModuleRow[];
}

// 直连 AI端 (AI服务)：云端 Render 公网 / 本地局域网兜底（运行时浏览器端调用）
const AI_BASE = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.75:8001";
const AI_SERVICE_URL = `${AI_BASE}/api/ai/nine-box`;

export default function PipelinePage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string>("");
  const [advising, setAdvising] = useState(false);
  const [advice, setAdvice] = useState<string>("");
  const [adviceError, setAdviceError] = useState<string>("");
  const [savingAdvice, setSavingAdvice] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string>("");

  // ---------- 读取项目（基础物科库）----------
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("加载项目失败 (" + res.status + ")");
      const data: ProjectRow[] = await res.json();
      setProjects(data);
      setSelectedId((prev) => prev || data[0]?.id || "");
    } catch (err) {
      console.error("[Pipeline] 加载项目失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ---------- 漏斗数据（按阶段分组）----------
  const funnel = useMemo(() => {
    const buckets: Record<number, { count: number; value: number }> = {
      1: { count: 0, value: 0 }, 2: { count: 0, value: 0 }, 3: { count: 0, value: 0 },
      4: { count: 0, value: 0 }, 5: { count: 0, value: 0 }, 6: { count: 0, value: 0 },
      7: { count: 0, value: 0 },
    };
    let unstaged = 0;
    let totalValue = 0;
    let weighted = 0;

    for (const p of projects) {
      const v = parseInt(p.estimatedValue || "0", 10) || 0;
      totalValue += v;
      const n = stageNum(p.stage);
      if (n === 0) {
        unstaged += 1;
      } else {
        buckets[n].count += 1;
        buckets[n].value += v;
        if (WIN_RATE[n]) weighted += v * WIN_RATE[n];
      }
    }
    return { buckets, unstaged, totalValue, weighted };
  }, [projects]);

  const maxCount = useMemo(() => {
    let m = 1;
    for (let i = 1; i <= 7; i++) m = Math.max(m, funnel.buckets[i].count);
    return m;
  }, [funnel]);

  // 选中项目的最新 pipeline 建议（万能结果库，按版本倒序取第一条）
  const latestAdvice = useMemo(() => {
    if (!selectedId) return "";
    const p = projects.find((x) => x.id === selectedId);
    const row = p?.moduleData
      ?.filter((m) => m.moduleType === "pipeline")
      .sort((a, b) => b.version - a.version)[0];
    return row?.data?.advice || "";
  }, [projects, selectedId]);

  // 切换项目时，自动载入该项目的已存建议
  useEffect(() => {
    setAdvice(latestAdvice);
    setAdviceError("");
    setSavedMsg("");
  }, [latestAdvice]);

  // ---------- 修改项目阶段（同步回基础物科库）----------
  const updateStage = async (pid: string, stage: string) => {
    try {
      await fetch(`/api/projects/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      await loadProjects();
    } catch (err) {
      console.error("[Pipeline] 更新阶段失败:", err);
    }
  };

  // ---------- AI 推进建议（调小虵服务，toolType=pipeline）----------
  const runAdvice = async () => {
    if (!selectedId) {
      setAdviceError("请先选择一个项目");
      return;
    }
    setAdvising(true);
    setAdviceError("");
    setSavedMsg("");
    try {
      const res = await fetch(AI_SERVICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toolType: "pipeline",
          input: {
            project_id: selectedId,
            projects: projects.map((p) => ({
              customer: p.customer,
              stage: p.stage,
              estimatedValue: p.estimatedValue,
              pain: p.pain,
            })),
          },
        }),
      });

      if (!res.ok) {
        let msg = `AI 请求失败 (${res.status})`;
        try {
          const eb = await res.json();
          if (Array.isArray(eb?.detail)) {
            msg = eb.detail
              .map((d: any) => `${d.loc?.join(".") || ""}: ${d.msg}`)
              .join("; ");
          } else if (eb?.error) {
            msg = eb.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const data = await res.json();
      // 容错解析：小虵服务返回结构可能随 toolType 不同
      let text = "";
      if (typeof data === "string") text = data;
      else if (data?.nine_grid_data) text = JSON.stringify(data.nine_grid_data, null, 2);
      else if (data?.advice) text = typeof data.advice === "string" ? data.advice : JSON.stringify(data.advice, null, 2);
      else if (data?.content) text = typeof data.content === "string" ? data.content : JSON.stringify(data.content, null, 2);
      else text = JSON.stringify(data, null, 2);

      setAdvice(text);
    } catch (err: any) {
      console.error("[Pipeline] AI 建议失败:", err);
      setAdviceError(err?.message || "AI 请求失败");
    } finally {
      setAdvising(false);
    }
  };

  // ---------- 保存建议到万能结果库（版本目录）----------
  const saveAdvice = async () => {
    if (!selectedId || !advice.trim()) return;
    setSavingAdvice(true);
    setSavedMsg("");
    try {
      const res = await fetch(`/api/projects/${selectedId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleType: "pipeline",
          data: { advice: advice, generatedAt: new Date().toISOString() },
        }),
      });
      if (!res.ok) {
        const eb = await res.json().catch(() => ({}));
        throw new Error(eb?.error || `保存失败 (${res.status})`);
      }
      const saved = await res.json();
      setSavedMsg(`已保存到万能结果库（JSONB），版本 v${saved.version}`);
      await loadProjects();
    } catch (err: any) {
      setSavedMsg("");
      setAdviceError(err?.message || "保存失败");
    } finally {
      setSavingAdvice(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedId);

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-slate-800">
            <Filter className="h-5 w-5 text-cyan-600" />
            销售7阶段（漏斗）
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            各阶段项目分布、预计业绩与 AI 推进建议
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            disabled={projects.length === 0}
          >
            {projects.length === 0 && <option value="">暂无项目</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.customer}（{p.stage || "未设置阶段"}）
              </option>
            ))}
          </select>
          <Button onClick={runAdvice} disabled={advising || !selectedId}>
            {advising ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            🤖 AI 推进建议
          </Button>
        </div>
      </div>

      {/* SSM 七阶段参考表（test001 风格：彩色 pill + 隔行底色 + 左边框卡片） */}
      <Card className="border-l-4 border-l-cyan-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📘 SSM 七阶段销售流程 & 赢率参考（IBM 原版）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#eff6ff]">
                  <th className="text-left p-2 border-b border-[#bfdbfe] text-[#1e3a8a] font-semibold">阶段</th>
                  <th className="text-left p-2 border-b border-[#bfdbfe] text-[#1e3a8a] font-semibold">英文</th>
                  <th className="text-center p-2 border-b border-[#bfdbfe] text-[#1e3a8a] font-semibold">赢率</th>
                  <th className="text-left p-2 border-b border-[#bfdbfe] text-[#1e3a8a] font-semibold">完成标志（可验证结果）</th>
                  <th className="text-left p-2 border-b border-[#bfdbfe] text-[#1e3a8a] font-semibold">核心任务</th>
                </tr>
              </thead>
              <tbody>
                {SSM_STAGES.map((s, i) => (
                  <tr
                    key={s.n}
                    className={
                      s.n === 7
                        ? "bg-[#f0fdfa]"
                        : i % 2 === 1 && s.n !== 6
                          ? "bg-[#f9fafb]"
                          : ""
                    }
                  >
                    <td className="p-2">
                      <span
                        className="text-white rounded font-bold px-2 py-0.5 text-xs"
                        style={{ background: s.color }}
                      >
                        {s.n}-{s.name}
                      </span>
                    </td>
                    <td className="p-2 text-gray-500">{s.en}</td>
                    <td className="p-2 text-center font-bold" style={{ color: s.color }}>{s.win}</td>
                    <td className="p-2 text-gray-700">{s.marker}</td>
                    <td className="p-2 text-gray-700">{s.task}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            💡 <strong>管道健康度公式（IBM 原版）：</strong>
            发现×10% + 证实×25% + 合格×50% + 投标×75% + 赢单×100% = 预估营收。
            管道总量建议为销售指标的 <strong>3-4 倍</strong>。
          </div>
        </CardContent>
      </Card>

      {/* 漏斗图 + 汇总（test001 风格：居中梯形漏斗） */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> 阶段分布漏斗
          </CardTitle>
          <CardDescription>
            基于项目基础物科库中的「销售阶段」实时统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> 加载中...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="text-3xl mb-2">📭</div>
              暂无项目，请先在「九宫图生成器」中创建并保存项目
            </div>
          ) : (
            <>
              {/* 汇总指标 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold">{projects.length}</div>
                  <div className="text-xs text-muted-foreground">项目总数</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold">{fmtMoney(funnel.totalValue)}</div>
                  <div className="text-xs text-muted-foreground">管道总额</div>
                </div>
                <div className="rounded-lg bg-cyan-50 p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-700">{fmtMoney(Math.round(funnel.weighted))}</div>
                  <div className="text-xs text-muted-foreground">加权预估营收</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold">{funnel.unstaged}</div>
                  <div className="text-xs text-muted-foreground">未设阶段</div>
                </div>
              </div>

              {/* 居中漏斗 */}
              <div className="flex flex-col items-center gap-1.5 py-2">
                {SSM_STAGES.map((s) => {
                  const b = funnel.buckets[s.n];
                  const w = Math.max((b.count / maxCount) * 100, b.count > 0 ? 30 : 16);
                  return (
                    <div
                      key={s.n}
                      className="h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold shadow-sm transition-all truncate px-3"
                      style={{
                        width: `${w}%`,
                        background: s.color,
                        opacity: b.count > 0 ? 0.92 : 0.45,
                      }}
                      title={
                        b.count > 0
                          ? `${s.n}-${s.name}：${b.count} 个项目 · ${fmtMoney(b.value)}`
                          : `${s.n}-${s.name}`
                      }
                    >
                      {b.count > 0
                        ? `${s.n}-${s.name}　${b.count} 个 · ${fmtMoney(b.value)}`
                        : `${s.n}-${s.name}　—`}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 阶段卡片：可修改阶段（test001 风格：顶部色条 + 数量徽章） */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">阶段明细（点击可更新项目阶段）</CardTitle>
          <CardDescription>修改会同步回项目基础物科库，影响上方漏斗统计</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> 加载中...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => {
                const n = stageNum(p.stage);
                const color = n >= 1 && n <= 7 ? SSM_STAGES[n - 1].color : "#9ca3af";
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border bg-white p-3"
                    style={{ borderTop: `3px solid ${color}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium truncate">{p.customer}</div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                        style={{ background: color }}
                      >
                        {p.stage || "未设置"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground text-center py-1">
                      预计金额：{fmtMoney(parseInt(p.estimatedValue || "0", 10) || 0)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="shrink-0">阶段</span>
                      <select
                        value={p.stage || ""}
                        onChange={(e) => updateStage(p.id, e.target.value)}
                        className="h-8 flex-1 rounded border bg-background px-2 text-sm"
                      >
                        <option value="">未设置</option>
                        {STAGE_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI 推进建议（test001 风格：左边框卡片） */}
      <Card className="border-l-4 border-l-cyan-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-600" />
            🤖 AI 推进建议（针对选中项目）
          </CardTitle>
          <CardDescription>
            调用 AI 决策服务，结合项目阶段与痛点给出推进策略；可保存到万能结果库（带版本目录）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedProject ? (
            <div className="text-center py-6 text-muted-foreground text-sm">请先在右上角选择一个项目</div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Button onClick={runAdvice} disabled={advising}>
                  {advising ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  {advising ? "AI 分析中..." : "生成推进建议"}
                </Button>
                <Button variant="outline" onClick={saveAdvice} disabled={savingAdvice || !advice.trim()}>
                  {savingAdvice ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  保存到万能结果库
                </Button>
                {savedMsg && (
                  <span className="flex items-center text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> {savedMsg}
                  </span>
                )}
              </div>

              {adviceError && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                  <AlertCircle className="h-4 w-4" /> {adviceError}
                </div>
              )}

              {advice ? (
                <pre className="whitespace-pre-wrap bg-gray-50 border rounded-lg p-4 text-sm leading-relaxed max-h-96 overflow-auto">
                  {advice}
                </pre>
              ) : (
                !adviceError && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    点击「生成推进建议」获取 AI 分析
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
