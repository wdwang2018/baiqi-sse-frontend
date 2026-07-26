"use client";

import { useState, useCallback } from "react";
import { buildProjectSnapshot } from "@/lib/project-snapshot";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Save,
  Copy,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  History,
  Plus,
  Trash2,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

// ============================================================
//  Constants — migrated from MVP
// ============================================================

const NINE_LABELS = [
  "业务原因",
  "业务结果",
  "成功标准",
  "现有能力",
  "业务痛点（核心）",
  "能力差距",
  "我方方案",
  "独特价值",
  "下一步行动",
];

// ---- 导出辅助（零依赖，纯浏览器 Blob 下载）----
const escapeHtml = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const INDUSTRIES = [
  "制造业",
  "金融/银行",
  "政府/公共事业",
  "医疗/医药",
  "零售/消费品",
  "能源/化工",
  "交通/物流",
  "互联网/科技",
  "教育",
  "其他",
];

const TITLES = [
  "CEO/总裁",
  "CIO/信息化总监",
  "CFO/财务总监",
  "COO/运营总监",
  "业务总监/VP",
  "IT部门经理",
  "采购经理",
  "项目负责人",
  "技术负责人",
  "其他",
];

const STAGES = [
  "1 - 关注（Noticed）",
  "2 - 发现（Identified）",
  "3 - 证实（Validated）",
  "4 - 合格（Qualified）",
  "5 - 投标（Proposed）",
  "6 - 赢单（Won）",
  "7 - 完成（Concluded）",
];

// ============================================================
//  Types
// ============================================================

type StepNum = 1 | 2 | 3 | 4;

interface NineBlock {
  title: string;
  talking_point: string;
}

interface NineGridData {
  block_1: NineBlock;
  block_2: NineBlock;
  block_3: NineBlock;
  block_4: NineBlock;
  block_5: NineBlock;
  block_6: NineBlock;
  block_7: NineBlock;
  block_8: NineBlock;
  block_9: NineBlock;
}

interface SavedGrid {
  id: string;
  title: string;
  gridData: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; industry: string | null };
}

// 单个保存版本（万能结果库中的一行）
interface VersionItem {
  id: string;
  moduleType: string;
  version: number;
  createdAt: string;
  data: NineGridData;
}
interface ProjectSummary {
  id: string;
  name: string;
  customer: string;
  industry: string | null;
  status: string;
  updatedAt: string;
  moduleData: VersionItem[];
}

// 完整项目（含模块 JSONB 数据）
interface ProjectDetail {
  id: string;
  name: string;
  customer: string;
  industry: string | null;
  contact: string | null;
  contactTitle: string | null;
  stage: string | null;
  estimatedValue: string | null;
  pain: string | null;
  products: string | null;
  initiatives: string | null;
  competitors: string | null;
  extra: string | null;
  moduleData: { id: string; moduleType: string; version: number; createdAt: string; data: NineGridData }[];
}

// ============================================================
//  Main Page Component
// ============================================================

export default function NineGridPage() {
  const [view, setView] = useState<"wizard" | "history">("wizard");
  const [step, setStep] = useState<StepNum>(1);
  const [formData, setFormData] = useState({
    customer: "",
    industry: "",
    contact: "",
    contactTitle: "",
    stage: "1",
    estimatedValue: "",
    pain: "",
    products: "",
    initiatives: "",
    competitors: "",
    extra: "",
  });
  const [gridData, setGridData] = useState<NineGridData | null>(null);
  const [citations, setCitations] = useState<string[]>([]);   // RAG 知识溯源（PDF 引用）
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [editCellIdx, setEditCellIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---- 项目闭环（终极架构：基础物科库 + 万能结果库 JSONB）----
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  // 历史版本目录：待确认删除的版本 id、正在删除的版本 id
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- form helpers ----
  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep1 = () => {
    if (!formData.customer.trim()) return "请填写客户名称";
    if (!formData.industry) return "请选择行业";
    if (!formData.contact.trim()) return "请填写联系人姓名";
    if (!formData.contactTitle) return "请选择联系人职务";
    return "";
  };

  const validateStep2 = () => {
    if (!formData.pain.trim()) return "请填写核心业务痛点";
    if (!formData.products.trim()) return "请填写我方产品/解决方案";
    return "";
  };

  // ---- step navigation ----
  const goNext = (fromStep: StepNum) => {
    const err = fromStep === 1 ? validateStep1() : fromStep === 2 ? validateStep2() : "";
    if (err) {
      setGenError(err);
      return;
    }
    setGenError("");
    setStep((fromStep + 1) as StepNum);
  };

  const goBack = (fromStep: StepNum) => {
    setGenError("");
    setStep((fromStep - 1) as StepNum);
  };

  const resetWizard = () => {
    setStep(1);
    setGridData(null);
    setGenError("");
    setSavedMsg("");
    setProjectId(null);
    setFormData({
      customer: "",
      industry: "",
      contact: "",
      contactTitle: "",
      stage: "1",
      estimatedValue: "",
      pain: "",
      products: "",
      initiatives: "",
      competitors: "",
      extra: "",
    });
  };

  // 确保项目存在（基础物科库），返回 projectId
  const ensureProject = async (): Promise<string> => {
    if (projectId) return projectId;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${formData.customer} - 九宫图`,
        customer: formData.customer,
        industry: formData.industry,
        contact: formData.contact,
        contactTitle: formData.contactTitle,
        stage: formData.stage,
        estimatedValue: formData.estimatedValue,
        pain: formData.pain,
        products: formData.products,
        initiatives: formData.initiatives,
        competitors: formData.competitors,
        extra: formData.extra,
      }),
    });
    if (!res.ok) throw new Error("创建项目失败");
      const p = await res.json();
      setProjectId(p.id);
      return p.id;
  };

  // 把当前表单（含已修改的痛点/输入）同步回 Project 基础物科库，
  // 避免「同一案例下改了痛点，但项目记录还是旧值」的问题。
  const syncProject = async (pid: string) => {
    try {
      await fetch(`/api/projects/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.customer} - 九宫图`,
          customer: formData.customer,
          industry: formData.industry,
          contact: formData.contact,
          contactTitle: formData.contactTitle,
          stage: formData.stage,
          estimatedValue: formData.estimatedValue,
          pain: formData.pain,
          products: formData.products,
          initiatives: formData.initiatives,
          competitors: formData.competitors,
          extra: formData.extra,
        }),
      });
    } catch {
      // 同步失败不影响本次生成/保存
    }
  };

  // 从生成结果返回修改痛点：清空上一版九宫格，强制用户重新调 LLM，
  // 否则旧结果会残留、且不会再次 call LLM。
  const goEditPain = () => {
    setGridData(null);
    setCitations([]);
    setGenError("");
    setSavedMsg("");
    setEditCellIdx(null);
    setEditText("");
    goBack(3);
  };

  // ---- AI generation ----
  const handleGenerate = async () => {
    console.log("[九宫图] handleGenerate 被调用");

    if (!formData.pain.trim() || !formData.products.trim()) {
      setGenError("请先填写核心业务痛点和产品方案");
      return;
    }

    setGenerating(true);
    setGenError("");
    setSavedMsg("");   // 清掉上一次保存提示，避免重生成后残留「已保存 vN」误导

    // 直连 AI端 (AI服务)：云端 Render 公网 / 本地局域网兜底
    const AI_BASE = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.75:8001";
    const AI_SERVICE_URL = `${AI_BASE}/api/ai/nine-box`;

    try {
      // ① 先确保项目（基础物科库）存在，拿到 project_id
      const pid = await ensureProject();
      // 同步最新输入（痛点/方案等）到 Project 基础物科库，保证记录不滞留旧值
      await syncProject(pid);
      console.log("[九宫图] 项目已就绪:", pid);

      console.log("[九宫图] 开始请求:", AI_SERVICE_URL);

      const res = await fetch(AI_SERVICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",   // 携带 NextAuth Cookie，Python 端用 NEXTAUTH_SECRET 解密鉴权
        body: JSON.stringify({
          toolType: "nine-grid",
          // ② 小虵的真实合同：project_id 必须在 input 内部（NineGridInnerInput.project_id 必填）
          // 统一从「项目汇总库」取数：buildProjectSnapshot 组装的扁平对象与 nine-box 契约一致
          input: buildProjectSnapshot({ ...formData, id: pid }),
        }),
      });

      console.log("[九宫图] 响应状态:", res.status);

      if (!res.ok) {
        let errBody: any = null;
        try { errBody = await res.json(); } catch { /* ignore */ }
        let msg = `AI 请求失败 (${res.status})`;
        if (errBody) {
          // FastAPI 422 返回 { detail: [ { loc, msg, type }, ... ] }
          if (Array.isArray(errBody.detail)) {
            msg = "字段校验失败 → " + errBody.detail
              .map((d: any) => `${Array.isArray(d.loc) ? d.loc.join(".") : d.loc}: ${d.msg}`)
              .join("; ");
          } else if (typeof errBody.detail === "string") {
            msg = errBody.detail;
          } else if (errBody.error) {
            msg = errBody.error;
          }
          console.error("[九宫图] 后端错误详情:", JSON.stringify(errBody, null, 2));
        }
        throw new Error(msg);
      }

      const data = await res.json();
      console.log("[九宫图] 收到数据，keys:", Object.keys(data));

      // ---- 解析 AI 返回，兼容多种格式 ----
      let parsed: NineGridData | null = null;
      let citations: string[] = [];

      // 格式 A（小虵真实返回）：外层 nine_grid_data 包裹 { block_1..9, citations } + usage
      if (data.nine_grid_data && (data.nine_grid_data.block_1 || data.nine_grid_data.block_5)) {
        console.log("[九宫图] 检测到 nine_grid_data 包裹格式（小虵母舰）");
        parsed = data.nine_grid_data as NineGridData;
        if (Array.isArray(data.nine_grid_data.citations)) {
          citations = data.nine_grid_data.citations as string[];
        }
        if (data.usage) console.log("[九宫图] Token 消耗:", JSON.stringify(data.usage));
      }
      // 格式 B：Python 服务直接返回九宫图 JSON（含 block_1~block_9）
      else if (data.block_1 || data.block_5) {
        console.log("[九宫图] 检测到直接格式（block_1~block_9）");
        parsed = data as NineGridData;
        if (Array.isArray((data as any).citations)) citations = (data as any).citations;
      }
      // 格式 C：content 字段包裹（原 Next.js /api/ai 格式）
      else if (data.content) {
        console.log("[九宫图] 检测到 content 包裹格式");
        let jsonStr: string | null = null;
        const content: string = data.content;

        // 尝试从 ```json ... ``` 代码块提取
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        } else {
          // 回退：直接匹配 JSON 对象
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) jsonStr = jsonMatch[0];
        }

        if (jsonStr) {
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            throw new Error("AI 返回的 JSON 解析失败。原始返回：" + content.slice(0, 200));
          }
        }

        if (!parsed) {
          throw new Error("AI 返回格式异常，未找到九宫图 JSON。原始返回：" + content.slice(0, 200));
        }
      }
      // 格式 C：未知格式
      else {
        const preview = JSON.stringify(data).slice(0, 300);
        throw new Error("AI 服务返回格式不识别，期望 block_1~block_9 或 content 字段。收到：" + preview);
      }

      // Ensure all 9 blocks exist
      for (let i = 1; i <= 9; i++) {
        const key = `block_${i}` as keyof NineGridData;
        if (!parsed[key]) {
          parsed[key] = { title: NINE_LABELS[i - 1], talking_point: "" };
        }
      }

      setGridData(parsed);
      setCitations(citations);   // RAG 溯源（小虵母舰返回的 PDF 引用）
      console.log("[九宫图] ✅ 9格话术已展示", citations.length ? `（含 ${citations.length} 条溯源）` : "");
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      console.error("[九宫图] ❌ 请求失败:", rawMsg, err);

      // 人性化 CORS / 网络错误提示
      let friendlyMsg = rawMsg;
      if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError")) {
        friendlyMsg = "无法连接到 AI 服务（云端 Render）。请确认 AI端 已部署且 CORS 允许本前端域名。";
      }

      setGenError(friendlyMsg);
    } finally {
      setGenerating(false);
    }
  };

  // ---- cell editing ----
  const openEditCell = (idx: number) => {
    if (!gridData) return;
    const block = gridData[`block_${idx + 1}` as keyof NineGridData];
    setEditText(block?.talking_point || "");
    setEditCellIdx(idx);
  };

  const saveEditCell = () => {
    if (editCellIdx === null || !gridData) return;
    const key = `block_${editCellIdx + 1}` as keyof NineGridData;
    setGridData({
      ...gridData,
      [key]: { ...gridData[key], talking_point: editText },
    });
    setEditCellIdx(null);
    setEditText("");
  };

  // ---- save to database（upsert 万能结果库 JSONB）----
  const handleSave = async () => {
    if (!gridData) return;
    setSaving(true);
    setSavedMsg("");

    try {
      // 确保项目存在
      const pid = await ensureProject();
      // 同步最新输入到基础物科库（与本次保存的九宫格保持一致）
      await syncProject(pid);

      // ⑥ upsert 到 project_modules_data（JSONB）
      const res = await fetch(`/api/projects/${pid}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleType: "nine-grid",
          data: gridData,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "保存失败");
      }

      const saved = await res.json();
      setSavedMsg(`已保存到万能结果库（JSONB），版本 v${saved.version}`);
    } catch (err) {
      setSavedMsg(err instanceof Error ? `保存失败: ${err.message}` : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // ---- 打开已有项目：直接从 JSONB 渲染（跳过 AI，省 Token）----
  const openProject = async (pid: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/projects/${pid}`);
      if (!res.ok) throw new Error("加载失败");
      const project: ProjectDetail = await res.json();

      setProjectId(project.id);
      setFormData({
        customer: project.customer,
        industry: project.industry || "",
        contact: project.contact || "",
        contactTitle: project.contactTitle || "",
        stage: project.stage || "1",
        estimatedValue: project.estimatedValue || "",
        pain: project.pain || "",
        products: project.products || "",
        initiatives: project.initiatives || "",
        competitors: project.competitors || "",
        extra: project.extra || "",
      });

      // ⑦ 找到 nine-grid 模块，直接渲染（零 Token）
      const nineGridModules = project.moduleData
        .filter((m) => m.moduleType === "nine-grid")
        .sort((a, b) => b.version - a.version);
      const nineGridModule = nineGridModules[0];
      if (nineGridModule) {
        setGridData(nineGridModule.data);
        setStep(4);
      } else {
        setGridData(null);
        setStep(3);
      }
      setView("wizard");
    } catch (err) {
      console.error("[九宫图] 打开项目失败:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ---- 打开某个具体保存版本（从历史目录点击）----
  const openVersion = async (pid: string, moduleDataId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/projects/${pid}`);
      if (!res.ok) throw new Error("加载失败");
      const project: ProjectDetail = await res.json();
      setProjectId(project.id);
      setFormData({
        customer: project.customer,
        industry: project.industry || "",
        contact: project.contact || "",
        contactTitle: project.contactTitle || "",
        stage: project.stage || "1",
        estimatedValue: project.estimatedValue || "",
        pain: project.pain || "",
        products: project.products || "",
        initiatives: project.initiatives || "",
        competitors: project.competitors || "",
        extra: project.extra || "",
      });
      const target = project.moduleData
        .filter((m) => m.moduleType === "nine-grid")
        .sort((a, b) => b.version - a.version)
        .find((m) => m.id === moduleDataId);
      setGridData(target ? target.data : null);
      setView("wizard");
      setStep(4);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("[九宫图] 打开版本失败:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ---- 删除某个保存版本（带确认态）----
  const deleteVersion = async (pid: string, moduleDataId: string) => {
    setDeletingId(moduleDataId);
    try {
      const res = await fetch(`/api/projects/${pid}/modules/${moduleDataId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "删除失败");
      }
      setConfirmDeleteId(null);
      await loadHistory();
    } catch (err) {
      console.error("[九宫图] 删除版本失败:", err);
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  // ---- copy all talking points ----
  const handleCopyAll = () => {
    if (!gridData) return;
    let txt = "九宫图话术\n";
    txt += `客户：${formData.customer} | 联系人：${formData.contact}\n\n`;
    for (let i = 0; i < 9; i++) {
      const block = gridData[`block_${i + 1}` as keyof NineGridData];
      txt += `【${i + 1} ${NINE_LABELS[i]}】\n${block?.talking_point || ""}\n\n`;
    }
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ---- 导出九宫图（Word / Excel / Markdown，零依赖）----
  const exportNineGrid = (format: "word" | "excel" | "markdown") => {
    if (!gridData) return;
    const cust = formData.customer || "客户";
    const safeName = cust.replace(/[\\/:*?"<>|]/g, "_");
    const stamp = new Date().toISOString().slice(0, 10);
    const meta = [
      `客户：${formData.customer || "-"}`,
      `联系人：${formData.contact || "-"}${formData.contactTitle ? `（${formData.contactTitle}）` : ""}`,
      `行业：${formData.industry || "-"}`,
      `核心痛点：${formData.pain || "-"}`,
    ];
    const blocks = NINE_LABELS.map((label, i) => {
      const b = gridData[`block_${i + 1}` as keyof NineGridData];
      return { idx: i + 1, label, title: b?.title || "", tp: b?.talking_point || "" };
    });

    if (format === "markdown") {
      const lines = [`# ${cust} — 九宫图话术`, "", ...meta, "", "## 九宫格", ""];
      blocks.forEach((b) => {
        lines.push(`### ${b.idx}. ${b.label}`);
        if (b.title) lines.push(`**${b.title}**`);
        lines.push(b.tp, "");
      });
      const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
      downloadBlob(blob, `${safeName}-九宫图-${stamp}.md`);
      return;
    }

    if (format === "word") {
      const rows = blocks
        .map(
          (b) =>
            `<tr><td style="border:1px solid #999;padding:6px;width:130px;font-weight:bold;background:#f3f4f6;vertical-align:top">${b.idx}. ${escapeHtml(b.label)}</td><td style="border:1px solid #999;padding:6px;vertical-align:top">${escapeHtml(b.title)}<br/>${escapeHtml(b.tp).replace(/\n/g, "<br/>")}</td></tr>`,
        )
        .join("");
      const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${escapeHtml(cust)}九宫图</title></head><body><h2>${escapeHtml(cust)} — 九宫图话术</h2><p>${meta.map(escapeHtml).join("<br/>")}</p><table style='border-collapse:collapse;width:100%'>${rows}</table></body></html>`;
      const blob = new Blob(["﻿", html], { type: "application/msword" });
      downloadBlob(blob, `${safeName}-九宫图-${stamp}.doc`);
      return;
    }

    // excel
    const rows = blocks
      .map(
        (b) =>
          `<tr><td>${b.idx}</td><td>${escapeHtml(b.label)}</td><td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.tp)}</td></tr>`,
      )
      .join("");
    const html = `<html xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><table border='1'><tr><th>序号</th><th>维度</th><th>要点</th><th>话术</th></tr>${rows}</table></body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/vnd.ms-excel" });
    downloadBlob(blob, `${safeName}-九宫图-${stamp}.xls`);
  };

  // ---- history（项目列表，点击直接打开 JSONB）----
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data: ProjectSummary[] = await res.json();
        setProjects(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const switchToHistory = () => {
    setView("history");
    loadHistory();
  };

  // ---- step progress ----
  const stepProgress = (step / 4) * 100;
  const stepLabels = ["客户信息", "痛点与方案", "生成话术", "查看 & 导出"];

  // ============================================================
  //  Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" />
            九宫图生成器
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            SSM 核心工具 — 以客户痛点为核心的 3×3 愿景加工模型
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "wizard" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("wizard")}
          >
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
          <Button
            variant={view === "history" ? "default" : "outline"}
            size="sm"
            onClick={switchToHistory}
          >
            <History className="h-4 w-4 mr-1" />
            历史记录
          </Button>
        </div>
      </div>

      {/* ---- Wizard View ---- */}
      {view === "wizard" && (
        <>
          {/* Steps Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                {stepLabels.map((label, i) => {
                  const stepNum = (i + 1) as StepNum;
                  const isDone = step > stepNum;
                  const isActive = step === stepNum;
                  return (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors ${
                            isDone
                              ? "bg-primary text-primary-foreground border-primary"
                              : isActive
                                ? "bg-primary/10 text-primary border-primary"
                                : "bg-muted text-muted-foreground border-muted-foreground/30"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-5 w-5" /> : stepNum}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      {i < 3 && (
                        <div
                          className={`h-0.5 flex-1 mx-2 mb-5 transition-colors ${
                            step > stepNum ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <Progress value={stepProgress} className="h-1" />
            </CardContent>
          </Card>

          {/* Error Toast */}
          {genError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {genError}
            </div>
          )}

          {/* ---- Step 1: Customer Info ---- */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">第一步：填写客户信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>
                      客户名称 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formData.customer}
                      onChange={(e) => updateField("customer", e.target.value)}
                      placeholder="例：某汽车零部件股份有限公司"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      行业 <span className="text-destructive">*</span>
                    </Label>
                    <SelectField
                      value={formData.industry}
                      onChange={(v) => updateField("industry", v)}
                      options={INDUSTRIES}
                      placeholder="请选择行业"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      联系人姓名 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formData.contact}
                      onChange={(e) => updateField("contact", e.target.value)}
                      placeholder="例：王总"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      联系人职务 <span className="text-destructive">*</span>
                    </Label>
                    <SelectField
                      value={formData.contactTitle}
                      onChange={(v) => updateField("contactTitle", v)}
                      options={TITLES}
                      placeholder="请选择职务层级"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>当前销售阶段</Label>
                    <SelectField
                      value={formData.stage}
                      onChange={(v) => updateField("stage", v)}
                      options={STAGES}
                      placeholder="选择阶段"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>预计合同金额</Label>
                    <Input
                      value={formData.estimatedValue}
                      onChange={(e) => updateField("estimatedValue", e.target.value)}
                      placeholder="例：¥500万"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="lg" onClick={() => goNext(1)}>
                    下一步：填写痛点与方案
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Step 2: Pain & Solution ---- */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">第二步：填写痛点 &amp; 解决方案</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer summary bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">当前客户：</span>
                  <span className="font-semibold text-primary">{formData.customer}</span>
                  <span className="text-muted-foreground">|</span>
                  <span>{formData.contact}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{formData.contactTitle}</span>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    核心业务痛点 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    value={formData.pain}
                    onChange={(e) => updateField("pain", e.target.value)}
                    placeholder="例：MES系统已运行8年，生产数据无法实时可见，车间排产依赖人工汇报，每月因排产错误导致的产线停工约3-5次，影响交期达成率，估计损失年产能5%以上。"
                  />
                  <p className="text-xs text-muted-foreground">
                    建议包含：当前现象 + 造成的业务影响 + 量化数据（如有）
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    我方产品/解决方案 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    rows={3}
                    value={formData.products}
                    onChange={(e) => updateField("products", e.target.value)}
                    placeholder="例：智能制造数据平台（MES接入 + 实时看板 + AI排产优化），已在20+家同类型工厂落地实施。"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>客户业务举措（选填）</Label>
                    <Textarea
                      rows={2}
                      value={formData.initiatives}
                      onChange={(e) => updateField("initiatives", e.target.value)}
                      placeholder="例：今年推进数字化转型，计划上线智能工厂项目，已立项预算800万。"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>已知竞争对手（选填）</Label>
                    <Input
                      value={formData.competitors}
                      onChange={(e) => updateField("competitors", e.target.value)}
                      placeholder="例：SAP、用友、金蝶"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>补充背景（选填）</Label>
                  <Textarea
                    rows={2}
                    value={formData.extra}
                    onChange={(e) => updateField("extra", e.target.value)}
                    placeholder="例：上次拜访时王总提到最担心数据安全问题，希望私有化部署。"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => goBack(2)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一步
                  </Button>
                  <Button size="lg" onClick={() => goNext(2)}>
                    AI 生成话术
                    <Sparkles className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Step 3: AI Generate ---- */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  第三步：AI 生成九宫图话术
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info summary */}
                <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">客户</span>
                    <div className="font-semibold text-primary">{formData.customer}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">联系人</span>
                    <div className="font-semibold">{formData.contact}</div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-xs text-muted-foreground">核心痛点</span>
                    <div className="truncate text-sm">{formData.pain}</div>
                  </div>
                </div>

                {/* Placeholder / Generate button */}
                {!gridData && !generating && (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="mb-4 text-5xl">🤖</div>
                    <p className="mb-1 font-semibold text-primary">
                      准备好了，点击下方按钮开始生成
                    </p>
                    <p className="mb-6 text-sm text-muted-foreground">
                      AI 将根据客户信息和痛点，自动生成 9 格完整话术
                    </p>
                    <Button size="lg" onClick={handleGenerate}>
                      <Sparkles className="h-4 w-4 mr-1" />
                      开始 AI 生成
                    </Button>
                  </div>
                )}

                {/* Generating skeleton */}
                {generating && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {NINE_LABELS.map((label, i) => (
                      <div
                        key={label}
                        className={`rounded-lg border p-4 ${i === 4 ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI 生成中...
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grid result */}
                {gridData && !generating && (
                  <>
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      九宫图话术已生成！点击任意格子可编辑内容。
                    </div>
                    <NineGridDisplay
                      data={gridData}
                      onCellClick={openEditCell}
                    />
                    {/* 保存到万能结果库（ProjectModuleData JSONB） */}
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        {saving ? "保存中…" : "保存到万能结果库"}
                      </Button>
                      {savedMsg && (
                        <span className={`flex items-center gap-1.5 text-sm ${
                          savedMsg.includes("失败")
                            ? "text-destructive"
                            : "text-green-600 dark:text-green-400"
                        }`}>
                          {savedMsg.includes("失败") ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          {savedMsg}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        保存后可在「项目」中随时调出，AI 也会读取此结果作为上下文
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" onClick={goEditPain}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        修改痛点
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleGenerate}>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          重新生成
                        </Button>
                        <Button size="lg" onClick={() => setStep(4)}>
                          查看完整结果
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ---- Step 4: Preview & Export ---- */}
          {step === 4 && gridData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">第四步：完整预览 &amp; 导出</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    保存到历史记录
                  </Button>
                  <Button variant="outline" onClick={handleCopyAll}>
                    <Copy className="h-4 w-4 mr-1" />
                    {copied ? "已复制！" : "复制全部话术"}
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-1" />
                    打印
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        导出
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportNineGrid("word")}>
                        <FileText className="h-4 w-4 mr-2" />
                        导出 Word (.doc)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportNineGrid("excel")}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        导出 Excel (.xls)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportNineGrid("markdown")}>
                        <FileText className="h-4 w-4 mr-2" />
                        导出 Markdown (.md)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    返回编辑
                  </Button>
                  <Button variant="outline" onClick={resetWizard}>
                    <Plus className="h-4 w-4 mr-1" />
                    新建九宫图
                  </Button>
                </div>

                {savedMsg && (
                  <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
                    savedMsg.includes("失败")
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400"
                  }`}>
                    {savedMsg.includes("失败") ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {savedMsg}
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div><span className="text-muted-foreground">客户：</span><span className="font-semibold">{formData.customer}</span></div>
                    <div><span className="text-muted-foreground">联系人：</span><span className="font-semibold">{formData.contact}</span></div>
                    <div><span className="text-muted-foreground">行业：</span><span className="font-semibold">{formData.industry}</span></div>
                  </div>
                </div>

                {/* Full Grid */}
                <NineGridDisplay data={gridData} onCellClick={openEditCell} />

                {/* Talking Points List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">话术列表</h4>
                  {NINE_LABELS.map((label, i) => {
                    const block = gridData[`block_${i + 1}` as keyof NineGridData];
                    return (
                      <div key={label} className="rounded-lg border p-4">
                        <div className="mb-1.5 flex items-center gap-2">
                          <Badge variant={i === 4 ? "default" : "secondary"}>
                            {i + 1}
                          </Badge>
                          <span className="font-medium">{label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {block?.talking_point || "（空）"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* RAG 知识溯源（小虵母舰返回的 PDF 引用） */}
                {citations.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <h4 className="mb-2 font-semibold text-sm text-amber-800">
                      知识溯源（RAG 引用）
                    </h4>
                    <ul className="space-y-1 text-xs text-amber-700">
                      {citations.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 font-mono">[{i + 1}]</span>
                          <span className="break-all">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Edit Cell Modal */}
          {editCellIdx !== null && (
            <EditCellModal
              label={NINE_LABELS[editCellIdx]}
              value={editText}
              onChange={setEditText}
              onSave={saveEditCell}
              onClose={() => setEditCellIdx(null)}
            />
          )}
        </>
      )}

      {/* ---- History View：项目 → 版本目录 ---- */}
      {view === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">历史记录</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              每个项目下保留历次保存的九宫图版本，可随时打开查看或删除（删除不可恢复）。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                加载中...
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
                <div className="mb-3 text-4xl">📭</div>
                <p className="font-medium">暂无项目</p>
                <p className="text-sm mt-1">生成九宫图后保存即可在此查看</p>
                <Button className="mt-4" variant="outline" onClick={() => setView("wizard")}>
                  <Plus className="h-4 w-4 mr-1" />
                  新建九宫图
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((p) => {
                  const versions = p.moduleData
                    .filter((m) => m.moduleType === "nine-grid")
                    .sort((a, b) => b.version - a.version);
                  return (
                    <div key={p.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.customer}</span>
                          {p.industry && (
                            <Badge variant="outline">{p.industry}</Badge>
                          )}
                          <Badge variant="secondary">{versions.length} 个保存版本</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.updatedAt).toLocaleString("zh-CN")}
                        </span>
                      </div>

                      {versions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">暂无保存的九宫图版本</p>
                      ) : (
                        <div className="space-y-2">
                          {versions.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                            >
                              <div className="text-sm">
                                <span className="font-medium">版本 {m.version}</span>
                                <span className="text-muted-foreground ml-2">
                                  {new Date(m.createdAt).toLocaleString("zh-CN")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openVersion(p.id, m.id)}
                                  disabled={loadingHistory}
                                >
                                  打开
                                </Button>
                                {confirmDeleteId === m.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteVersion(p.id, m.id)}
                                      disabled={deletingId === m.id}
                                    >
                                      {deletingId === m.id && (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      )}
                                      确认删除
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setConfirmDeleteId(null)}
                                      disabled={deletingId === m.id}
                                    >
                                      取消
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setConfirmDeleteId(m.id)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    删除
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
//  Sub-components
// ============================================================

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function NineGridDisplay({
  data,
  onCellClick,
}: {
  data: NineGridData;
  onCellClick: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {NINE_LABELS.map((label, i) => {
        const block = data[`block_${i + 1}` as keyof NineGridData];
        const isCenter = i === 4;
        return (
          <div
            key={label}
            onClick={() => onCellClick(i)}
            className={`group relative cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
              isCenter
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isCenter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-sm font-semibold ${isCenter ? "text-primary" : ""}`}>
                {label}
              </span>
            </div>
            <p className={`text-sm whitespace-pre-wrap ${block?.talking_point ? "" : "text-muted-foreground italic"}`}>
              {block?.talking_point || "（点击编辑）"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function EditCellModal({
  label,
  value,
  onChange,
  onSave,
  onClose,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-2xl rounded-lg border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">编辑：{label}</h3>
        <Textarea
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="resize-none"
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onSave}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
