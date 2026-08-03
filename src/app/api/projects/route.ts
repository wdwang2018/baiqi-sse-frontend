import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { projectScopeWhere } from "@/lib/project-access";

// GET /api/projects — 列出当前租户下所有项目（基础物科库）
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 注意：不在此处硬编码 tenantId。多租户过滤交由 Prisma 守卫（src/lib/db.ts）
  // 按 dataScope 处理：SELF=本人、TENANT=全部门、ALL=跨租户全部。
  const projects = await db.project.findMany({
    where: projectScopeWhere(auth),
    orderBy: { updatedAt: "desc" },
    include: {
      // 带回该项目的所有保存版本（万能结果库），按版本倒序，供历史页直接渲染版本目录
      moduleData: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          moduleType: true,
          version: true,
          createdAt: true,
          data: true,
        },
      },
    },
  });

  return NextResponse.json(projects);
}

// POST /api/projects — 创建新项目
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  if (!body.customer?.trim()) {
    return NextResponse.json({ error: "客户名称必填" }, { status: 400 });
  }

  try {
    const project = await db.project.create({
      data: {
        tenantId: auth.tenantId,
        createdBy: auth.id,
        name: body.name?.trim() || `${body.customer} - 项目`,
        customer: body.customer,
        industry: body.industry ?? null,
        contact: body.contact ?? null,
        contactTitle: body.contactTitle ?? null,
        stage: body.stage ?? null,
        estimatedValue: body.estimatedValue ?? null,
        pain: body.pain ?? null,
        products: body.products ?? null,
        initiatives: body.initiatives ?? null,
        competitors: body.competitors ?? null,
        extra: body.extra ?? null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[api/projects] create failed:", err);
    const msg = err instanceof Error ? err.message : "创建项目失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
