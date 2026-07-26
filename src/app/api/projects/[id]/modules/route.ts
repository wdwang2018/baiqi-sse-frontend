import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";

// GET /api/projects/[id]/modules — 读取该项目下所有模块的 JSONB 数据
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 租户隔离校验
  const project = await db.project.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const modules = await db.projectModuleData.findMany({
    where: { projectId: params.id, tenantId: auth.tenantId },
  });

  return NextResponse.json(modules);
}

// PUT /api/projects/[id]/modules — 保存一次结果（写入一个新的版本行）
//
// body: { moduleType: "nine-grid", data: {...} }
// 写入万能结果库（ProjectModuleData 表）。每次保存都 INSERT 新行（不再覆盖旧版本），
// version 在同一 projectId+moduleType 下自增，形成可回溯的「版本目录」。
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { moduleType, data } = body;

  if (!moduleType || data === undefined) {
    return NextResponse.json(
      { error: "moduleType 和 data 均为必填" },
      { status: 400 },
    );
  }

  const project = await db.project.findFirst({
    where: { id: params.id, tenantId: auth.tenantId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 计算下一个版本号（同一 project + moduleType 下自增）
  const maxRow = await db.projectModuleData.findFirst({
    where: { projectId: params.id, moduleType, tenantId: auth.tenantId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (maxRow?.version ?? 0) + 1;

  const created = await db.projectModuleData.create({
    data: {
      tenantId: auth.tenantId,
      projectId: params.id,
      moduleType,
      data,
      version: nextVersion,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
