import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setTenantContext, type DataScope } from "@/lib/tenant-context";
import { resolveDataScope } from "@/lib/scope";

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
  dataScope: DataScope; // 数据可见范围：SELF=仅本人 / TENANT=本部门 / ALL=跨租户
}

/**
 * Resolve the authenticated user from the request.
 *
 * Why we look up by email (not the JWT `sub`/`tenantId`):
 *   The cuid IDs in the JWT are stable only until the DB is re-seeded. After a
 *   migration/re-seed the old session cookie still carries valid-signature but
 *   stale IDs, which causes foreign-key violations on writes. The user's email
 *   is constant across reseeds, so we re-resolve the authoritative tenantId
 *   and dataScope from the DB on every request. API routes run on the Node
 *   runtime, so a Prisma lookup here is safe (unlike Edge middleware).
 *
 * Side effect: 解析成功后立即通过 setTenantContext 注入本次请求的租户上下文，
 * 使后续所有 Prisma 查询自动获得行级数据隔离（业务代码零改动）。
 */
export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  let dbUser: {
    id: string;
    tenantId: string;
    email: string;
    name: string | null;
    role: string;
  } | null = null;

  // Method 1: read the signed JWT cookie directly from the request
  if (req) {
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token?.email) {
        const found = await db.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, tenantId: true, email: true, name: true, role: true },
        });
        if (found?.tenantId) dbUser = found;
      }
    } catch (e) {
      console.error("[auth-helper] getToken failed:", e);
    }
  }

  // Method 2: fallback to the server-side session helper
  if (!dbUser) {
    try {
      const session = await auth();
      if (session?.user?.email) {
        const found = await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, tenantId: true, email: true, name: true, role: true },
        });
        if (found?.tenantId) dbUser = found;
      }
    } catch (e) {
      console.error("[auth-helper] auth() failed:", e);
    }
  }

  if (!dbUser) return null;

  const dataScope = await resolveDataScope(dbUser.id, dbUser.role ?? "MEMBER");

  // 注入本次请求的租户上下文 —— 后续所有 db 调用自动隔离
  setTenantContext({
    tenantId: dbUser.tenantId,
    userId: dbUser.id,
    dataScope,
  });

  return {
    id: dbUser.id,
    tenantId: dbUser.tenantId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role ?? "MEMBER",
    dataScope,
  };
}
