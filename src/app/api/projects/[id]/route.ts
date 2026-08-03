import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";

// GET /api/projects/[id] — 读取单个项目（含所有模块数据，供前端直接渲染）
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    // 不硬编码 tenantId：多租户过滤交由 Prisma 守卫按 dataScope 处理
    // （SELF=本人 / TENANT=全部门 / ALL=跨租户全部）。
    where: { id: params.id },
    include: { moduleData: true },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

// PATCH /api/projects/[id] — 更新项目基础信息
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const result = await db.project.updateMany({
    // 不硬编码 tenantId：多租户过滤交由 Prisma 守卫按 dataScope 处理
    // （SELF=本人 / TENANT=全部门 / ALL=跨租户全部）。
    where: { id: params.id },
    data: {
      name: body.name,
      customer: body.customer,
      industry: body.industry,
      contact: body.contact,
      contactTitle: body.contactTitle,
      stage: body.stage,
      estimatedValue: body.estimatedValue,
      pain: body.pain,
      products: body.products,
      initiatives: body.initiatives,
      competitors: body.competitors,
      extra: body.extra,
      status: body.status,
      // 阶段建议字段（由 Python 阶段分类服务返回后，前端回写 / 人确认闸门使用）
      suggestedStage: body.suggestedStage,
      stageEvidence: body.stageEvidence,
      stageSuggestedAt: body.stageSuggestedAt,
      stageConfirmedAt: body.stageConfirmedAt,
    },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/projects/[id] — 删除项目（级联删除模块数据）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db.project.deleteMany({
    // 不硬编码 tenantId：多租户过滤交由 Prisma 守卫按 dataScope 处理
    // （SELF=本人 / TENANT=全部门 / ALL=跨租户全部）。
    where: { id: params.id },
  });

  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
