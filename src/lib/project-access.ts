import type { AuthUser } from "@/lib/auth-helper";

/**
 * 项目行级可见性过滤条件。
 *
 * 注意：不依赖 AsyncLocalStorage。Prisma 扩展回调（$allOperations）在 Next.js
 * 运行时里读不到租户上下文（getTenantContext() 返回 null），会导致守卫直接透传、
 * 全员可见。因此这里直接使用 getAuthUser 已可靠解析出的 auth 做显式过滤。
 *
 *  - ALL（系统管理员）：返回 {} → 跨租户可见全部项目（含所有部门/人员）。
 *  - TENANT（部门经理）：仅本部门（tenantId）→ 自己 + 部门员工创建的项目。
 *  - SELF（普通员工）：仅本人创建（createdBy）+ 本租户内未指派（createdBy=null）
 *    的项目。后者用于兼容历史数据——早期项目 createdBy 可能为空，若严格按
 *    createdBy 过滤会让员工看不到任何旧项目。
 */
export function projectScopeWhere(auth: AuthUser) {
  if (auth.dataScope === "ALL") return {};
  if (auth.dataScope === "TENANT") return { tenantId: auth.tenantId };
  return {
    tenantId: auth.tenantId,
    OR: [{ createdBy: auth.id }, { createdBy: null }],
  };
}

/**
 * 子资源（模块 / 互动）行级过滤：仅按租户隔离（tenantId）。
 * 子资源从属于「已被项目级权限闸门过滤过的项目」，只要租户一致即可，
 * 避免用 createdBy 误伤 AI 生成的模块 / 他人代录的互动。
 *  - ALL：{}（全部）
 *  - TENANT / SELF：{ tenantId }（本部门 / 本人所在租户）
 */
export function scopeByTenant(auth: AuthUser) {
  if (auth.dataScope === "ALL") return {};
  return { tenantId: auth.tenantId };
}
