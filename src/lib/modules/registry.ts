/**
 * 模块 UI 注册表
 * ---------------------------------------------------------------
 * 通用模块页 module/[slug] 依据本表渲染「表单 → 后端具体工具路由 → 结构化结果」界面。
 *
 * 关键约定（与 AI 端 sse-ai-backend 对齐）：
 *  - 每个模块对应 AI 端一个**按工具精准划分**的路由（config.route），如 "value-prop"。
 *  - 表单字段 key 与后端对应 Input schema 字段**一一对应**（不再在浏览器组装提示词，
 *    也不经母舰 /api/ai 网关）。
 *  - 后端返回工具专属的**结构化对象**（如 value-prop → {elevator_pitch, ...}），
 *    由前端 StructuredResult 通用渲染。
 *
 * 交互复杂的模块（关系图谱 / 战情Lab / 本体成长 / 报表库 / 历史 / 设置）
 * 走各自独立的定制页面（module/<slug>/page.tsx 优先级高于 [slug]）。
 */

export type FieldType = "text" | "textarea" | "select";

export interface ModuleField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  helpText?: string;
  options?: { value: string; label: string }[];
  /** 文本域按行拆分为数组传给后端（如 review 的 logs / unmet_conditions） */
  array?: boolean;
  /** 转为整数传给后端（如 review.stage） */
  integer?: boolean;
}

export interface ModuleConfig {
  slug: string;
  name: string;
  icon: string; // lucide 图标名
  description: string;
  category: string;
  /** AI 端工具路由段，如 "value-prop"（实际请求 /api/ai/value-prop） */
  route: string;
  fields: ModuleField[];
  /** 是否显示「从项目汇总库载入」选择器，自动填充相关字段 */
  projectContext?: boolean;
  intro?: string;
}

import { SSM_STAGE_OPTIONS } from "../constants";

const STAGE_OPTS = SSM_STAGE_OPTIONS.map((s, i) => ({ value: String(i + 1), label: s }));

export const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  "value-proposition": {
    slug: "value-proposition",
    name: "价值主张",
    icon: "Gem",
    description: "基于客户痛点与方案能力，生成结构化价值主张声明",
    category: "十大销售辅助工具",
    route: "value-prop",
    projectContext: true,
    intro: "可先「从项目载入」自动带入客户与痛点，再生成价值主张。",
    fields: [
      { key: "customer_name", label: "客户名称", type: "text", placeholder: "如：某银行总行", required: true },
      { key: "core_pain", label: "客户核心痛点", type: "textarea", rows: 3, placeholder: "客户当前面临的关键业务挑战", required: true },
      { key: "our_product", label: "我方产品 / 方案", type: "textarea", rows: 3, placeholder: "我方能提供的能力或方案", required: true },
      { key: "competitor", label: "竞争对手（可选）", type: "text", placeholder: "主要竞品名称" },
    ],
  },

  "buy-vision": {
    slug: "buy-vision",
    name: "购买愿景",
    icon: "Telescope",
    description: "帮助客户描绘理想未来状态，建立购买愿景",
    category: "十大销售辅助工具",
    route: "buying-vision",
    projectContext: true,
    fields: [
      { key: "customer", label: "客户", type: "text", placeholder: "客户名称", required: true },
      { key: "current_state", label: "当前状态画像", type: "textarea", rows: 3, placeholder: "客户现状描述", required: true },
      { key: "desired_state", label: "期望目标 / 理想状态", type: "textarea", rows: 3, placeholder: "希望达成的未来状态", required: true },
      { key: "our_product", label: "我方产品 / 方案", type: "textarea", rows: 3, placeholder: "我方对应产品/方案", required: true },
    ],
  },

  competitive: {
    slug: "competitive",
    name: "竞争策略",
    icon: "Swords",
    description: "针对竞争对抗场景，给出破局策略与话术",
    category: "十大销售辅助工具",
    route: "compete",
    fields: [
      { key: "customer", label: "客户", type: "text", placeholder: "客户名称", required: true },
      { key: "competitor_name", label: "竞争对手", type: "text", placeholder: "竞品厂商名称", required: true },
      { key: "their_product_cons", label: "竞品短板 / 劣势", type: "textarea", rows: 3, placeholder: "竞品产品的薄弱点", required: true },
      { key: "our_product_pros", label: "我方产品 / 优势", type: "textarea", rows: 3, placeholder: "我方对应产品及优势", required: true },
      { key: "customer_criteria", label: "客户最看重", type: "text", placeholder: "如：总拥有成本 / 实施速度", required: true },
    ],
  },

  "diff-analysis": {
    slug: "diff-analysis",
    name: "差异化分析",
    icon: "Scale",
    description: "系统化对比我方与竞品，提炼差异化卖点",
    category: "十大销售辅助工具",
    route: "diff-analysis",
    intro: "⚠️ 后端路由 /api/ai/diff-analysis 当前尚未部署，提交后将返回 404，待后端补齐该工具。",
    fields: [
      { key: "customer_name", label: "客户名称", type: "text", placeholder: "客户名称", required: true },
      { key: "our_product", label: "我方产品 / 方案", type: "textarea", rows: 3, placeholder: "我方对应产品/方案", required: true },
      { key: "competitor_name", label: "竞品名称", type: "text", placeholder: "竞品 / 方案名", required: true },
      { key: "customer_criteria", label: "客户最看重", type: "text", placeholder: "如：总拥有成本 / 实施速度", required: true },
    ],
  },

  solution: {
    slug: "solution",
    name: "解决方案",
    icon: "Puzzle",
    description: "基于痛点与能力，生成分层解决方案架构",
    category: "十大销售辅助工具",
    route: "solution",
    projectContext: true,
    fields: [
      { key: "customer_name", label: "客户名称", type: "text", placeholder: "客户名称", required: true },
      { key: "core_pain", label: "客户核心痛点", type: "textarea", rows: 3, placeholder: "需要解决的业务挑战", required: true },
      { key: "our_product", label: "我方产品 / 方案", type: "textarea", rows: 3, placeholder: "我方能提供的能力", required: true },
      { key: "audience", label: "目标听众 / 受众", type: "text", placeholder: "如：CIO / 业务总监", required: true },
      { key: "duration", label: "方案周期 / 时长", type: "text", placeholder: "如：90 天试点", required: true },
    ],
  },

  "key-people": {
    slug: "key-people",
    name: "关键人物",
    icon: "Users",
    description: "基于行业与目标角色，给出关键人痛点、业务目标与切入话术",
    category: "十大销售辅助工具",
    route: "key-people",
    fields: [
      { key: "industry", label: "行业", type: "text", placeholder: "客户行业", required: true },
      { key: "target_role", label: "目标关键人角色", type: "text", placeholder: "如：CFO / 技术总监", required: true },
    ],
  },

  "pain-chain": {
    slug: "pain-chain",
    name: "疼痛链",
    icon: "Link",
    description: "分析痛点传导路径，找到最佳切入点与话术",
    category: "十大销售辅助工具",
    route: "pain-chain",
    projectContext: true,
    fields: [
      { key: "customer", label: "客户", type: "text", placeholder: "客户名称", required: true },
      { key: "base_pain", label: "基础痛点", type: "textarea", rows: 3, placeholder: "客户当前最痛的问题", required: true },
      { key: "base_role", label: "基础角色", type: "text", placeholder: "痛点的关联角色", required: true },
      { key: "target_role", label: "目标角色", type: "text", placeholder: "希望影响的决策者角色", required: true },
      { key: "our_product", label: "我方产品 / 方案", type: "textarea", rows: 3, placeholder: "我方对应产品/方案", required: true },
    ],
  },

  "business-impact": {
    slug: "business-impact",
    name: "生意影响",
    icon: "TrendingUp",
    description: "评估我方能力与客户业务举措（BI）的契合度与财务收益",
    category: "十大销售辅助工具",
    route: "biz-impact",
    fields: [
      { key: "customer", label: "客户", type: "text", placeholder: "客户名称", required: true },
      { key: "financial_focus", label: "财务关注点", type: "text", placeholder: "如：降本 / 增收 / 合规", required: true },
      { key: "current_wasted_cost", label: "当前浪费 / 损失成本", type: "textarea", rows: 3, placeholder: "客户当前的隐性成本或损失", required: true },
      { key: "our_expected_roi", label: "我方预期 ROI / 收益", type: "textarea", rows: 3, placeholder: "我方方案可带来的收益", required: true },
    ],
  },

  review: {
    slug: "review",
    name: "AI 工作点评",
    icon: "Sparkles",
    description: "基于行为日志与阶段，给出师傅式工作点评",
    category: "核心",
    route: "review",
    projectContext: true,
    fields: [
      { key: "project_name", label: "项目名称", type: "text", placeholder: "项目名", required: true },
      { key: "stage", label: "当前 SSM 阶段", type: "select", options: STAGE_OPTS, required: true, integer: true },
      { key: "unmet_conditions", label: "未满足的成交条件（每行一条）", type: "textarea", rows: 4, placeholder: "例：\n预算未批复\n决策人未对齐", required: true, array: true },
      { key: "logs", label: "行为日志（每行一条）", type: "textarea", rows: 6, placeholder: "例：\n[周一 拜访] 与 IT 总监对齐需求\n[周三 邮件] 发送方案初稿", required: true, array: true },
    ],
  },
};

export function getModuleConfig(slug: string): ModuleConfig | undefined {
  return MODULE_REGISTRY[slug];
}
