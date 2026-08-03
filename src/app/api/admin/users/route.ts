import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const VALID_ROLES = ["MEMBER", "MANAGER", "ADMIN"] as const;

// GET /api/admin/users — 列出全部用户（含所属部门与角色）。仅系统管理员可见。
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.dataScope !== "ALL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await db.user.findMany({
    include: {
      tenant: { select: { id: true, name: true } },
      userRoles: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

// 生成符合复杂度要求的初始密码：大写+小写+数字+符号，至少各 1 个
function genPassword(len = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digit = "23456789";
  const sym = "!@#$%^&*";
  const all = upper + lower + digit + sym;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const arr = [pick(upper), pick(lower), pick(digit), pick(sym)];
  for (let i = arr.length; i < len; i++) arr.push(pick(all));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

// POST /api/admin/users — 系统管理员新建用户（可指定部门与角色，自动生成初始密码）
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.dataScope !== "ALL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const tenantId = String(body.tenantId ?? "").trim();
  const roleCode = String(body.role ?? "MEMBER").toUpperCase();
  const plainInput = body.password ? String(body.password) : "";

  if (!name || !email || !tenantId)
    return NextResponse.json({ error: "姓名、邮箱、所属部门均为必填" }, { status: 400 });
  if (!VALID_ROLES.includes(roleCode as (typeof VALID_ROLES)[number]))
    return NextResponse.json({ error: "角色不合法" }, { status: 400 });

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "部门不存在" }, { status: 400 });

  const plain =
    plainInput.length >= 8 ? plainInput : genPassword(12);
  const passwordHash = await bcrypt.hash(plain, 10);

  try {
    const user = await db.user.create({
      data: {
        // tenantId 显式指定：守卫仅在 tenantId 为 null 时才注入，
        // 因此管理员可把用户建到任意部门，而不会被强制改成自己的租户。
        tenantId,
        email,
        name,
        role: roleCode as Role,
        status: "ACTIVE",
        passwordHash,
        // createdBy 由守卫自动注入为当前管理员ID
      },
    });

    // 绑定 AppRole（多对多）
    const appRole = await db.appRole.findUnique({ where: { code: roleCode } });
    if (appRole) {
      await db.userRole.create({ data: { userId: user.id, roleId: appRole.id } });
    }

    // 一次性回传明文初始密码，供管理员线下告知用户
    return NextResponse.json({ ...user, plainPassword: plain }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "P2002")
      return NextResponse.json({ error: "该邮箱已存在" }, { status: 409 });
    console.error("[api/admin/users] create failed:", err);
    return NextResponse.json({ error: e?.message || "创建用户失败" }, { status: 500 });
  }
}
