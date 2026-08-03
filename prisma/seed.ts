import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Upsert demo tenant + admin user
  const passwordHash = await bcrypt.hash("admin123", 10);

  // Find existing tenant or create new one
  let tenant = await prisma.tenant.findFirst({
    where: { name: "白起SSE 演示租户" },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "白起SSE 演示租户",
        plan: "PRO",
        maxUsers: 10,
        aiQuota: 5000,
      },
    });
    console.log(`Created tenant: ${tenant.name}`);
  } else {
    console.log(`Tenant already exists: ${tenant.name}`);
  }

  // Upsert admin user
  await prisma.user.upsert({
    where: { email: "admin@baiqi.ai" },
    update: {
      passwordHash,
      name: "管理员",
      role: "ADMIN",
      tenantId: tenant.id,
    },
    create: {
      email: "admin@baiqi.ai",
      passwordHash,
      name: "管理员",
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });

  console.log(`Admin user ready: admin@baiqi.ai / admin123`);

  // 2. Create default prompt templates for SSM tools
  const templates = [
    {
      toolType: "nine-grid",
      name: "九宫图生成器 v1",
      systemPrompt: `你是一位拥有20年经验的顶级企业销售顾问，精通Smart Selling Engine（SSM）。你的任务是帮助销售人员生成"九宫图愿景加工模型"的交流话术。

九宫图是SSM的核心工具。以客户的业务痛点为核心（第⑤格），从9个维度构建完整的交流框架：
1-业务原因：客户为何现在必须采取行动
2-业务结果：客户期望达成的业务目标
3-成功标准：如何衡量方案是否成功
4-现有能力：客户当前已有的资源/工具
5-业务痛点（核心）：最核心的一个痛点
6-能力差距：现有能力与期望结果的差距
7-我方方案：我方针对痛点的解决方案
8-独特价值：相比竞争对手的差异化
9-下一步行动：建议客户/销售下一步做什么

严格按照以下JSON格式输出，不要输出任何JSON之外的文字：
{"block_1":{"title":"业务原因","talking_point":"..."},"block_2":{"title":"业务结果","talking_point":"..."},"block_3":{"title":"成功标准","talking_point":"..."},"block_4":{"title":"现有能力","talking_point":"..."},"block_5":{"title":"业务痛点（核心）","talking_point":"..."},"block_6":{"title":"能力差距","talking_point":"..."},"block_7":{"title":"我方方案","talking_point":"..."},"block_8":{"title":"独特价值","talking_point":"..."},"block_9":{"title":"下一步行动","talking_point":"..."}}

话术写作原则：
- 每格2-4句完整中文句子，可直接在客户面前开口讲
- 语气：咨询式、平等对话，不是推销
- 第①②③格：聚焦客户视角，不提我方产品
- 第④⑤⑥格：诊断现状，引发共鸣
- 第⑦⑧格：自然引出我方方案，突出针对性
- 第⑨格：明确可操作的下一步，降低客户行动门槛
- 禁止：空话套话、过度承诺`,
      userPromptTemplate: `请为以下场景生成九宫图话术：

## 客户信息
- 客户名称：{{customer}}
- 行业：{{industry}}
- 对话对象：{{contact}}，职务：{{contactTitle}}

## 核心业务痛点
{{pain}}

## 我方相关产品/解决方案
{{products}}

## 客户业务举措（如已知）
{{initiatives}}

## 已知竞争对手（如有）
{{competitors}}

## 补充背景
{{extra}}

请严格按照JSON格式生成九宫图的9格话术。`,
      variables: [
        { name: "customer", description: "客户名称", required: true },
        { name: "industry", description: "行业", required: true },
        { name: "contact", description: "联系人姓名", required: true },
        { name: "contactTitle", description: "联系人职务", required: true },
        { name: "pain", description: "核心业务痛点", required: true },
        { name: "products", description: "我方产品/解决方案", required: true },
        { name: "initiatives", description: "客户业务举措", required: false },
        { name: "competitors", description: "已知竞争对手", required: false },
        { name: "extra", description: "补充背景", required: false },
      ],
      modelConfig: {
        model: "Dayi-v18-80b-a3b",
        temperature: 0.7,
        maxTokens: 8192,
      },
    },
    {
      toolType: "pain-chain",
      name: "痛点链分析 v1",
      systemPrompt:
        "你是 SSM 方法论的疼痛链分析专家。你的任务是从表层痛点追溯到业务痛点，再到根本痛点，形成完整的痛点链。输出 JSON 格式。",
      userPromptTemplate:
        "客户名称：{{customerName}}\n表层痛点描述：{{surfacePain}}\n\n请分析痛点链，返回 JSON：\n{\"pains\": [{\"level\": \"surface\", \"description\": \"...\", \"impact\": \"...\"}, {\"level\": \"business\", \"description\": \"...\", \"impact\": \"...\"}, {\"level\": \"root\", \"description\": \"...\", \"impact\": \"...\"}]}",
      variables: [
        { name: "customerName", description: "客户名称", required: true },
        {
          name: "surfacePain",
          description: "表层痛点描述",
          required: true,
        },
      ],
      modelConfig: {
        model: "Dayi-v18-80b-a3b",
        temperature: 0.6,
        maxTokens: 2048,
      },
    },
    {
      toolType: "ai-review",
      name: "AI工作点评 v1",
      systemPrompt:
        "你是一位严厉但建设性的销售管理者。你的任务是点评销售人员的近期工作，指出优点和不足，并给出具体的改进建议。点评要具体、可执行，避免空话套话。",
      userPromptTemplate:
        "销售人员：{{userName}}\n统计周期：{{period}}\n工作摘要：{{summary}}\n关键指标：{{metrics}}\n\n请给出工作点评，包括：\n1. 整体评价（100分制）\n2. 做得好的地方\n3. 需要改进的地方\n4. 具体建议",
      variables: [
        { name: "userName", description: "销售人员姓名", required: true },
        { name: "period", description: "统计周期", required: true },
        { name: "summary", description: "工作摘要", required: true },
        { name: "metrics", description: "关键指标", required: false },
      ],
      modelConfig: {
        model: "Dayi-v18-80b-a3b",
        temperature: 0.5,
        maxTokens: 2048,
      },
    },
    {
      toolType: "battle-lab",
      name: "战情Lab策略推演 v1",
      systemPrompt:
        "你是精通中国兵法三十六计的销售策略顾问。你的任务是根据当前销售战况，推荐合适的计策并给出具体的执行方案。输出要结合现代B2B销售场景，将古代智慧转化为可操作的销售策略。",
      userPromptTemplate:
        "当前战况：{{situation}}\n竞争态势：{{competition}}\n客户信息：{{customerInfo}}\n\n请推荐一个三十六计策略，并给出：\n1. 推荐计策及理由\n2. 具体执行方案\n3. 风险分析",
      variables: [
        { name: "situation", description: "当前战况", required: true },
        { name: "competition", description: "竞争态势", required: false },
        {
          name: "customerInfo",
          description: "客户信息",
          required: false,
        },
      ],
      modelConfig: {
        model: "Dayi-v18-80b-a3b",
        temperature: 0.8,
        maxTokens: 2048,
      },
    },
  ];

  for (const tpl of templates) {
    const created = await prisma.promptTemplate.upsert({
      where: {
        toolType_name: { toolType: tpl.toolType, name: tpl.name },
      },
      update: {
        systemPrompt: tpl.systemPrompt,
        userPromptTemplate: tpl.userPromptTemplate,
        variables: JSON.stringify(tpl.variables),
        modelConfig: JSON.stringify(tpl.modelConfig),
        isActive: true,
      },
      create: {
        toolType: tpl.toolType,
        name: tpl.name,
        systemPrompt: tpl.systemPrompt,
        userPromptTemplate: tpl.userPromptTemplate,
        variables: JSON.stringify(tpl.variables),
        modelConfig: JSON.stringify(tpl.modelConfig),
      },
    });
    console.log(`Upserted prompt template: ${created.name}`);
  }

  // 3. Seed RBAC 角色定义（AppRole）+ 绑定 admin 到 ADMIN
  const roles = [
    {
      code: "MEMBER",
      name: "普通员工",
      description: "仅可访问本人创建的数据",
      dataScope: "SELF" as const,
    },
    {
      code: "MANAGER",
      name: "部门主管",
      description: "可查看本租户（本部门）全部数据",
      dataScope: "TENANT" as const,
    },
    {
      code: "ADMIN",
      name: "系统管理员",
      description: "可跨租户查看所有数据",
      dataScope: "ALL" as const,
    },
  ];

  for (const r of roles) {
    await prisma.appRole.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description, dataScope: r.dataScope },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        dataScope: r.dataScope,
      },
    });
  }
  console.log("Seeded AppRoles: MEMBER / MANAGER / ADMIN");

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@baiqi.ai" },
  });
  const adminRole = await prisma.appRole.findUnique({
    where: { code: "ADMIN" },
  });
  if (adminUser && adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
      },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });
    console.log("Bound admin@baiqi.ai → ADMIN role (dataScope=ALL)");
  }

  console.log("\nSeed completed successfully!");
  console.log("Login: admin@baiqi.ai / admin123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
