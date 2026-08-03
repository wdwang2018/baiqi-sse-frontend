import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { projectScopeWhere } from "@/lib/project-access";
import { callAI } from "@/lib/ai/gateway";
import { buildProjectSnapshot } from "@/lib/project-snapshot";
import { SSM_STAGE_OPTIONS } from "@/lib/constants";

const TOOL = "stage-classify";

/**
 * 阶段判定核心逻辑（供 AI 专家调优参考）：
 * 采用「倒推核对」(reverse-check) 算法，而非凭印象打分：
 *   1. 从第 7 阶段向第 1 阶段逐阶段检查；
 *   2. 对每个候选阶段，核对它的「可验证的结果」是否都能在
 *      「项目信息 + 近期互动记录」中找到客观证据（会议纪要 / 邮件 / 合同 / SOW 等）；
 *   3. 返回满足全部证据的最高阶段；
 *   4. 若仅部分满足（如已提交方案但未明确签约标准），则停留在已全满足的较低阶段，
 *      并在 evidence 中说明「距下一阶段还缺什么」；
 *   5. confidence 反映证据完备度：客观证据齐全 → 高，靠推断 → 低。
 * 判定标准源自 IBM SSM（SSM_zxj.pdf）：每阶段由「完成标志 + 可验证的结果」双重界定，
 * 「可验证的结果」即 Conditions of Satisfaction —— 可被客户 / 合同客观证明的事实。
 */
const SYSTEM_PROMPT = `你是 IBM Signature Selling Method (SSM) 的销售阶段判定专家。
判定必须基于下方每阶段的「可验证的结果」，而非主观印象。

判定算法（倒推核对）：
1) 从第 7 阶段向下逐阶段检查；
2) 对每个候选阶段，核对它的「可验证的结果」是否都能在"项目信息 + 互动记录"中找到客观证据；
3) 返回满足全部证据的最高阶段；若仅部分满足，则停留在已全满足的较低阶段；
4) evidence 必须注明"依据哪条可验证的结果"，并引用互动中的具体事实（如会议纪要、邮件、合同）。

SSM 七阶段与可验证的结果（判定证据）：
1-关注 Noticed：客户审核的计划；业务积极性映射一致；邀关键人参与研讨
2-发现 Identified（10%）：高阶探讨行业理念；商机计划+时间表；客户认同其业务发展动机与迫切行动理由；识别并尝试联系项目负责人
3-证实 Validated（25%）：确认客户业务动机与需求；开发或影响客户购买愿景；确认在客户内部获得支持
4-合格 Qualified（50%）：创建初步解决方案（建议书框架）与价值陈述；客户同意 IBM 提交的评估计划（或 IBM 放弃项目）
5-投标 Proposed（75%）：客户认同方案/价值陈述/实施计划；双方认同建议书与报价；明确客户签订合约的标准；客户同意跟踪方案业务价值并告知 IBM
6-赢单 Won（100%）：已签合同与工作说明书(SOW)；公布实施团队并确立项目计划
7-完成 Concluded（100%）：客户签项目完工报告并认可满足期望；交付结果调研(目标非常满意)；客户同意作参考案例；创造或发现新商机

仅输出 JSON：{"stage":<1-7 整数>,"evidence":"<引用具体证据，中文，不超过120字>","confidence":<0-1 小数>}`;

const USER_PROMPT = `请基于以下「项目汇总库」信息，判断该销售机会当前所处的 SSM 阶段（1-7）：

客户：{{customer}}
行业：{{industry}}
联系人：{{contact}}（{{contactTitle}}）
客户业务情况：{{businessContext}}
核心痛点：{{pain}}
我方产品/方案：{{products}}
客户举措：{{initiatives}}
竞争对手：{{competitors}}
补充：{{extra}}
当前阶段（可能不准，仅供参考）：{{stage}}
预计金额：{{estimatedValue}}

近期互动记录：
{{interactions}}

仅输出 JSON：{"stage": <1到7的整数>, "evidence": "<判断依据，中文，不超过120字>", "confidence": <0到1的小数>}`;

function normalizeStage(raw: unknown): number {
  if (typeof raw === "number") {
    const n = Math.round(raw);
    return n >= 1 && n <= 7 ? n : 0;
  }
  if (typeof raw === "string") {
    const m = raw.match(/^\s*(\d)/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n >= 1 && n <= 7 ? n : 0;
  }
  return 0;
}

function stripFence(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : s.trim();
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id: params.id, ...projectScopeWhere(auth) },
    include: {
      interactions: {
        orderBy: { occurredAt: "desc" },
        take: 15,
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshot = buildProjectSnapshot(project, project.interactions);

  // 自愈合：确保 stage-classify 提示词模板存在且为最新（全局默认以代码为准）
  const existing = await db.promptTemplate.findFirst({
    where: {
      toolType: TOOL,
      OR: [{ tenantId: auth.tenantId }, { tenantId: null }],
      isActive: true,
    },
    orderBy: [{ tenantId: "desc" }, { version: "desc" }],
  });
  if (!existing) {
    await db.promptTemplate.create({
      data: {
        tenantId: null,
        toolType: TOOL,
        name: "SSM 阶段分类器",
        systemPrompt: SYSTEM_PROMPT,
        userPromptTemplate: USER_PROMPT,
        variables: JSON.stringify(Object.keys(snapshot)),
        modelConfig: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokens: 1024,
        }),
        version: 1,
        isActive: true,
      },
    });
  } else if (existing.tenantId === null && existing.systemPrompt !== SYSTEM_PROMPT) {
    // 全局默认模板与代码不一致 → 以代码最新文案为准（AI 专家的租户自定义模板 tenantId!=null 不受影响，且查询优先返回租户模板）
    await db.promptTemplate.update({
      where: { id: existing.id },
      data: {
        systemPrompt: SYSTEM_PROMPT,
        userPromptTemplate: USER_PROMPT,
        variables: JSON.stringify(Object.keys(snapshot)),
        modelConfig: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokens: 1024,
        }),
        version: existing.version + 1,
      },
    });
  }

  let content: string;
  try {
    const result = await callAI({
      toolType: TOOL,
      input: snapshot,
      userId: auth.id,
      tenantId: auth.tenantId,
    });
    content = result.content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 调用失败";
    return NextResponse.json({ error: `阶段分类失败：${msg}` }, { status: 502 });
  }

  let parsed: { stage?: unknown; evidence?: unknown; confidence?: unknown };
  try {
    parsed = JSON.parse(stripFence(content));
  } catch {
    return NextResponse.json(
      { error: "AI 返回无法解析为阶段建议，请重试或手动设置阶段" },
      { status: 422 },
    );
  }

  const n = normalizeStage(parsed.stage);
  if (!n) {
    return NextResponse.json(
      { error: "AI 返回的阶段号不合法（应为 1-7）" },
      { status: 422 },
    );
  }

  const suggestedStage = SSM_STAGE_OPTIONS[n - 1];
  const stageEvidence =
    typeof parsed.evidence === "string" ? parsed.evidence : "";
  const confidence =
    typeof parsed.confidence === "number" ? parsed.confidence : null;

  await db.project.updateMany({
    where: { id: params.id, ...projectScopeWhere(auth) },
    data: {
      suggestedStage,
      stageEvidence,
      stageSuggestedAt: new Date(),
    },
  });

  return NextResponse.json({
    suggestedStage,
    stageEvidence,
    confidence,
    stageNum: n,
  });
}
