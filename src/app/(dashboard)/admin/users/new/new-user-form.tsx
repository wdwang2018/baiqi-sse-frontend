"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface TenantOpt {
  id: string;
  name: string;
}

const ROLE_LABEL: Record<string, string> = {
  MEMBER: "普通员工",
  MANAGER: "部门主管",
  ADMIN: "系统管理员",
};

export function NewUserForm({ tenants }: { tenants: TenantOpt[] }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    tenantId: tenants[0]?.id ?? "",
    role: "MEMBER",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdPwd, setCreatedPwd] = useState("");

  function update<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreatedPwd("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "创建失败");
        return;
      }
      setCreatedPwd(data.plainPassword);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (createdPwd) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">用户已创建</h1>
        <Card className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">
            已将初始密码生成。请通过线下方式（如企业微信/邮件）告知用户，并提醒其首次登录后修改。
          </p>
          <div className="rounded-md bg-muted p-3 font-mono text-lg tracking-wider">
            {createdPwd}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigator.clipboard?.writeText(createdPwd)}
            >
              复制密码
            </Button>
            <Link href="/admin/users">
              <Button>返回用户管理</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">新建用户</h1>
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
          取消
        </Link>
      </div>

      <Card className="space-y-4 p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">姓名 *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="如：张三"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">登录邮箱 *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="作为登录账号，需唯一"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenant">所属部门 *</Label>
            <select
              id="tenant"
              value={form.tenantId}
              onChange={(e) => update("tenantId", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">角色 *</Label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(ROLE_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">初始密码（可选）</Label>
            <Input
              id="password"
              type="text"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="留空则自动生成 12 位强密码"
            />
            <p className="text-xs text-muted-foreground">
              自动生成密码格式：大写+小写+数字+符号，至少各 1 位。
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "创建中…" : "创建用户"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
