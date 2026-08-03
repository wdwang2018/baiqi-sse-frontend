import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resolveDataScope } from "@/lib/scope";
import type { Role } from "@prisma/client";
import type { DataScope } from "@/lib/tenant-context";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT strategy — no adapter needed (avoids Prisma on Edge runtime in middleware)
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        // 禁用账号（软删除）拒绝登录，保留历史数据
        if (user.status === "DISABLED") return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string;
        // Add tenantId & role to token on first login (avoid DB lookup in middleware)
        const dbUser = await db.user.findUnique({
          where: { id: user.id as string },
          select: { id: true, tenantId: true, role: true, name: true },
        });
        if (dbUser) {
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.dataScope = await resolveDataScope(
            dbUser.id,
            dbUser.role,
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = (token.role as Role) ?? ("MEMBER" as Role);
        session.user.dataScope = (token.dataScope as DataScope) ?? "SELF";
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
