/**
 * 导航菜单 — 按「白起 SSE · 十大销售辅助工具」(test001) 的菜单结构组织
 * 四大分区：核心 / 十大销售辅助工具 / 智能辅助 / 系统
 *
 * 九宫图生成器为已落地模块（路由 /nine-grid，不修改）；
 * 其余模块指向统一的占位页 /module/[slug]，显示「建设中」，避免 404。
 */

export interface NavItem {
  id: string;
  name: string;
  icon: string; // lucide 图标名
  route: string;
  badge?: string; // 右侧彩色徽章文字，如 AI / 本体 / 36计
  badgeColor?: string; // 徽章背景色，缺省为琥珀色 #f59e0b
  adminOnly?: boolean; // 仅系统管理员（dataScope=ALL）可见，其它租户/主管不可见
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "核心",
    items: [
      { id: "home", name: "项目总览", icon: "Home", route: "/" },
      { id: "projects", name: "项目汇总库", icon: "Database", route: "/projects", badge: "库", badgeColor: "#0f766e" },
      {
        id: "pipeline",
        name: "销售7阶段",
        icon: "Filter",
        route: "/module/pipeline",
        badge: "漏斗",
        badgeColor: "#0891b2",
      },
      { id: "review", name: "AI 工作点评", icon: "Sparkles", route: "/module/review", badge: "AI" },
      { id: "tasks", name: "综合任务清单", icon: "ListChecks", route: "/module/tasks", badge: "AI" },
    ],
  },
  {
    title: "十大销售辅助工具",
    items: [
      { id: "nine-grid", name: "九宫图生成器", icon: "LayoutGrid", route: "/nine-grid", badge: "AI" },
      { id: "value-proposition", name: "价值主张", icon: "Gem", route: "/module/value-proposition", badge: "AI" },
      { id: "buy-vision", name: "购买愿景", icon: "Telescope", route: "/module/buy-vision", badge: "AI" },
      { id: "competitive", name: "竞争策略", icon: "Swords", route: "/module/competitive", badge: "AI" },
      { id: "business-impact", name: "生意影响", icon: "TrendingUp", route: "/module/business-impact", badge: "AI" },
      { id: "pain-chain", name: "疼痛链", icon: "Link", route: "/module/pain-chain", badge: "AI" },
      { id: "key-people", name: "关键人物", icon: "Users", route: "/module/key-people", badge: "AI" },
      { id: "opportunity-eval", name: "商机评估", icon: "Coins", route: "/module/opportunity-eval", badge: "AI" },
      { id: "solution", name: "解决方案", icon: "Puzzle", route: "/module/solution", badge: "AI" },
      { id: "diff-analysis", name: "差异化分析", icon: "Scale", route: "/module/diff-analysis", badge: "AI" },
    ],
  },
  {
    title: "智能辅助",
    items: [
      { id: "consult", name: "日常咨询", icon: "MessageCircle", route: "/module/consult", badge: "AI" },
      { id: "ontology", name: "关系图谱", icon: "Network", route: "/module/ontology", badge: "本体", badgeColor: "#059669" },
      { id: "war-lab", name: "战情Lab", icon: "FlaskConical", route: "/module/war-lab", badge: "36计", badgeColor: "#7c3aed" },
      { id: "growth", name: "本体成长", icon: "Brain", route: "/module/growth", badge: "OCEAN", badgeColor: "#059669" },
    ],
  },
  {
    title: "系统",
    items: [
      { id: "history", name: "历史记录", icon: "BookOpen", route: "/module/history" },
      { id: "settings", name: "API 设置", icon: "Settings", route: "/module/settings" },
      {
        id: "reports",
        name: "报表演示",
        icon: "BarChart3",
        route: "/module/reports",
        badge: "NEW",
        badgeColor: "#0891b2",
      },
    ],
  },
  {
    title: "系统管理",
    items: [
      // 仅系统管理员（dataScope=ALL）可见：跨租户管理用户与部门
      {
        id: "user-admin",
        name: "用户管理",
        icon: "Users",
        route: "/admin/users",
        adminOnly: true,
        badge: "管理员",
        badgeColor: "#dc2626",
      },
    ],
  },
];

/** 按 id 查找菜单项（占位页用） */
export function findNavItem(id: string): NavItem | undefined {
  for (const sec of NAV_SECTIONS) {
    const found = sec.items.find((i) => i.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * AI 模型配置
 */
export const AI_MODELS = {
  OPENAI: {
    "gpt-4o": { name: "GPT-4o", maxTokens: 4096, costPer1k: 0.005 },
    "gpt-4o-mini": { name: "GPT-4o Mini", maxTokens: 4096, costPer1k: 0.0003 },
  },
  ANTHROPIC: {
    "claude-sonnet-4-20250514": {
      name: "Claude Sonnet 4",
      maxTokens: 4096,
      costPer1k: 0.003,
    },
    "claude-3-5-haiku-20241022": {
      name: "Claude 3.5 Haiku",
      maxTokens: 4096,
      costPer1k: 0.0008,
    },
  },
  DEEPSEEK: {
    "deepseek-chat": { name: "DeepSeek Chat", maxTokens: 4096, costPer1k: 0.001 },
  },
} as const;

/**
 * OCEAN 五维人格
 */
export const OCEAN_DIMENSIONS = [
  { key: "openness", label: "开放性", description: "对新经验的接受程度" },
  { key: "conscientiousness", label: "尽责性", description: "目标导向和自律程度" },
  { key: "extraversion", label: "外向性", description: "社交活跃和能量表达" },
  { key: "agreeableness", label: "宜人性", description: "合作和同理心倾向" },
  { key: "neuroticism", label: "神经质", description: "情绪稳定性程度" },
] as const;

/**
 * 36计策略列表（用于战情Lab）
 */
export const STRATEGIES_36 = [
  "瞒天过海", "围魏救赵", "借刀杀人", "以逸待劳", "趁火打劫", "声东击西",
  "无中生有", "暗度陈仓", "隔岸观火", "笑里藏刀", "李代桃僵", "顺手牵羊",
  "打草惊蛇", "借尸还魂", "调虎离山", "欲擒故纵", "抛砖引玉", "擒贼擒王",
  "釜底抽薪", "混水摸鱼", "金蝉脱壳", "关门捉贼", "远交近攻", "假道伐虢",
  "偷梁换柱", "指桑骂槐", "假痴不癫", "上屋抽梯", "树上开花", "反客为主",
  "美人计", "空城计", "反间计", "苦肉计", "连环计", "走为上计",
] as const;

/**
 * SSM 七阶段（IBM Signature Selling Method）标准阶段字符串
 * 格式以数字开头，便于漏斗/阶段解析按首字符取阶段号
 */
export const SSM_STAGE_OPTIONS = [
  "1 - 关注（Awareness）",
  "2 - 发现（Discovery）",
  "3 - 证实（Validation）",
  "4 - 合格（Qualification）",
  "5 - 投标（Proposal）",
  "6 - 赢单（Win）",
  "7 - 完成（Closed）",
] as const;

/** 从阶段字符串（如 "3 - 证实（Validation）"）解析出阶段号 1-7，失败返回 0 */
export function stageNum(stage?: string | null): number {
  if (!stage) return 0;
  const m = stage.match(/^\s*(\d)/);
  const n = m ? parseInt(m[1], 10) : 0;
  return n >= 1 && n <= 7 ? n : 0;
}
