import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Resolve the authenticated user from the request.
 *
 * Why we look up by email (not the JWT `sub`/`tenantId`):
 *   The cuid IDs in the JWT are stable only until the DB is re-seeded. After a
 *   migration/re-seed the old session cookie still carries valid-signature but
 *   stale IDs, which causes foreign-key violations on writes. The user's email
 *   is constant across reseeds, so we re-resolve the authoritative tenantId
 *   from the DB on every request. API routes run on the Node runtime, so a
 *   Prisma lookup here is safe (unlike Edge middleware).
 */
export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  // Method 1: read the signed JWT cookie directly from the request
  if (req) {
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token?.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, tenantId: true, email: true, name: true, role: true },
        });
        if (dbUser?.tenantId) {
          return {
            id: dbUser.id,
            tenantId: dbUser.tenantId,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role ?? "MEMBER",
          };
        }
      }
    } catch (e) {
      console.error("[auth-helper] getToken failed:", e);
    }
  }

  // Method 2: fallback to the server-side session helper
  try {
    const session = await auth();
    if (session?.user?.email) {
      const dbUser = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, tenantId: true, email: true, name: true, role: true },
      });
      if (dbUser?.tenantId) {
        return {
          id: dbUser.id,
          tenantId: dbUser.tenantId,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role ?? "MEMBER",
        };
      }
    }
  } catch (e) {
    console.error("[auth-helper] auth() failed:", e);
  }

  return null;
}
