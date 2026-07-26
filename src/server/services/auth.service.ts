import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * 注册新租户 + 管理员用户
 * 第一个用户自动成为 ADMIN，同时创建租户
 */
export async function registerUser({
  email,
  password,
  name,
  tenantName,
}: {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("该邮箱已被注册");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const tenant = await db.tenant.create({
    data: {
      name: tenantName,
      users: {
        create: {
          email,
          passwordHash,
          name,
          role: "ADMIN",
        },
      },
    },
    include: { users: true },
  });

  return tenant;
}
