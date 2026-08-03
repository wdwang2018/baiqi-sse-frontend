import { PrismaClient } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant-context";

/**
 * Prisma 客户端（含多租户 + 行级数据隔离守卫）。
 *
 * 守卫逻辑（src/lib/tenant-context 提供当前请求上下文）：
 *  - 上下文为空（seed / 迁移 / 登录引导查询）→ 不做任何过滤，完全透传。
 *  - 写入（create / createMany / upsert）→ 自动注入 tenantId + createdBy。
 *  - 读取 / 修改 / 删除 → 强制追加 tenantId 过滤；
 *      - dataScope=ALL（系统管理员）：不加任何过滤，跨租户可见。
 *      - dataScope=TENANT（部门主管）：仅本租户（本部门）全部数据。
 *      - dataScope=SELF（普通员工）：仅本人创建的数据。
 *
 * 仅对「同时拥有 tenantId 与 createdBy」的受守卫模型生效；系统表
 * （Tenant / AppRole / UserRole / Account / Session / VerificationToken / PromptTemplate）
 * 不在守卫范围内，避免破坏系统级查询。
 */

// 受守卫模型（同时拥有 tenantId 与 createdBy）
const GUARDED_MODELS = new Set<string>([
  "User",
  "Customer",
  "Contact",
  "Opportunity",
  "NineGrid",
  "PainChain",
  "ValueProposition",
  "CompetitiveAnalysis",
  "DecisionMap",
  "RelationshipMap",
  "SalesPath",
  "ActionPlan",
  "CustomerInsight",
  "AICall",
  "BattlePlan",
  "WorkReview",
  "Project",
  "ProjectModuleData",
  "ProjectInteraction",
]);

const READ_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

const WRITE_OPS = new Set(["create", "createMany", "upsert"]);

type AnyObj = Record<string, unknown>;

function injectOwnership(data: unknown, tenantId: string, userId: string): void {
  if (!data || typeof data !== "object") return;
  const obj = data as AnyObj;
  if (obj.tenantId == null) obj.tenantId = tenantId;
  if (obj.createdBy == null) obj.createdBy = userId;
}

function buildBaseClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

function buildGuardedClient() {
  const base = buildBaseClient();

  // 守卫内部对 args 做局部 any 转换：避免 Prisma WhereUniqueInput 等类型
  // 不允许追加 tenantId/createdBy 字段导致的 tsc / next build 报错。
  return base.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ args, operation, model, query }: any) {
          const ctx = getTenantContext();
          // 无上下文 或 非受守卫模型 → 完全透传（系统查询 / seed / 迁移）
          if (!ctx || !GUARDED_MODELS.has(model)) {
            return query(args);
          }

          // —— 写入：自动注入 tenantId + createdBy —— //
          if (WRITE_OPS.has(operation) && args.data != null) {
            if (Array.isArray(args.data)) {
              for (const row of args.data) injectOwnership(row, ctx.tenantId, ctx.userId);
            } else {
              injectOwnership(args.data, ctx.tenantId, ctx.userId);
              // upsert 的 create / update 分支也要注入
              if (operation === "upsert") {
                injectOwnership(args.create, ctx.tenantId, ctx.userId);
                injectOwnership(args.update, ctx.tenantId, ctx.userId);
              }
            }
          }

          // —— 读 / 改 / 删：按 dataScope 追加过滤 —— //
          if (READ_OPS.has(operation)) {
            // 系统管理员：跨租户可见，不加任何过滤
            if (ctx.dataScope === "ALL") {
              return query(args);
            }
            args.where = {
              ...(args.where ?? {}),
              tenantId: ctx.tenantId,
              // 普通员工：仅本人创建的数据
              ...(ctx.dataScope === "SELF" ? { createdBy: ctx.userId } : {}),
            };
          }

          return query(args);
        },
      },
    },
  });
}

type GuardedClient = ReturnType<typeof buildGuardedClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: GuardedClient | undefined;
};

export const db: GuardedClient =
  globalForPrisma.prisma ?? buildGuardedClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
