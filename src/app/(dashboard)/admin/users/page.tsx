import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setTenantContext } from "@/lib/tenant-context";
import { UserAdminTabs } from "./user-admin-tabs";

// 管理员总入口：仅系统管理员（dataScope=ALL）可访问，其它租户/主管一律重定向
export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user?.dataScope !== "ALL") redirect("/");

  // 显式注入 ALL 上下文，使 Prisma 守卫放行跨租户读取
  setTenantContext({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    dataScope: "ALL",
  });

  const [users, tenants] = await Promise.all([
    db.user.findMany({
      include: {
        tenant: { select: { id: true, name: true } },
        userRoles: { include: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.tenant.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);

  return <UserAdminTabs users={users} tenants={tenants} />;
}
