/**
 * 模块 UI 注册表
 * ---------------------------------------------------------------
 * 通用模块页 module/[slug] 依据本表渲染「表单 → /api/ai → Markdown」界面。
 * 新增一个标准「表单→AI」模块 = 在此加一条配置（无需新建页面文件）。
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
}

export interface ModuleConfig {
  slug: string;
  name: string;
  icon: string; // lucide 图标名
  description: string;
  category: string;
  fields: ModuleField[];
  output: "markdown" | "text" | "json";
  /** 是否显示「从项目汇总库载入」选择器，自动填充相关字段 */
  projectContext?: boolean;
  intro?: string;
}

import { SSM_STAGE_OPTIONS } from "../constants";

const STAGE_OPTS = SSM_STAGE_OPTIONS.map((s) => ({ value: s, label: s }));

export const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  "value-proposition": {
    slug: "value-proposition",
    name: "价值主张",
    icon: "Gem",
    description: "基于客户痛点与方案能力，生成结构化价值主张声明",
    category: "十大销售辅助工具",
    projectContext: true,
    intro: "可先「从项目载入」自动带入痛点与方案，再生成价值主张。",
    output: "markdown",
    fields: [
      { key: "industry", label: "行业", type: "text", placeholder: "如：智能制造 / 金融银行", required: true },
      { key: "pain", label: "客户核心痛点", type: "textarea", rows: 3, placeholder: "客户当前面临的关键业务挑战", required: true },
      { key: "product", label: "我方产品 / 方案", type: "textarea", rows: 3, placeholder: "我方能提供的能力或方案", required: true },
      { key: "competitor", label: "竞争对手（可选）", type: "text", placeholder: "主要竞品名称" },
    ],
  },

  "buy-vision": {
    slug: "buy-vision",
    name: "购买愿景",
    icon: "Telescope",
    description: "帮助客户描绘理想未来状态，建立购买愿景",
    category: "十大销售辅助工具",
    projectContext: true,
    output: "markdown",
    fields: [
      { key: "current", label: "当前状态画像", type: "textarea", rows: 3, placeholder: "客户现状描述", required: true },
      { key: "goal", label: "期望目标 / 理想状态", type: "textarea", rows: 3, placeholder: "希望达成的未来状态", required: true },
      { key: "focus", label: "决策人关注点（可选）", type: "text", placeholder: "如：成本 / 合规 / 效率" },
    ],
  },

  competitive: {
    slug: "competitive",
    name: "竞争策略",
    icon: "Swords",
    description: "针对竞争对抗场景，给出破局策略与话术",
    category: "十大销售辅助工具",
    output: "markdown",
    fields: [
      { key: "rival", label: "竞争对手", type: "text", placeholder: "竞品厂商名称", required: true },
      { key: "rivalProd", label: "竞品产品", type: "text", placeholder: "竞品主打产品/方案" },
      { key: "ourProd", label: "我方产品", type: "text", placeholder: "我方对应产品/方案" },
      { key: "context", label: "竞争场景 / 背景", type: "textarea", rows: 3, placeholder: "客户场景、采购阶段、我方优劣势等" },
    ],
  },

  "diff-analysis": {
    slug: "diff-analysis",
    name: "差异化分析",
    icon: "Scale",
    description: "系统化对比我方与竞品，提炼差异化卖点",
    category: "十大销售辅助工具",
    output: "markdown",
    fields: [
      { key: "ourName", label: "我方名称", type: "text", placeholder: "我方 / 方案名" },
      { key: "ourPros", label: "我方优势", type: "textarea", rows: 2, placeholder: "我方核心优势" },
      { key: "ourCons", label: "我方劣势", type: "textarea", rows: 2, placeholder: "我方相对短板" },
      { key: "compName", label: "竞品名称", type: "text", placeholder: "竞品 / 方案名" },
      { key: "compPros", label: "竞品优势", type: "textarea", rows: 2, placeholder: "竞品核心优势" },
      { key: "compCons", label: "竞品劣势", type: "textarea", rows: 2, placeholder: "竞品短板" },
      { key: "criteria", label: "客户最看重（可选）", type: "text", placeholder: "如：总拥有成本 / 实施速度" },
      { key: "context", label: "场景（可选）", type: "textarea", rows: 2, placeholder: "应用行业 / 客户类型" },
    ],
  },

  solution: {
    slug: "solution",
    name: "解决方案",
    icon: "Puzzle",
    description: "基于痛点与能力，生成分层解决方案架构",
    category: "十大销售辅助工具",
    projectContext: true,
    output: "markdown",
    fields: [
      { key: "pain", label: "客户痛点", type: "textarea", rows: 3, placeholder: "需要解决的业务挑战", required: true },
      { key: "capability", label: "我方能力 / 方案", type: "textarea", rows: 3, placeholder: "我方能提供的能力", required: true },
      { key: "cases", label: "成功案例（可选）", type: "textarea", rows: 2, placeholder: "可引用的同类客户案例" },
    ],
  },

  "key-people": {
    slug: "key-people",
    name: "关键人物",
    icon: "Users",
    description: "梳理经济买家 / 教练 / 决策者等角色并给出策略",
    category: "十大销售辅助工具",
    projectContext: true,
    output: "markdown",
    fields: [
      { key: "customer", label: "客户", type: "text", placeholder: "客户名称", required: true },
      { key: "industry", label: "行业", type: "text", placeholder: "客户行业" },
      { key: "economicBuyer", label: "经济买家", type: "text", placeholder: "握有预算签字权的人" },
      { key: "userBuyer", label: "用户买家", type: "text", placeholder: "实际使用方" },
      { key: "technicalBuyer", label: "技术买家", type: "text", placeholder: "技术评估方" },
      { key: "coach", label: "教练", type: "text", placeholder: "内部支持/指导者" },
      { key: "evaluator", label: "评估者", type: "text", placeholder: "方案评估人" },
      { key: "sponsor", label: "赞助者", type: "text", placeholder: "高层赞助人" },
      { key: "decisionMaker", label: "决策者", type: "text", placeholder: "最终拍板人" },
      { key: "blocker", label: "阻碍者", type: "text", placeholder: "可能反对的人" },
    ],
  },

  "pain-chain": {
    slug: "pain-chain",
    name: "疼痛链",
    icon: "Link",
    description: "分析痛点传导路径，找到最佳切入点与话术",
    category: "十大销售辅助工具",
    projectContext: true,
    output: "markdown",
    fields: [
      { key: "customer", label: "客户", type: "text", placeholder: "客户名称", required: true },
      { key: "industry", label: "行业", type: "text", placeholder: "客户行业" },
      { key: "pain", label: "核心痛点", type: "textarea", rows: 3, placeholder: "客户当前最痛的问题", required: true },
    ],
  },

  "business-impact": {
    slug: "business-impact",
    name: "生意影响",
    icon: "TrendingUp",
    description: "评估我方能力与客户业务举措（BI）的契合度",
    category: "十大销售辅助工具",
    output: "markdown",
    fields: [
      { key: "initiative", label: "客户业务举措（BI）", type: "textarea", rows: 3, placeholder: "客户今年的重点业务方向", required: true },
      { key: "capability", label: "我方能力 / 方案", type: "textarea", rows: 3, placeholder: "我方对应的能力或方案", required: true },
      { key: "context", label: "背景（可选）", type: "textarea", rows: 2, placeholder: "行业 / 决策背景" },
    ],
  },

  review: {
    slug: "review",
    name: "AI 工作点评",
    icon: "Sparkles",
    description: "基于行为日志与阶段，给出师傅式工作点评",
    category: "核心",
    projectContext: true,
    output: "markdown",
    fields: [
      { key: "project", label: "项目名称", type: "text", placeholder: "项目名", required: true },
      { key: "customer", label: "客户", type: "text", placeholder: "客户名称", required: true },
      { key: "stage", label: "当前 SSM 阶段", type: "select", options: STAGE_OPTS, required: true },
      { key: "industry", label: "行业", type: "text", placeholder: "客户行业" },
      { key: "period", label: "点评时间段", type: "text", placeholder: "如：2026 Q3" },
      { key: "logs", label: "行为日志（每行一条）", type: "textarea", rows: 6, placeholder: "例：\n[周一 拜访] 与 IT 总监对齐需求\n[周三 邮件] 发送方案初稿", required: true },
    ],
  },
};

export function getModuleConfig(slug: string): ModuleConfig | undefined {
  return MODULE_REGISTRY[slug];
}
