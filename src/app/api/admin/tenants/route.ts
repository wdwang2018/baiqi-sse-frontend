import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { Plan } from "@prisma/client";

// GET /api/admin/tenants — 列出全部部门（含用户数）。仅系统管理员可见。
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.dataScope !== "ALL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenants = await db.tenant.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json(tenants);
}

// POST /api/admin/tenants — 新建部门（多租户实体）
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.dataScope !== "ALL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const plan = (String(body.plan ?? "FREE").toUpperCase() === "ENTERPRISE"
    ? "ENTERPRISE"
    : String(body.plan ?? "FREE").toUpperCase() === "PRO"
      ? "PRO"
      : "FREE") as Plan;

  if (!name)
    return NextResponse.json({ error: "部门名称必填" }, { status: 400 });

  try {
    const tenant = await db.tenant.create({ data: { name, plan } });
    return NextResponse.json(tenant, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "P2002")
      return NextResponse.json({ error: "部门名称已存在" }, { status: 409 });
    console.error("[api/admin/tenants] create failed:", err);
    return NextResponse.json({ error: e?.message || "创建部门失败" }, { status: 500 });
  }
}
