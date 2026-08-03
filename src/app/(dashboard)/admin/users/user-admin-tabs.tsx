"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, ShieldCheck, Building2 } from "lucide-react";

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    tenant: { select: { id: true; name: true } };
    userRoles: { include: { role: true } };
  };
}>;

type TenantWithCount = Prisma.TenantGetPayload<{
  include: { _count: { select: { users: true } } };
}>;

const ROLE_LABEL: Record<string, string> = {
  MEMBER: "普通员工",
  MANAGER: "部门主管",
  ADMIN: "系统管理员",
};

export function UserAdminTabs({
  users,
  tenants,
}: {
  users: UserWithRelations[];
  tenants: TenantWithCount[];
}) {
  const router = useRouter();

  async function patchUser(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function removeUser(id: string) {
    if (!confirm("确认禁用该用户？账号将不可登录，但历史数据会保留。"))
      return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统管理</h1>
          <p className="text-sm text-muted-foreground">
            跨租户管理用户与部门（仅系统管理员可见）
          </p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="tenants">
            <Building2 className="mr-1.5 h-4 w-4" />
            部门管理
          </TabsTrigger>
        </TabsList>

        {/* ===================== 用户管理 ===================== */}
        <TabsContent value="users">
          <div className="mb-3 flex justify-end">
            <Link href="/admin/users/new">
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                新建用户
              </Button>
            </Link>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">姓名</th>
                  <th className="px-4 py-3">邮箱</th>
                  <th className="px-4 py-3">所属部门</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      暂无用户
                    </td>
                  </tr>
                )}
                {users.map((u) => {
                  const roleCodes = (u.userRoles ?? [])
                    .map((r) => r.role?.code)
                    .filter(Boolean) as string[];
                  const disabled = u.status === "DISABLED";
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">{u.tenant?.name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {roleCodes.length > 0 ? (
                            roleCodes.map((c) => (
                              <Badge key={c} variant="secondary">
                                {ROLE_LABEL[c] ?? c}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {disabled ? (
                          <Badge variant="destructive">已禁用</Badge>
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600/80">
                            启用
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>设为角色</DropdownMenuLabel>
                            {(["MEMBER", "MANAGER", "ADMIN"] as const).map((rc) => (
                              <DropdownMenuItem
                                key={rc}
                                onClick={() => patchUser(u.id, { role: rc })}
                              >
                                {ROLE_LABEL[rc]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {disabled ? (
                              <DropdownMenuItem onClick={() => patchUser(u.id, { status: "ACTIVE" })}>
                                启用账号
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => patchUser(u.id, { status: "DISABLED" })}>
                                禁用账号
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => removeUser(u.id)}
                            >
                              删除（禁用）
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* ===================== 部门管理 ===================== */}
        <TabsContent value="tenants">
          <div className="mb-3 flex justify-end">
            <Link href="/admin/tenants/new">
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                新建部门
              </Button>
            </Link>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">部门名称</th>
                  <th className="px-4 py-3">套餐</th>
                  <th className="px-4 py-3">用户数</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      暂无部门
                    </td>
                  </tr>
                )}
                {tenants.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{t.plan}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t._count?.users ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">
            说明：当前部门不支持删除，以免级联清除其下所有用户与业务数据。如需调整，请联系开发人员。
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
