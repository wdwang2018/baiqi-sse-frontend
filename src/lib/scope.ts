import { db } from "@/lib/db";
import type { DataScope } from "@/lib/tenant-context";

/**
 * 解析用户的数据可见范围（dataScope）：
 *  - 优先取 UserRole → AppRole.dataScope 中「最宽松」的一个（ALL > TENANT > SELF）。
 *  - 若用户未绑定任何 AppRole（如早期 seed 的 admin），按旧 role 字段回退：
 *      ADMIN → ALL，MANAGER → TENANT，其余 → SELF。
 *
 * 本函数内的 db 查询发生在租户上下文注入之前（上下文为空），
 * 因此守卫不会过滤它们，也不会造成递归。
 */
export async function resolveDataScope(
  userId: string,
  legacyRole: string,
): Promise<DataScope> {
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: { role: true },
  });

  if (userRoles.length === 0) {
    if (legacyRole === "ADMIN") return "ALL";
    if (legacyRole === "MANAGER") return "TENANT";
    return "SELF";
  }

  let scope: DataScope = "SELF";
  for (const ur of userRoles) {
    const s = (ur.role?.dataScope ?? "SELF") as DataScope;
    if (s === "ALL") {
      scope = "ALL";
      break;
    }
    if (s === "TENANT") scope = "TENANT";
  }
  return scope;
}
