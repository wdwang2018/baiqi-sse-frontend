import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { callAI } from "@/lib/ai/gateway";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { toolType, input, model } = body;

  if (!toolType || !input) {
    return NextResponse.json(
      { error: "Missing toolType or input" },
      { status: 400 },
    );
  }

  try {
    const result = await callAI({
      toolType,
      input,
      userId: user.id,
      tenantId: user.tenantId,
      modelOverride: model,
      authCookie: req.headers.get("cookie") ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI call failed:", error);
    const message = error instanceof Error ? error.message : "AI call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
