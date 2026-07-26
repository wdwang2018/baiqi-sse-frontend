import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "interactions");

function safeName(original: string): string {
  // 仅保留文件名，去除任何路径成分，再附加随机后缀防碰撞
  const base = path.basename(original).replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = path.extname(base);
  const stem = base.slice(0, Math.max(0, base.length - ext.length)) || "file";
  return `${stem}_${stamp}${rand}${ext}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; interactionId: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 三重归属校验：互动 id + 项目 id + 租户 id
  const target = await db.projectInteraction.findFirst({
    where: {
      id: params.interactionId,
      projectId: params.id,
      tenantId: auth.tenantId,
    },
    select: { id: true, projectId: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "无效的表单数据" }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "没有收到文件" }, { status: 400 });
  }

  const dir = path.join(UPLOAD_ROOT, target.projectId);
  await fs.mkdir(dir, { recursive: true });

  const prev = (target as { mediaUrls?: unknown }).mediaUrls;
  const existing: any[] = Array.isArray(prev) ? prev : [];
  const added: any[] = [];

  for (const file of files) {
    const name = safeName(file.name || "file");
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, name), buffer);
    added.push({
      name: file.name || name,
      url: `/api/files/interactions/${target.projectId}/${name}`,
      mime: file.type || "application/octet-stream",
      size: file.size,
    });
  }

  const updated = await db.projectInteraction.update({
    where: { id: target.id },
    data: { mediaUrls: [...existing, ...added] },
  });

  return NextResponse.json({ interaction: updated });
}
