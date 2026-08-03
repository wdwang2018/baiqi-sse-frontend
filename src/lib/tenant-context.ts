import { AsyncLocalStorage } from "async_hooks";

/**
 * 租户/数据隔离上下文 —— 基于 AsyncLocalStorage，对「同一次请求」内的后续所有
 * Prisma 调用持续生效。由 src/lib/auth-helper.ts 在解析出登录用户后注入。
 *
 * 设计要点：
 * - 不依赖显式参数透传，业务 repo 代码无需改动即可获得行级隔离。
 * - 上下文为空（启动 seed、迁移、NextAuth 登录引导查询）时，Prisma 守卫自动跳过过滤。
 */

export type DataScope = "SELF" | "TENANT" | "ALL";

export interface TenantContext {
  tenantId: string;
  userId: string;
  dataScope: DataScope;
}

const als = new AsyncLocalStorage<TenantContext>();

// 进入当前请求上下文：对本次请求后续的 db 调用持续生效（请求结束即失效）
export function setTenantContext(ctx: TenantContext): void {
  als.enterWith(ctx);
}

export function clearTenantContext(): void {
  als.exit(() => undefined);
}

export function getTenantContext(): TenantContext | null {
  return als.getStore() ?? null;
}

// 数据范围优先级：ALL > TENANT > SELF
export const SCOPE_RANK: Record<DataScope, number> = {
  SELF: 1,
  TENANT: 2,
  ALL: 3,
};

export function higherScope(a: DataScope, b: DataScope): DataScope {
  return SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b;
}
