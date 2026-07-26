import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { callAI } from "@/lib/ai/gateway";

const TOOL = "interaction-summary";

// 数据质量核心：把自由文本互动内容，结构化抽取为可检索的销售信号。
// 要求模型只输出「人可读、机器可引用」的中文摘要，包含决策/异议/下一步三类信号。
const SYSTEM_PROMPT = `你是销售互动纪要分析助手。给定一条客户互动记录，请抽取其中的关键销售信号。
要求：
1. 区分"客户说的客观事实"与"你的推断"，不杜撰。
2. 聚焦三类信号：决策（客户已做的决定/承诺）、异议（顾虑/反对/未决）、下一步（双方约定的后续动作/时间）。
3. 只返回一段中文摘要文本（≤150字），严格按以下格式，不要解释、不要多余符号：
摘要：<用一句话概括这次互动的核心进展>
决策：<客户确认的决策或承诺，无则写"无">
异议：<客户的顾虑或未决点，无则写"无">
下一步：<约定的后续动作，无则写"无">

这是 SSM 销售方法论的数据底座：高质量、可追溯的互动信号，是后续阶段判定与九宫图等工具的唯一真相源。`;

const USER_PROMPT = `类型：{{type}}
主题：{{title}}
内容：
{{content}}`;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; interactionId: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 三重归属校验
  const target = await db.projectInteraction.findFirst({
    where: {
      id: params.interactionId,
      projectId: params.id,
      tenantId: auth.tenantId,
    },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      rawContent: true,
    },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const text = (target.content || "").trim() || (target.rawContent || "").trim();
  if (!text) {
    return NextResponse.json(
      { error: "该互动没有可分析的正文内容" },
      { status: 400 },
    );
  }

  // 自愈合：确保 interaction-summary 提示词模板存在（全局默认）
  const existing = await db.promptTemplate.findFirst({
    where: { toolType: TOOL, isActive: true },
    orderBy: [{ tenantId: "desc" }, { version: "desc" }],
  });
  if (!existing) {
    await db.promptTemplate.create({
      data: {
        tenantId: null,
        toolType: TOOL,
        name: "互动纪要信号抽取",
        systemPrompt: SYSTEM_PROMPT,
        userPromptTemplate: USER_PROMPT,
        variables: JSON.stringify(["type", "title", "content"]),
        modelConfig: JSON.stringify({
          model: "Dayi",
          temperature: 0.2,
          maxTokens: 512,
        }),
        version: 1,
        isActive: true,
      },
    });
  }

  try {
    const result = await callAI({
      toolType: TOOL,
      input: {
        type: target.type,
        title: target.title,
        content: text,
      },
      userId: auth.id,
      tenantId: auth.tenantId,
    });

    const summary = (result.content || "").trim();
    await db.projectInteraction.update({
      where: { id: target.id },
      data: { aiSummary: summary },
    });

    return NextResponse.json({ aiSummary: summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 摘要生成失败";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
