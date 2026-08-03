import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helper";
import { projectScopeWhere, scopeByTenant } from "@/lib/project-access";

const VALID_TYPES = ["meeting", "call", "email", "wechat", "note"];
const VALID_SOURCES = ["human", "asr", "vlm", "import"];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 先校验项目归属，避免越权枚举
  const project = await db.project.findFirst({
    where: { id: params.id, ...projectScopeWhere(auth) },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const interactions = await db.projectInteraction.findMany({
    where: { projectId: params.id, ...scopeByTenant(auth) },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ interactions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id: params.id, ...projectScopeWhere(auth) },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const type = typeof body.type === "string" ? body.type : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const participants =
    typeof body.participants === "string" ? body.participants.trim() : null;
  const source =
    typeof body.source === "string" && VALID_SOURCES.includes(body.source)
      ? body.source
      : "human";
  const rawContent =
    typeof body.rawContent === "string" ? body.rawContent : null;
  const mediaUrls =
    body.mediaUrls && Array.isArray(body.mediaUrls) ? body.mediaUrls : undefined;
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type 必须是 ${VALID_TYPES.join(" / ")} 之一` },
      { status: 400 },
    );
  }
  if (!title || !content) {
    return NextResponse.json(
      { error: "title 与 content 不能为空" },
      { status: 400 },
    );
  }

  const created = await db.projectInteraction.create({
    data: {
      tenantId: auth.tenantId,
      createdBy: auth.id,
      projectId: params.id,
      type,
      title,
      content,
      participants,
      source,
      rawContent,
      mediaUrls,
      occurredAt: isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
    },
  });

  return NextResponse.json({ interaction: created }, { status: 201 });
}
