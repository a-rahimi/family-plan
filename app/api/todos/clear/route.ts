import { NextResponse } from "next/server";
import { z } from "zod";
import { clearFinishedTodos } from "@/lib/todoService";

const clearSchema = z.object({
  memberSlug: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = clearSchema.parse(body);
    const result = await clearFinishedTodos(payload.memberSlug);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Failed to clear finished todos", error);
    return NextResponse.json(
      { error: "Unable to clear finished todos." },
      { status: 500 },
    );
  }
}

