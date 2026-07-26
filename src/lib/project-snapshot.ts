/**
 * 项目快照 — 统一「工具从项目汇总库取数」的入口
 *
 * 所有 SSM 工具（九宫图、阶段分类器、价值主张、竞争策略…）在调用 LLM 前，
 * 都用本函数把 Project 全量字段 + 近期互动 组装成同一份扁平对象，
 * 既对齐小虵服务 nine-box 的 input 契约（project_id 在 input 内部），
 * 也保证各工具拿到的上下文一致。
 */

export interface ProjectSnapshotInput {
  id?: string | null;
  customer?: string | null;
  industry?: string | null;
  contact?: string | null;
  contactTitle?: string | null;
  pain?: string | null;
  products?: string | null;
  initiatives?: string | null;
  businessContext?: string | null;
  competitors?: string | null;
  extra?: string | null;
  stage?: string | null;
  estimatedValue?: string | null;
}

export interface InteractionBrief {
  type: string;
  title: string;
  content: string;
  occurredAt: string | Date;
  participants?: string | null;
}

export type ProjectSnapshot = Record<string, string>;

export function buildProjectSnapshot(
  p: ProjectSnapshotInput,
  interactions?: InteractionBrief[],
): ProjectSnapshot {
  const base: ProjectSnapshot = {
    project_id: p.id ?? "",
    customer: p.customer ?? "",
    industry: p.industry ?? "",
    contact: p.contact ?? "",
    contactTitle: p.contactTitle ?? "",
    pain: p.pain ?? "",
    products: p.products ?? "",
    initiatives: p.initiatives ?? "",
    businessContext: p.businessContext ?? "",
    competitors: p.competitors ?? "",
    extra: p.extra ?? "",
    stage: p.stage ?? "",
    estimatedValue: p.estimatedValue ?? "",
  };

  if (interactions && interactions.length > 0) {
    base.interactions = interactions
      .map((i) => {
        const dt =
          typeof i.occurredAt === "string"
            ? i.occurredAt
            : i.occurredAt.toISOString();
        const who = i.participants ? ` 参会:${i.participants}` : "";
        return `[${i.type}] ${i.title} (${dt})${who}\n${i.content}`;
      })
      .join("\n---\n");
  }

  return base;
}
