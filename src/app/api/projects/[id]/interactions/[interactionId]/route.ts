import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { scopeByTenant } from "@/lib/project-access";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; interactionId: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 三重归属校验：交互 id + 项目 id + 租户 id
  const target = await db.projectInteraction.findFirst({
    where: {
      id: params.interactionId,
      projectId: params.id,
      ...scopeByTenant(auth),
    },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.projectInteraction.deleteMany({
    where: {
      id: params.interactionId,
      projectId: params.id,
      ...scopeByTenant(auth),
    },
  });

  return NextResponse.json({ ok: true });
}
