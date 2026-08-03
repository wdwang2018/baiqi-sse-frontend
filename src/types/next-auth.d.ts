import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";
import type { DataScope } from "@/lib/tenant-context";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: Role;
      dataScope: DataScope;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tenantId?: string;
    role?: Role;
    dataScope?: DataScope;
  }
}
