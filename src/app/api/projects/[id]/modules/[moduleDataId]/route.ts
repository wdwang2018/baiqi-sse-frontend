import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";

// DELETE /api/projects/[id]/modules/[moduleDataId]
// 删除某一个保存版本（万能结果库中的一行）。需校验归属：该版本必须属于
// 指定 project 且属于当前租户，否则 404，防止越权删除。
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; moduleDataId: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await db.projectModuleData.findFirst({
    where: {
      id: params.moduleDataId,
      projectId: params.id,
      tenantId: auth.tenantId,
    },
    select: { id: true },
  });

  if (!target) {
    return NextResponse.json({ error: "未找到该保存结果" }, { status: 404 });
  }

  await db.projectModuleData.delete({
    where: { id: params.moduleDataId },
  });

  return NextResponse.json({ ok: true });
}
