import { db } from "@/lib/db";
import { BUILTIN_PROMPTS } from "./builtin-prompts";

interface AIGatewayParams {
  toolType: string;
  input: Record<string, unknown>;
  userId: string;
  tenantId: string;
  modelOverride?: string;
  /** 浏览器会话 Cookie，透传给 AI 端以复用其鉴权（与九宫格同源）。 */
  authCookie?: string;
}

interface AIGatewayResult {
  content: string;
  tokensUsed: number;
  model: string;
  durationMs: number;
}

/**
 * AI 网关 — 服务端统一入口
 *
 * 职责：
 * 1. 从数据库加载 Prompt 模板（租户级覆盖 > 全局默认）；数据库无模板时回退到
 *    内置默认 Prompt 注册表（BUILTIN_PROMPTS），保证新模块开箱即用。
 * 2. 填充变量后，把拼装好的 system/user 提示词委托给 AI 端 `/api/ai/generate`
 *    执行真实 LLM 调用（由 AI 端持 DEEPSEEK_API_KEY，密钥绝不落母舰）。
 * 3. 记录调用日志用于审计和计费
 * 4. 更新租户用量计数
 *
 * 与九宫格完全同源：实际大模型调用一律发生在 AI 端。
 */
export async function callAI({
  toolType,
  input,
  userId,
  tenantId,
  modelOverride,
  authCookie,
}: AIGatewayParams): Promise<AIGatewayResult> {
  const startTime = Date.now();

  const template = await db.promptTemplate.findFirst({
    where: {
      toolType,
      OR: [{ tenantId }, { tenantId: null }],
      isActive: true,
    },
    orderBy: [{ tenantId: "desc" }, { version: "desc" }],
  });

  let systemPrompt: string;
  let userPrompt: string;
  let modelConfig: { model: string; temperature: number; maxTokens: number };
  let promptTemplateId: string | null = null;

  if (template) {
    systemPrompt = template.systemPrompt;
    userPrompt = fillTemplate(template.userPromptTemplate, input);
    modelConfig = JSON.parse(template.modelConfig) as {
      model: string;
      temperature: number;
      maxTokens: number;
    };
    promptTemplateId = template.id;
  } else {
    // 回退到内置默认 Prompt（无需手动灌种子即可运行）
    const builtin = BUILTIN_PROMPTS[toolType];
    if (!builtin) {
      throw new Error(`No active prompt template for tool: ${toolType}`);
    }
    systemPrompt = builtin.systemPrompt;
    userPrompt = fillTemplate(builtin.userPromptTemplate, input);
    modelConfig = builtin.modelConfig;
  }

  const model = modelOverride || modelConfig.model;

  const result = await callLLM({
    model,
    systemPrompt,
    userPrompt,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    authCookie,
  });

  const durationMs = Date.now() - startTime;

  await db.aICall.create({
    data: {
      tenantId,
      userId,
      promptTemplateId,
      toolType,
      input: JSON.stringify(input),
      output: JSON.stringify({ content: result.content }),
      model,
      tokensUsed: result.tokensUsed,
      durationMs,
      status: "SUCCESS",
    },
  });

  await db.tenant.update({
    where: { id: tenantId },
    data: { aiUsed: { increment: 1 } },
  });

  return {
    content: result.content,
    tokensUsed: result.tokensUsed,
    model,
    durationMs,
  };
}

function fillTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = variables[key];
    return val !== undefined ? String(val) : "";
  });
}

async function callLLM(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  authCookie?: string;
}): Promise<{ content: string; tokensUsed: number }> {
  // 与九宫格同源：实际 LLM 调用委托给 AI 端（由 AI 端持 DEEPSEEK_API_KEY 执行）。
  // 母舰只负责拼装提示词、记录 aICall 日志、更新租户用量；密钥仅在 AI 端，绝不落母舰。
  const base =
    process.env.AI_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "";
  if (!base) {
    throw new Error(
      "未配置 AI 服务地址（请设置 AI_SERVICE_URL 或 NEXT_PUBLIC_API_URL）",
    );
  }
  const url = `${base.replace(/\/$/, "")}/api/ai/generate`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(params.authCookie ? { cookie: params.authCookie } : {}),
    },
    body: JSON.stringify({
      system_prompt: params.systemPrompt,
      user_prompt: params.userPrompt,
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`AI 服务调用失败 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const usage = data.usage || {};
  return {
    content: data.content || "",
    tokensUsed: Number(usage.total_tokens) || 0,
  };
}
