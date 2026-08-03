"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const PLANS = [
  { code: "FREE", label: "FREE（免费版）" },
  { code: "PRO", label: "PRO（专业版）" },
  { code: "ENTERPRISE", label: "ENTERPRISE（企业版）" },
];

export function NewTenantForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("FREE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "创建失败");
        return;
      }
      router.push("/admin/users");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">新建部门</h1>
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
          取消
        </Link>
      </div>

      <Card className="space-y-4 p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">部门名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：华东分公司 / 集团财务部"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan">套餐</Label>
            <select
              id="plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PLANS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "创建中…" : "创建部门"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
