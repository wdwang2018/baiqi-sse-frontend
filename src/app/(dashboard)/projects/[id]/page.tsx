"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  StickyNote,
  MessageCircle,
  Users,
  LayoutGrid,
  User,
  Mic,
  Image as ImageIcon,
  Upload,
  FileText,
} from "lucide-react";
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
import { SSM_STAGE_OPTIONS, stageNum } from "@/lib/constants";
import { buildProjectSnapshot } from "@/lib/project-snapshot";

interface MediaRef {
  name: string;
  url: string;
  mime?: string;
  size?: number;
}

interface InteractionRow {
  id: string;
  type: string;
  title: string;
  content: string;
  occurredAt: string;
  participants: string | null;
  source?: string | null;
  aiSummary?: string | null;
  rawContent?: string | null;
  mediaUrls?: MediaRef[] | null;
}
interface ProjectDetail {
  id: string;
  name: string;
  customer: string;
  industry?: string | null;
  contact?: string | null;
  contactTitle?: string | null;
  stage?: string | null;
  estimatedValue?: string | null;
  pain?: string | null;
  products?: string | null;
  initiatives?: string | null;
  businessContext?: string | null;
  competitors?: string | null;
  extra?: string | null;
  status: string;
  suggestedStage?: string | null;
  stageEvidence?: string | null;
  stageSuggestedAt?: string | null;
  stageConfirmedAt?: string | null;
}

const TEXT_FIELDS: { key: string; label: string; area: boolean }[] = [
  { key: "customer", label: "客户名称", area: false },
  { key: "industry", label: "行业", area: false },
  { key: "contact", label: "联系人", area: false },
  { key: "contactTitle", label: "联系人职位", area: false },
  { key: "estimatedValue", label: "预计金额", area: false },
  { key: "products", label: "我方产品 / 方案", area: true },
  { key: "initiatives", label: "客户业务举措", area: true },
  { key: "businessContext", label: "客户业务情况", area: true },
  { key: "pain", label: "核心业务痛点", area: true },
  { key: "competitors", label: "竞争对手", area: false },
  { key: "extra", label: "补充背景", area: true },
];

const INTERACTION_TYPES = [
  { value: "meeting", label: "会议", Icon: Users },
  { value: "call", label: "电话", Icon: Phone },
  { value: "email", label: "邮件", Icon: Mail },
  { value: "wechat", label: "微信", Icon: MessageCircle },
  { value: "note", label: "笔记", Icon: StickyNote },
];

// 内容来源标注：透明可审，区分「人写的」与「机器转写/识别的」
const SOURCE_META: Record<
  string,
  { label: string; Icon: typeof User; color: string }
> = {
  human: { label: "人工录入", Icon: User, color: "#16a34a" },
  asr: { label: "语音转写", Icon: Mic, color: "#7c3aed" },
  vlm: { label: "图片识别", Icon: ImageIcon, color: "#0891b2" },
  import: { label: "外部导入", Icon: Upload, color: "#475569" },
};
function sourceMeta(s?: string | null) {
  return SOURCE_META[s || "human"] || SOURCE_META.human;
}

const STAGE_COLORS = [
  "#9ca3af", "#6b7280", "#0891b2", "#0d9488",
  "#7c3aed", "#16a34a", "#dc2626", "#475569",
];

function toForm(p: ProjectDetail) {
  return {
    customer: p.customer ?? "",
    industry: p.industry ?? "",
    contact: p.contact ?? "",
    contactTitle: p.contactTitle ?? "",
    estimatedValue: p.estimatedValue ?? "",
    products: p.products ?? "",
    initiatives: p.initiatives ?? "",
    businessContext: p.businessContext ?? "",
    pain: p.pain ?? "",
    competitors: p.competitors ?? "",
    extra: p.extra ?? "",
    stage: p.stage ?? "",
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [itType, setItType] = useState("meeting");
  const [itTitle, setItTitle] = useState("");
  const [itContent, setItContent] = useState("");
  const [itParticipants, setItParticipants] = useState("");
  const [itOccurredAt, setItOccurredAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [itSource, setItSource] = useState("human");
  const [itFiles, setItFiles] = useState<File[]>([]);
  const [fileRef, setFileRef] = useState<HTMLInputElement | null>(null);
  const [addingIt, setAddingIt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState("");
  const [evidenceCollapsed, setEvidenceCollapsed] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [pr, ir] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/interactions`),
    ]);
    if (pr.ok) {
      const p = await pr.json();
      setProject(p);
      setForm(toForm(p));
    }
    if (ir.ok) {
      const d = await ir.json();
      setInteractions(d.interactions || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) loadAll();
  }, [id, loadAll]);

  const saveFields = async () => {
    setSavingFields(true);
    setSavedMsg("");
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSavingFields(false);
    if (res.ok) {
      setSavedMsg("已保存");
      setProject((prev) => (prev ? { ...prev, ...form } : prev));
      setTimeout(() => setSavedMsg(""), 2000);
    }
  };

  const addInteraction = async () => {
    if (!itTitle.trim() || !itContent.trim()) return;
    setAddingIt(true);
    try {
      const res = await fetch(`/api/projects/${id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: itType,
          title: itTitle.trim(),
          content: itContent.trim(),
          participants: itParticipants.trim() || null,
          source: itSource,
          occurredAt: new Date(itOccurredAt).toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const createdId = data?.interaction?.id as string | undefined;
        // 附件：先建互动，再上传媒体（服务端落本地并回写 mediaUrls）
        if (createdId && itFiles.length > 0) {
          setUploading(true);
          const fd = new FormData();
          itFiles.forEach((f) => fd.append("files", f));
          const up = await fetch(
            `/api/projects/${id}/interactions/${createdId}/media`,
            { method: "POST", body: fd },
          );
          setUploading(false);
          if (!up.ok) {
            const ed = await up.json().catch(() => ({}));
            console.warn("媒体上传失败：", ed.error);
          }
        }
        setItTitle("");
        setItContent("");
        setItParticipants("");
        setItSource("human");
        setItFiles([]);
        setItOccurredAt(new Date().toISOString().slice(0, 16));
        loadAll();
      }
    } finally {
      setAddingIt(false);
    }
  };

  const summarizeIt = async (iid: string) => {
    setSummarizingId(iid);
    const res = await fetch(
      `/api/projects/${id}/interactions/${iid}/summarize`,
      { method: "POST" },
    );
    setSummarizingId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      console.warn("AI 摘要失败：", d.error);
    }
    loadAll();
  };

  const deleteInteraction = async (iid: string) => {
    const res = await fetch(
      `/api/projects/${id}/interactions/${iid}`,
      { method: "DELETE" },
    );
    if (res.ok) loadAll();
  };

  // 直连 AI端 (AI服务)：云端 Render 公网 / 本地局域网兜底，接管 7 阶段 AI 大脑
  const AI_BASE = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.75:8001";
  const PY_AI_CLASSIFY_URL = `${AI_BASE}/api/ai/projects/classify`;

  const runClassify = async () => {
    setClassifying(true);
    setClassifyError("");
    try {
      // ① 用 buildProjectSnapshot 把「项目汇总库」全量快照（基础信息 + 互动记录）组装成对象
      const snapshotObj = buildProjectSnapshot(
        { id, ...form },
        interactions.map((it) => ({
          type: it.type,
          title: it.title,
          content: it.content,
          occurredAt: it.occurredAt,
          participants: it.participants,
        })),
      );

      // ② 直连 Python 服务（携带 NextAuth Cookie）；母舰真实契约：
      //    请求 { projectId, projectSnapshot:string(JSON 字符串，母舰会再 json.loads 一次) }
      //    响应 { classify_data:{ suggestedStage:number(1-7), stageEvidence:string }, usage }
      const res = await fetch(PY_AI_CLASSIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: id,
          projectSnapshot: JSON.stringify(snapshotObj),
        }),
      });

      if (!res.ok) {
        let errBody: any = null;
        try {
          errBody = await res.json();
        } catch {
          /* ignore */
        }
        let msg = `AI 请求失败 (${res.status})`;
        if (errBody?.detail) {
          msg = Array.isArray(errBody.detail)
            ? "字段校验失败 → " +
              errBody.detail
                .map((d: any) => `${Array.isArray(d.loc) ? d.loc.join(".") : d.loc}: ${d.msg}`)
                .join("; ")
            : String(errBody.detail);
        } else if (errBody?.error) {
          msg = errBody.error;
        }
        throw new Error(msg);
      }

      const data = await res.json();
      // 母舰契约：data.classify_data.{ suggestedStage:number, stageEvidence:string }
      const cd = data?.classify_data ?? {};
      const stageNum = Number(cd.suggestedStage);
      if (!stageNum || stageNum < 1 || stageNum > 7) {
        throw new Error("AI 返回的阶段号不合法（应为 1-7）");
      }
      const label = SSM_STAGE_OPTIONS[stageNum - 1] ?? `阶段 ${stageNum}`;
      const evidence = cd.stageEvidence ?? "";

      // ③ 回写建议（不直接改权威 stage，等人在闸门确认）
      const patch = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestedStage: label,
          stageEvidence: evidence,
          stageSuggestedAt: new Date().toISOString(),
        }),
      });
      if (!patch.ok) throw new Error("写入阶段建议失败，请重试");

      loadAll(); // 重新拉取 → 触发「人确认闸门」弹窗
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      let friendlyMsg = rawMsg;
      if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError")) {
        friendlyMsg =
          "无法连接到 AI 服务（云端 Render）。请确认 AI端 已部署且 CORS 允许本前端域名。";
      }
      setClassifyError(friendlyMsg);
    } finally {
      setClassifying(false);
    }
  };

  const confirmStage = async () => {
    if (!project?.suggestedStage) return;
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: project.suggestedStage,
        stageConfirmedAt: new Date().toISOString(),
      }),
    });
    loadAll();
  };

  const ignoreSuggestion = async () => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestedStage: null, stageEvidence: null }),
    });
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 加载中...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        项目不存在或无权访问。
        <Link href="/projects" className="ml-2 text-cyan-600 underline">
          返回项目汇总库
        </Link>
      </div>
    );
  }

  const n = stageNum(project.stage);
  const stageColor = n >= 1 && n <= 7 ? STAGE_COLORS[n] : STAGE_COLORS[0];
  // 三态闸门：
  //   ① 待确认：AI 建议了阶段，且与当前权威 stage 不同 → 黄色操作框
  //   ② 已确认：有 evidence 且（stage 已对齐 或 有确认时间戳）→ 可折叠的「已确认研判」卡片
  //   ③ 无证据 → 不渲染
  const showPendingGate =
    !!project.suggestedStage && project.suggestedStage !== project.stage;
  const showConfirmedEvidence =
    !!project.stageEvidence &&
    (!showPendingGate || !!project.stageConfirmedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/projects"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan-600"
          >
            <ArrowLeft className="h-3 w-3" /> 项目汇总库
          </Link>
          <h2 className="text-xl font-bold">{project.customer}</h2>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" style={{ color: stageColor, borderColor: stageColor }}>
            {project.stage || "未设置阶段"}
          </Badge>
          <Link href="/nine-grid">
            <Button variant="outline" size="sm">
              <LayoutGrid className="mr-1 h-4 w-4" /> 九宫图
            </Button>
          </Link>
        </div>
      </div>

      {/* ① 待确认闸门：AI 建议了阶段，等人工确认 */}
      {showPendingGate && (
        <div className="rounded-lg border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <div className="font-medium text-amber-900 dark:text-amber-200">
                AI 建议阶段：{project.suggestedStage}
              </div>
              {project.stageEvidence && (
                <p
                  className={`mt-1 text-sm text-amber-800 dark:text-amber-300/80 ${
                    project.stageEvidence.length > 500 ? "max-h-[200px] overflow-y-auto" : ""
                  }`}
                >
                  {project.stageEvidence}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                当前阶段：{project.stage || "未设置"}（需你确认才生效）
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={confirmStage}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> 确认并生效
                </Button>
                <Button size="sm" variant="ghost" onClick={ignoreSuggestion}>
                  忽略建议
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ② 已确认研判（可折叠保留）：点过「确认」或「忽略」后，evidence 仍可在页面上查看 */}
      {showConfirmedEvidence && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
          <button
            type="button"
            className="flex w-full cursor-pointer items-start gap-3"
            onClick={() => setEvidenceCollapsed(!evidenceCollapsed)}
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className="font-medium text-emerald-900 dark:text-emerald-200">
                  已确认研判
                  {project.suggestedStage && (
                    <>
                      ：{project.suggestedStage}
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs"
                        style={{ color: "#16a34a", borderColor: "#86efac" }}
                      >
                        {project.stageConfirmedAt
                          ? `已生效 (${new Date(project.stageConfirmedAt).toLocaleDateString("zh-CN")})`
                          : "已覆盖"}
                      </Badge>
                    </>
                  )}
                </span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {evidenceCollapsed ? "展开 ▾" : "收起 ▴"}
                </span>
              </div>
              {!evidenceCollapsed && (
                <pre
                  className={`mt-2 whitespace-pre-wrap break-words rounded bg-white/70 p-3 text-sm leading-relaxed text-gray-800 dark:bg-black/20 dark:text-gray-300 ${
                    project.stageEvidence && project.stageEvidence.length > 800
                      ? "max-h-[400px] overflow-y-auto"
                      : ""
                  }`}
                >
                  {project.stageEvidence}
                </pre>
              )}
              {evidenceCollapsed && (
                <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground">
                  {project.stageEvidence?.slice(0, 120)}…
                </p>
              )}
            </div>
          </button>
        </div>
      )}

      {/* 基础信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">项目信息（基础物科库）</CardTitle>
          <CardDescription>
            实时写入项目汇总库，所有销售工具共享
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {TEXT_FIELDS.map((f) => (
              <div key={f.key} className={f.area ? "md:col-span-2" : ""}>
                <Label className="mb-1 block text-xs text-muted-foreground">
                  {f.label}
                </Label>
                {f.area ? (
                  <Textarea
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                    rows={3}
                  />
                ) : (
                  <Input
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                )}
              </div>
            ))}

            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">
                销售阶段（SSM 七阶段）
              </Label>
              <select
                value={form.stage ?? ""}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">未设置</option>
                {SSM_STAGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveFields} disabled={savingFields}>
              {savingFields ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              保存信息
            </Button>
            {savedMsg && (
              <span className="flex items-center text-sm text-green-600">
                <CheckCircle2 className="mr-1 h-4 w-4" /> {savedMsg}
              </span>
            )}
            <Button
              variant="outline"
              onClick={runClassify}
              disabled={classifying}
            >
              {classifying ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              AI 建议阶段
            </Button>
            {classifyError && (
              <span className="flex items-center text-sm text-red-600">
                <AlertCircle className="mr-1 h-4 w-4" /> {classifyError}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 互动记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">互动记录（实时更新）</CardTitle>
          <CardDescription>
            会议 / 电话 / 邮件 / 微信 / 笔记 — 阶段分类器的核心输入
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={itType}
                onChange={(e) => setItType(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                {INTERACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={itSource}
                onChange={(e) => setItSource(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                title="内容来源：标记这条记录是人工录入、语音转写还是图片识别"
              >
                {Object.entries(SOURCE_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <Input
                value={itTitle}
                onChange={(e) => setItTitle(e.target.value)}
                placeholder="主题，如：首次需求沟通会"
                className="flex-1"
              />
            </div>
            <Textarea
              value={itContent}
              onChange={(e) => setItContent(e.target.value)}
              placeholder="要点 / 纪要 / 关键信号（决策、异议、下一步）。语音转写或图片识别结果可粘贴此处，并把来源选为对应项"
              rows={3}
              className="mb-2"
            />
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input
                ref={(el) => setFileRef(el)}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setItFiles(Array.from(e.target.files || []))}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef?.click()}
              >
                <Upload className="mr-1 h-4 w-4" /> 附件
                {itFiles.length > 0 && `（${itFiles.length}）`}
              </Button>
              {itFiles.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {itFiles.map((f) => f.name).join("、")}
                </span>
              )}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Input
                type="datetime-local"
                value={itOccurredAt}
                onChange={(e) => setItOccurredAt(e.target.value)}
                className="w-auto"
              />
              <Input
                value={itParticipants}
                onChange={(e) => setItParticipants(e.target.value)}
                placeholder="参会人（可选）"
                className="flex-1"
              />
            </div>
            <Button onClick={addInteraction} disabled={addingIt || uploading}>
              {addingIt || uploading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              {uploading ? "上传附件中..." : "添加互动"}
            </Button>
          </div>

          {interactions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              暂无互动记录，添加后可用于 AI 阶段判定
            </div>
          ) : (
            <div className="space-y-2">
              {interactions.map((it) => {
                const meta =
                  INTERACTION_TYPES.find((t) => t.value === it.type) ||
                  INTERACTION_TYPES[4];
                const Icon = meta.Icon;
                const sm = sourceMeta(it.source);
                const SIcon = sm.Icon;
                const media: MediaRef[] = Array.isArray(it.mediaUrls)
                  ? it.mediaUrls
                  : [];
                return (
                  <div
                    key={it.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="mt-0.5 rounded-full bg-muted p-2">
                      <Icon className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{it.title}</span>
                        <span
                          className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
                          style={{ color: sm.color, borderColor: sm.color }}
                        >
                          <SIcon className="h-3 w-3" /> {sm.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(it.occurredAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      {it.participants && (
                        <div className="text-xs text-muted-foreground">
                          参会：{it.participants}
                        </div>
                      )}
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                        {it.content}
                      </p>

                      {media.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {media.map((m, idx) =>
                            (m.mime || "").startsWith("image/") ? (
                              <a
                                key={idx}
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={m.url}
                                  alt={m.name}
                                  className="h-16 w-16 rounded border object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                key={idx}
                                href={m.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                              >
                                <FileText className="h-3 w-3" /> {m.name}
                              </a>
                            ),
                          )}
                        </div>
                      )}

                      {it.aiSummary && (
                        <div className="mt-2 whitespace-pre-wrap rounded bg-cyan-50 p-2 text-xs text-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200">
                          {it.aiSummary}
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => summarizeIt(it.id)}
                          disabled={summarizingId === it.id}
                        >
                          {summarizingId === it.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1 h-3 w-3" />
                          )}
                          AI 摘要
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInteraction(it.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
