import { db } from "@/lib/db";

interface AIGatewayParams {
  toolType: string;
  input: Record<string, unknown>;
  userId: string;
  tenantId: string;
  modelOverride?: string;
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
 * 1. 从数据库加载 Prompt 模板（租户级覆盖 > 全局默认）
 * 2. 填充变量后调用 LLM API（密钥仅在服务端，永不暴露给浏览器）
 * 3. 记录调用日志用于审计和计费
 * 4. 更新租户用量计数
 */
export async function callAI({
  toolType,
  input,
  userId,
  tenantId,
  modelOverride,
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

  if (!template) {
    throw new Error(`No active prompt template for tool: ${toolType}`);
  }

  const systemPrompt = template.systemPrompt;
  const userPrompt = fillTemplate(template.userPromptTemplate, input);

  const modelConfig = JSON.parse(template.modelConfig) as {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  const model = modelOverride || modelConfig.model;

  const result = await callLLM({
    model,
    systemPrompt,
    userPrompt,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
  });

  const durationMs = Date.now() - startTime;

  await db.aICall.create({
    data: {
      tenantId,
      userId,
      promptTemplateId: template.id,
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
}): Promise<{ content: string; tokensUsed: number }> {
  if (params.model.startsWith("gpt")) {
    return callOpenAI(params);
  }
  if (params.model.startsWith("claude")) {
    return callAnthropic(params);
  }
  if (params.model.startsWith("deepseek")) {
    return callDeepSeek(params);
  }
  // SenseCare / any OpenAI-compatible endpoint
  if (params.model.startsWith("Dayi")) {
    return callOpenAICompatible(params, {
      url: process.env.SENSECARE_API_URL!,
      apiKey: process.env.SENSECARE_API_KEY!,
    });
  }
  throw new Error(`Unknown model: ${params.model}`);
}

async function callOpenAI(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}): Promise<{ content: string; tokensUsed: number }> {
  return callOpenAICompatible(params, {
    url: "https://api.openai.com/v1/chat/completions",
    apiKey: process.env.OPENAI_API_KEY!,
  });
}

async function callOpenAICompatible(
  params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
  },
  config: { url: string; apiKey: string },
): Promise<{ content: string; tokensUsed: number }> {
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`LLM API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawContent = data.choices[0]?.message?.content || "";
  const reasoning = data.choices[0]?.message?.reasoning_content || "";
  const finishReason = data.choices[0]?.finish_reason || "";

  // 推理模型（如 Dayi）可能因 max_tokens 不足导致 content 为空
  if (!rawContent && reasoning) {
    throw new Error(
      `LLM 返回内容为空（finish_reason=${finishReason}）。模型推理已耗尽 token，请增大 maxTokens 配置。` +
      `推理摘要: ${reasoning.slice(0, 200)}...`
    );
  }

  if (!rawContent) {
    throw new Error(
      `LLM 返回内容为空（finish_reason=${finishReason}）`
    );
  }

  return {
    content: rawContent,
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

async function callAnthropic(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}): Promise<{ content: string; tokensUsed: number }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.statusText}`);

  const data = await res.json();
  return {
    content: data.content[0]?.text || "",
    tokensUsed:
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function callDeepSeek(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}): Promise<{ content: string; tokensUsed: number }> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek API error: ${res.statusText}`);

  const data = await res.json();
  return {
    content: data.choices[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens || 0,
  };
}
