import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { Role } from "@prisma/client";

const VALID_ROLES = ["MEMBER", "MANAGER", "ADMIN"] as const;

function forbid(res: NextResponse | null = null) {
  return res ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// PATCH /api/admin/users/[id] — 改角色（授权）或启/禁用账号
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.dataScope !== "ALL") return forbid();

  const id = params.id;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string" && ["ACTIVE", "DISABLED"].includes(body.status))
    data.status = body.status;
  if (
    typeof body.role === "string" &&
    VALID_ROLES.includes(body.role as (typeof VALID_ROLES)[number])
  ) {
    data.role = body.role as Role;
  }

  const user = await db.user.update({ where: { id }, data }).catch(() => null);
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  // 角色变更 → 替换 UserRole 绑定（保持单一主角色）
  if (
    typeof body.role === "string" &&
    VALID_ROLES.includes(body.role as (typeof VALID_ROLES)[number])
  ) {
    const appRole = await db.appRole.findUnique({ where: { code: body.role } });
    if (appRole) {
      await db.userRole.deleteMany({ where: { userId: id } });
      await db.userRole.create({ data: { userId: id, roleId: appRole.id } });
    }
  }

  return NextResponse.json(user);
}

// DELETE /api/admin/users/[id] — 软删除（置 DISABLED），保留历史数据，禁止物理删除
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.dataScope !== "ALL") return forbid();

  const id = params.id;
  const user = await db.user
    .update({ where: { id }, data: { status: "DISABLED" } })
    .catch(() => null);
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
